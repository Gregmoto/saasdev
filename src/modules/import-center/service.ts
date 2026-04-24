import { eq, and, desc, sql } from "drizzle-orm";
import { encrypt, decrypt } from "../../lib/encrypt.js";
import { importProfiles, importJobs, importConflicts } from "../../db/schema/import-center.js";
import type {
  ImportProfile,
  ImportJob,
  ImportConflict,
  ImportFieldMapping,
  ImportStats,
  ImportLogEntry,
  PlatformCredentials,
} from "../../db/schema/import-center.js";
import type { Db } from "../../db/client.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function stripProfileCreds(profile: ImportProfile): ImportProfile {
  const { credentialsEncrypted: _stripped, ...rest } = profile;
  void _stripped;
  return { ...rest, credentialsEncrypted: null };
}

function stripJobCreds(job: ImportJob): ImportJob {
  const { credentialsEncrypted: _stripped, ...rest } = job;
  void _stripped;
  return { ...rest, credentialsEncrypted: null };
}

// ── Profile CRUD ───────────────────────────────────────────────────────────────

export async function listProfiles(
  db: Db,
  storeAccountId: string,
): Promise<ImportProfile[]> {
  const rows = await db
    .select()
    .from(importProfiles)
    .where(eq(importProfiles.storeAccountId, storeAccountId))
    .orderBy(importProfiles.name);
  return rows.map(stripProfileCreds);
}

