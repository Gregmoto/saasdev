import { eq, and, asc, desc, ilike, count, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  suppliers,
  supplierFeeds,
  supplierFeedRuns,
} from "../../db/schema/suppliers.js";
import type {
  Supplier,
  SupplierFeed,
  SupplierFeedRun,
  SupplierConnectorType,
  SupplierFeedFormat,
  SupplierCredentials,
  RemoteConfig,
  ApiConfig,
  MappingConfig,
  MatchRules,
  FeedRunLogEntry,
  UnknownSkuBehavior,
} from "../../db/schema/suppliers.js";
import { encrypt, decrypt } from "../../lib/encrypt.js";

// ── Supplier CRUD ─────────────────────────────────────────────────────────────

export async function listSuppliers(
  db: Db,
  storeAccountId: string,
  includeInactive?: boolean,
): Promise<Supplier[]> {
  const conditions = [eq(suppliers.storeAccountId, storeAccountId)];
  if (!includeInactive) {
    conditions.push(eq(suppliers.isActive, true));
  }
  return db
    .select()
    .from(suppliers)
    .where(and(...conditions))
    .orderBy(asc(suppliers.name));
}

export async function getSupplier(
  db: Db,
  supplierId: string,
  storeAccountId: string,
): Promise<Supplier | null> {
  const rows = await db
    .select()
    .from(suppliers)
    .where(
      and(eq(suppliers.id, supplierId), eq(suppliers.storeAccountId, storeAccountId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createSupplier(
  db: Db,
  storeAccountId: string,
  data: { name: string; slug: string; notes?: string; isActive?: boolean },
): Promise<Supplier> {
  const insert: typeof suppliers.$inferInsert = {
    storeAccountId,
    name: data.name,
    slug: data.slug,
  };
  if (data.notes !== undefined) insert.notes = data.notes;
  if (data.isActive !== undefined) insert.isActive = data.isActive;

  try {
    const rows = await db.insert(suppliers).values(insert).returning();
    return rows[0]!;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("suppliers_store_slug_idx")
    ) {
      throw { statusCode: 409, message: "Supplier with this slug already exists" };
    }
    throw err;
  }
}

export async function updateSupplier(
  db: Db,
  supplierId: string,
  storeAccountId: string,
  data: { name?: string; slug?: string; notes?: string; isActive?: boolean },
): Promise<Supplier> {
  const set: Partial<typeof suppliers.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) set.name = data.name;
  if (data.slug !== undefined) set.slug = data.slug;
  if (data.notes !== undefined) set.notes = data.notes;
  if (data.isActive !== undefined) set.isActive = data.isActive;

  try {
    const rows = await db
      .update(suppliers)
      .set(set)
      .where(
        and(eq(suppliers.id, supplierId), eq(suppliers.storeAccountId, storeAccountId)),
      )
      .returning();
    if (rows.length === 0) {
      throw { statusCode: 404, message: "Supplier not found" };
    }
    return rows[0]!;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("suppliers_store_slug_idx")
    ) {
      throw { statusCode: 409, message: "Supplier with this slug already exists" };
    }
    throw err;
  }
}

export async function deleteSupplier(
  db: Db,
  supplierId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(suppliers)
    .where(
      and(eq(suppliers.id, supplierId), eq(suppliers.storeAccountId, storeAccountId)),
    )
    .returning({ id: suppliers.id });
  return rows.length > 0;
}

// ── Feed CRUD ─────────────────────────────────────────────────────────────────

export interface CreateFeedOpts {
  supplierId: string;
  targetWarehouseId: string;
  name: string;
  description?: string;
  connectorType: SupplierConnectorType;
  format: SupplierFeedFormat;
  credentials?: SupplierCredentials;
  remoteConfig?: RemoteConfig;
  apiConfig?: ApiConfig;
  mappingConfig: MappingConfig;
  matchRules?: MatchRules;
  schedule?: string;
  unknownSkuBehavior?: UnknownSkuBehavior;
  isActive?: boolean;
}

export async function listFeeds(
  db: Db,
  storeAccountId: string,
  supplierId?: string,
  includeInactive?: boolean,
): Promise<Omit<SupplierFeed, "credentialsEncrypted">[]> {
  const conditions = [eq(supplierFeeds.storeAccountId, storeAccountId)];
  if (supplierId !== undefined) {
    conditions.push(eq(supplierFeeds.supplierId, supplierId));
  }
  if (!includeInactive) {
    conditions.push(eq(supplierFeeds.isActive, true));
  }

  const rows = await db
    .select()
    .from(supplierFeeds)
    .where(and(...conditions))
    .orderBy(asc(supplierFeeds.name));

  // Strip credentialsEncrypted from list responses
  return rows.map((row) => {
    const { credentialsEncrypted: _stripped, ...rest } = row;
    return rest;
  });
}

export async function getFeed(
  db: Db,
  feedId: string,
  storeAccountId: string,
): Promise<SupplierFeed | null> {
  const rows = await db
    .select()
    .from(supplierFeeds)
    .where(
      and(
        eq(supplierFeeds.id, feedId),
        eq(supplierFeeds.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createFeed(
  db: Db,
  storeAccountId: string,
  data: CreateFeedOpts,
): Promise<SupplierFeed> {
  const insert: typeof supplierFeeds.$inferInsert = {
    storeAccountId,
    supplierId: data.supplierId,
    targetWarehouseId: data.targetWarehouseId,
    name: data.name,
    connectorType: data.connectorType,
    format: data.format,
    mappingConfig: data.mappingConfig,
  };

  if (data.description !== undefined) insert.description = data.description;
  if (data.credentials !== undefined) {
    insert.credentialsEncrypted = encrypt(JSON.stringify(data.credentials));
  }
  if (data.remoteConfig !== undefined) insert.remoteConfig = data.remoteConfig;
  if (data.apiConfig !== undefined) insert.apiConfig = data.apiConfig;
  if (data.matchRules !== undefined) insert.matchRules = data.matchRules;
  if (data.schedule !== undefined) insert.schedule = data.schedule;
  if (data.unknownSkuBehavior !== undefined) insert.unknownSkuBehavior = data.unknownSkuBehavior;
  if (data.isActive !== undefined) insert.isActive = data.isActive;

  const rows = await db.insert(supplierFeeds).values(insert).returning();
  return rows[0]!;
}

export async function updateFeed(
  db: Db,
  feedId: string,
  storeAccountId: string,
  data: Partial<CreateFeedOpts>,
): Promise<SupplierFeed> {
  const set: Partial<typeof supplierFeeds.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.supplierId !== undefined) set.supplierId = data.supplierId;
  if (data.targetWarehouseId !== undefined) set.targetWarehouseId = data.targetWarehouseId;
  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.connectorType !== undefined) set.connectorType = data.connectorType;
  if (data.format !== undefined) set.format = data.format;
  if (data.credentials !== undefined) {
    set.credentialsEncrypted = encrypt(JSON.stringify(data.credentials));
  }
  if (data.remoteConfig !== undefined) set.remoteConfig = data.remoteConfig;
  if (data.apiConfig !== undefined) set.apiConfig = data.apiConfig;
  if (data.mappingConfig !== undefined) set.mappingConfig = data.mappingConfig;
  if (data.matchRules !== undefined) set.matchRules = data.matchRules;
  if (data.schedule !== undefined) set.schedule = data.schedule;
  if (data.unknownSkuBehavior !== undefined) set.unknownSkuBehavior = data.unknownSkuBehavior;
  if (data.isActive !== undefined) set.isActive = data.isActive;

  const rows = await db
    .update(supplierFeeds)
    .set(set)
    .where(
      and(
        eq(supplierFeeds.id, feedId),
        eq(supplierFeeds.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Feed not found" };
  }
  return rows[0]!;
}

export async function deleteFeed(
  db: Db,
  feedId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(supplierFeeds)
    .where(
      and(
        eq(supplierFeeds.id, feedId),
        eq(supplierFeeds.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: supplierFeeds.id });
  return rows.length > 0;
}

export function getDecryptedCredentials(
  feed: SupplierFeed,
): SupplierCredentials | null {
  if (!feed.credentialsEncrypted) return null;
  return JSON.parse(decrypt(feed.credentialsEncrypted)) as SupplierCredentials;
}

// ── Run CRUD ──────────────────────────────────────────────────────────────────

export interface RunsPage {
  items: SupplierFeedRun[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listRuns(
  db: Db,
  storeAccountId: string,
  feedId: string,
  opts: { page: number; limit: number },
): Promise<RunsPage> {
  const { page, limit } = opts;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(supplierFeedRuns.storeAccountId, storeAccountId),
    eq(supplierFeedRuns.feedId, feedId),
  ];

  const [countResult, items] = await Promise.all([
    db
      .select({ total: count() })
      .from(supplierFeedRuns)
      .where(and(...conditions)),
    db
      .select()
      .from(supplierFeedRuns)
      .where(and(...conditions))
      .orderBy(desc(supplierFeedRuns.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRun(
  db: Db,
  runId: string,
  storeAccountId: string,
): Promise<SupplierFeedRun | null> {
  const rows = await db
    .select()
    .from(supplierFeedRuns)
    .where(
      and(
        eq(supplierFeedRuns.id, runId),
        eq(supplierFeedRuns.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createRun(
  db: Db,
  storeAccountId: string,
  feedId: string,
  triggeredBy: "scheduled" | "manual",
  fileName?: string,
  isDryRun?: boolean,
): Promise<SupplierFeedRun> {
  const insert: typeof supplierFeedRuns.$inferInsert = {
    storeAccountId,
    feedId,
    status: "pending",
    triggeredBy,
  };
  if (fileName !== undefined) insert.fileName = fileName;
  if (isDryRun !== undefined) insert.isDryRun = isDryRun;

  const rows = await db.insert(supplierFeedRuns).values(insert).returning();
  return rows[0]!;
}

export async function markRunStarted(db: Db, runId: string): Promise<void> {
  await db
    .update(supplierFeedRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(supplierFeedRuns.id, runId));
}

export async function markRunCompleted(
  db: Db,
  runId: string,
  stats: {
    rowsTotal: number;
    rowsUpdated: number;
    rowsSkipped: number;
    rowsErrored: number;
  },
): Promise<void> {
  await db
    .update(supplierFeedRuns)
    .set({
      status: "completed",
      completedAt: new Date(),
      rowsTotal: stats.rowsTotal,
      rowsUpdated: stats.rowsUpdated,
      rowsSkipped: stats.rowsSkipped,
      rowsErrored: stats.rowsErrored,
    })
    .where(eq(supplierFeedRuns.id, runId));
}

export async function markRunFailed(
  db: Db,
  runId: string,
  errorMessage: string,
  partialStats?: {
    rowsTotal?: number;
    rowsUpdated?: number;
    rowsSkipped?: number;
    rowsErrored?: number;
  },
): Promise<void> {
  const set: Partial<typeof supplierFeedRuns.$inferInsert> = {
    status: "failed",
    completedAt: new Date(),
    errorMessage,
  };
  if (partialStats !== undefined) {
    if (partialStats.rowsTotal !== undefined) set.rowsTotal = partialStats.rowsTotal;
    if (partialStats.rowsUpdated !== undefined) set.rowsUpdated = partialStats.rowsUpdated;
    if (partialStats.rowsSkipped !== undefined) set.rowsSkipped = partialStats.rowsSkipped;
    if (partialStats.rowsErrored !== undefined) set.rowsErrored = partialStats.rowsErrored;
  }
  await db
    .update(supplierFeedRuns)
    .set(set)
    .where(eq(supplierFeedRuns.id, runId));
}

export async function appendRunLog(
  db: Db,
  runId: string,
  entry: FeedRunLogEntry,
): Promise<void> {
  await db
    .update(supplierFeedRuns)
    .set({
      logEntries: sql`${supplierFeedRuns.logEntries} || ${JSON.stringify([entry])}::jsonb`,
    })
    .where(eq(supplierFeedRuns.id, runId));
}

export async function cancelRun(
  db: Db,
  runId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .update(supplierFeedRuns)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(supplierFeedRuns.id, runId),
        eq(supplierFeedRuns.storeAccountId, storeAccountId),
        inArray(supplierFeedRuns.status, ["pending", "running"]),
      ),
    )
    .returning({ id: supplierFeedRuns.id });
  return rows.length > 0;
}