export async function getProfile(
  db: Db,
  profileId: string,
  storeAccountId: string,
): Promise<ImportProfile | null> {
  const [row] = await db
    .select()
    .from(importProfiles)
    .where(
      and(
        eq(importProfiles.id, profileId),
        eq(importProfiles.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface CreateProfileData {
  name: string;
  platform: "shopify" | "woocommerce" | "prestashop";
  credentials?: PlatformCredentials;
  defaultFieldMapping?: ImportFieldMapping;
}

export async function createProfile(
  db: Db,
  storeAccountId: string,
  data: CreateProfileData,
): Promise<ImportProfile> {
  const insertValues: typeof importProfiles.$inferInsert = {
    storeAccountId,
    name: data.name,
    platform: data.platform,
  };

  if (data.credentials !== undefined) {
    insertValues.credentialsEncrypted = encrypt(JSON.stringify(data.credentials));
  }

  if (data.defaultFieldMapping !== undefined) {
    insertValues.defaultFieldMapping = data.defaultFieldMapping;
  }

  const [row] = await db.insert(importProfiles).values(insertValues).returning();
  if (!row) throw new Error("Failed to create profile");
  return stripProfileCreds(row);
}

export async function updateProfile(
  db: Db,
  profileId: string,
  storeAccountId: string,
  data: Partial<CreateProfileData>,
): Promise<ImportProfile> {
  const updateValues: Partial<typeof importProfiles.$inferInsert> & {
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateValues.name = data.name;
  if (data.platform !== undefined) updateValues.platform = data.platform;
  if (data.credentials !== undefined) {
    updateValues.credentialsEncrypted = encrypt(JSON.stringify(data.credentials));
  }
  if (data.defaultFieldMapping !== undefined) {
    updateValues.defaultFieldMapping = data.defaultFieldMapping;
  }

  const [row] = await db
    .update(importProfiles)
    .set(updateValues)
    .where(
      and(
        eq(importProfiles.id, profileId),
        eq(importProfiles.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw new Error("Profile not found");
  return stripProfileCreds(row);
}

export async function deleteProfile(
  db: Db,
  profileId: string,
  storeAccountId: string,
): Promise<boolean> {
  const result = await db
    .delete(importProfiles)
    .where(
      and(
        eq(importProfiles.id, profileId),
        eq(importProfiles.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: importProfiles.id });
  return result.length > 0;
}

export function getDecryptedProfileCredentials(
  profile: ImportProfile,
): PlatformCredentials | null {
  if (!profile.credentialsEncrypted) return null;
  return JSON.parse(decrypt(profile.credentialsEncrypted)) as PlatformCredentials;
}

// ── Job CRUD ───────────────────────────────────────────────────────────────────

export interface PaginatedJobs {
  data: ImportJob[];
  total: number;
  page: number;
  limit: number;
}

export interface ListJobsOpts {
  status?: ImportJob["status"];
  platform?: ImportJob["platform"];
  page: number;
  limit: number;
}

export async function listJobs(
  db: Db,
  storeAccountId: string,
  opts: ListJobsOpts,
): Promise<PaginatedJobs> {
  const conditions = [eq(importJobs.storeAccountId, storeAccountId)];
  if (opts.status !== undefined) conditions.push(eq(importJobs.status, opts.status));
  if (opts.platform !== undefined) conditions.push(eq(importJobs.platform, opts.platform));

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(importJobs)
      .where(where)
      .orderBy(desc(importJobs.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(importJobs)
      .where(where),
  ]);

  return {
    data: rows.map(stripJobCreds),
    total: countRows[0]?.count ?? 0,
    page: opts.page,
    limit: opts.limit,
  };
}

export async function getJob(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<ImportJob | null> {
  const [row] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ? stripJobCreds(row) : null;
}

// Internal: get job with credentials intact (for runner use)
export async function getJobRaw(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<ImportJob | null> {
  const [row] = await db
    .select()
    .from(importJobs)
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getJobRawById(db: Db, jobId: string): Promise<ImportJob | null> {
  const [row] = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.id, jobId))
    .limit(1);
  return row ?? null;
}

export interface CreateJobData {
  platform: "shopify" | "woocommerce" | "prestashop";
  profileId?: string;
  credentials?: PlatformCredentials;
  isDryRun?: boolean;
}

export async function createJob(
  db: Db,
  storeAccountId: string,
  data: CreateJobData,
): Promise<ImportJob> {
  const insertValues: typeof importJobs.$inferInsert = {
    storeAccountId,
    platform: data.platform,
    status: "draft",
  };

  if (data.profileId !== undefined) {
    insertValues.profileId = data.profileId;
  }

  if (data.isDryRun !== undefined) {
    insertValues.isDryRun = data.isDryRun;
  }

  // Resolve credentials: direct credentials take precedence over profile credentials
  if (data.credentials !== undefined) {
    insertValues.credentialsEncrypted = encrypt(JSON.stringify(data.credentials));
  } else if (data.profileId !== undefined) {
    // Copy credentials from profile if available
    const [profile] = await db
      .select()
      .from(importProfiles)
      .where(
        and(
          eq(importProfiles.id, data.profileId),
          eq(importProfiles.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);
    if (profile?.credentialsEncrypted) {
      insertValues.credentialsEncrypted = profile.credentialsEncrypted;
    }
  }

  const [row] = await db.insert(importJobs).values(insertValues).returning();
  if (!row) throw new Error("Failed to create job");
  return stripJobCreds(row);
}

export async function updateJobEntities(
  db: Db,
  jobId: string,
  storeAccountId: string,
  selectedEntities: string[],
): Promise<ImportJob> {
  const [row] = await db
    .update(importJobs)
    .set({ selectedEntities, updatedAt: new Date() })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw new Error("Job not found");
  return stripJobCreds(row);
}

export async function updateJobMapping(
  db: Db,
  jobId: string,
  storeAccountId: string,
  fieldMapping: ImportFieldMapping,
): Promise<ImportJob> {
  const [row] = await db
    .update(importJobs)
    .set({ fieldMapping, updatedAt: new Date() })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw new Error("Job not found");
  return stripJobCreds(row);
}

// ── State machine transitions ──────────────────────────────────────────────────

export async function markJobValidating(db: Db, jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({ status: "validating", updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function markJobDryRunning(db: Db, jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({ status: "dry_running", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function markJobPending(db: Db, jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function markJobRunning(db: Db, jobId: string): Promise<void> {
  await db
    .update(importJobs)
    .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function markJobCompleted(
  db: Db,
  jobId: string,
  stats: ImportStats,
): Promise<void> {
  await db
    .update(importJobs)
    .set({ status: "completed", completedAt: new Date(), stats, updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function markJobFailed(
  db: Db,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const entry: ImportLogEntry = {
    ts: new Date().toISOString(),
    level: "error",
    entity: "system",
    message: errorMessage,
  };

  await db
    .update(importJobs)
    .set({
      status: "failed",
      completedAt: new Date(),
      updatedAt: new Date(),
      logEntries: sql`${importJobs.logEntries} || ${JSON.stringify([entry])}::jsonb`,
      errorCount: sql`${importJobs.errorCount} + 1`,
    })
    .where(eq(importJobs.id, jobId));
}

export async function appendJobLog(
  db: Db,
  jobId: string,
  entry: ImportLogEntry,
): Promise<void> {
  const isError = entry.level === "error";

  const updates: Record<string, unknown> = {
    logEntries: sql`${importJobs.logEntries} || ${JSON.stringify([entry])}::jsonb`,
    updatedAt: new Date(),
  };

  if (isError) {
    updates["errorCount"] = sql`${importJobs.errorCount} + 1`;
  }

  await db
    .update(importJobs)
    .set(updates)
    .where(eq(importJobs.id, jobId));
}

export async function cancelJob(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<boolean> {
  const result = await db
    .update(importJobs)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
        sql`${importJobs.status} IN ('draft', 'validating', 'dry_running', 'pending')`,
      ),
    )
    .returning({ id: importJobs.id });
  return result.length > 0;
}

export function getDecryptedJobCredentials(job: ImportJob): PlatformCredentials | null {
  if (!job.credentialsEncrypted) return null;
  return JSON.parse(decrypt(job.credentialsEncrypted)) as PlatformCredentials;
}

// ── Import mode ────────────────────────────────────────────────────────────────

export async function setJobImportMode(
  db: Db,
  jobId: string,
  storeAccountId: string,
  mode: "create_only" | "update_existing" | "create_and_update",
): Promise<void> {
  await db
    .update(importJobs)
    .set({ importMode: mode, updatedAt: new Date() })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    );
}

// ── Conflict CRUD ──────────────────────────────────────────────────────────────

export interface ListConflictsOpts {
  entity?: "products" | "customers" | "orders" | undefined;
  resolution?: "pending" | "keep_existing" | "use_incoming" | undefined;
  page: number;
  limit: number;
}

export interface PaginatedConflicts {
  data: ImportConflict[];
  total: number;
  page: number;
  limit: number;
}

export async function listConflicts(
  db: Db,
  jobId: string,
  storeAccountId: string,
  opts: ListConflictsOpts,
): Promise<PaginatedConflicts> {
  const conditions = [
    eq(importConflicts.jobId, jobId),
    eq(importConflicts.storeAccountId, storeAccountId),
  ];
  if (opts.entity !== undefined) {
    conditions.push(eq(importConflicts.entity, opts.entity));
  }
  if (opts.resolution !== undefined) {
    conditions.push(eq(importConflicts.resolution, opts.resolution));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(importConflicts)
      .where(where)
      .orderBy(desc(importConflicts.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(importConflicts)
      .where(where),
  ]);

  return {
    data: rows,
    total: countRows[0]?.count ?? 0,
    page: opts.page,
    limit: opts.limit,
  };
}

export async function resolveConflict(
  db: Db,
  conflictId: string,
  storeAccountId: string,
  resolution: "keep_existing" | "use_incoming",
): Promise<ImportConflict | null> {
  const [row] = await db
    .update(importConflicts)
    .set({ resolution, resolvedAt: new Date() })
    .where(
      and(
        eq(importConflicts.id, conflictId),
        eq(importConflicts.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function bulkResolveConflicts(
  db: Db,
  jobId: string,
  storeAccountId: string,
  entity: "products" | "customers" | "orders" | undefined,
  resolution: "keep_existing" | "use_incoming",
): Promise<number> {
  const conditions = [
    eq(importConflicts.jobId, jobId),
    eq(importConflicts.storeAccountId, storeAccountId),
    eq(importConflicts.resolution, "pending"),
  ];
  if (entity !== undefined) {
    conditions.push(eq(importConflicts.entity, entity));
  }

  const result = await db
    .update(importConflicts)
    .set({ resolution, resolvedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: importConflicts.id });
  return result.length;
}

// ── Resume support ─────────────────────────────────────────────────────────────

export async function resetJobForResume(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<ImportJob | null> {
  const [row] = await db
    .update(importJobs)
    .set({
      status: "pending",
      progress: sql`'{}'::jsonb`,
      errorCount: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
        eq(importJobs.status, "failed"),
      ),
    )
    .returning();
  return row ? stripJobCreds(row) : null;
}

// ── Job update helpers for runner ──────────────────────────────────────────────

export async function updateJobDryRunResults(
  db: Db,
  jobId: string,
  dryRunResults: import("../../db/schema/import-center.js").ImportDryRunResults,
): Promise<void> {
  await db
    .update(importJobs)
    .set({ dryRunResults, updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function setJobIsDryRun(
  db: Db,
  jobId: string,
  storeAccountId: string,
  isDryRun: boolean,
): Promise<void> {
  await db
    .update(importJobs)
    .set({ isDryRun, updatedAt: new Date() })
    .where(
      and(
        eq(importJobs.id, jobId),
        eq(importJobs.storeAccountId, storeAccountId),
      ),
    );
}
