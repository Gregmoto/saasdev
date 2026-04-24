import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const importPlatformEnum = pgEnum("import_platform_type", [
  "shopify",
  "woocommerce",
  "prestashop",
]);

export const importJobStatusEnum = pgEnum("import_job_status", [
  "draft",
  "validating",
  "dry_running",
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const importModeEnum = pgEnum("import_mode", [
  "create_only",
  "update_existing",
  "create_and_update",
]);

export const importConflictResolutionEnum = pgEnum(
  "import_conflict_resolution",
  ["pending", "keep_existing", "use_incoming"],
);

// ── Import progress ───────────────────────────────────────────────────────────

export interface EntityProgress {
  processed: number;
  lastExternalId: string | null;
}

export interface ImportJobProgress {
  products?: EntityProgress | undefined;
  customers?: EntityProgress | undefined;
  orders?: EntityProgress | undefined;
}

// ── Conflict types ────────────────────────────────────────────────────────────

export interface ConflictField {
  field: string;
  existingValue: unknown;
  incomingValue: unknown;
}

// ── Platform credential shapes (stored AES-encrypted) ─────────────────────────

export interface ShopifyCredentials {
  shopUrl: string;       // e.g. "mystore.myshopify.com"
  accessToken: string;   // Admin API access token (shpat_...)
}

export interface WooCommerceCredentials {
  siteUrl: string;       // e.g. "https://mystore.com"
  consumerKey: string;   // ck_...
  consumerSecret: string; // cs_...
}

export interface PrestaShopCredentials {
  shopUrl: string;       // e.g. "https://mystore.com"
  apiKey: string;        // Web service key
}

export type PlatformCredentials =
  | ShopifyCredentials
  | WooCommerceCredentials
  | PrestaShopCredentials;

// ── Field mapping per entity ───────────────────────────────────────────────────

export interface EntityFieldMapping {
  [ourField: string]: string; // ourField → platformField
}

export interface ImportFieldMapping {
  products?: EntityFieldMapping | undefined;
  customers?: EntityFieldMapping | undefined;
  orders?: EntityFieldMapping | undefined;
}

// ── Import stats ──────────────────────────────────────────────────────────────

export interface EntityImportStats {
  total: number;
  created: number;
  skipped: number;
  errored: number;
}

export interface ImportStats {
  products?: EntityImportStats | undefined;
  customers?: EntityImportStats | undefined;
  orders?: EntityImportStats | undefined;
}

// ── Dry-run results ───────────────────────────────────────────────────────────

export interface EntityDryRunResult {
  total: number;
  wouldCreate: number;
  wouldSkip: number;
  sample: Record<string, unknown>[];  // first 10 items as preview
}

export interface ImportDryRunResults {
  products?: EntityDryRunResult | undefined;
  customers?: EntityDryRunResult | undefined;
  orders?: EntityDryRunResult | undefined;
}

// ── Import log entry ──────────────────────────────────────────────────────────

export interface ImportLogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  entity: "products" | "customers" | "orders" | "system";
  message: string;
  externalId?: string | undefined;
}

// ── import_profiles ───────────────────────────────────────────────────────────
//
// Reusable saved credential + field-mapping presets.
// One profile can be loaded into multiple import jobs.

export const importProfiles = pgTable(
  "import_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    platform: importPlatformEnum("platform").notNull(),
    // AES-256-GCM encrypted JSON of the appropriate *Credentials type.
    credentialsEncrypted: text("credentials_encrypted"),
    // Last-used field mapping — saved automatically on successful job completion.
    defaultFieldMapping: jsonb("default_field_mapping")
      .$type<ImportFieldMapping>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("import_profiles_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── import_jobs ───────────────────────────────────────────────────────────────
//
// One row per wizard run (dry-run or live import).
// Progresses through: draft → validating → [dry_running →] pending → running → completed/failed.

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    // Optional: loaded from a saved profile.
    profileId: uuid("profile_id").references(() => importProfiles.id, { onDelete: "set null" }),
    platform: importPlatformEnum("platform").notNull(),
    status: importJobStatusEnum("status").notNull().default("draft"),
    // AES-256-GCM encrypted JSON of PlatformCredentials.
    credentialsEncrypted: text("credentials_encrypted"),
    // e.g. ["products", "customers", "orders"]
    selectedEntities: jsonb("selected_entities")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // Field-name mapping per entity.
    fieldMapping: jsonb("field_mapping")
      .$type<ImportFieldMapping>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    // Import mode: create only, update existing, or both.
    importMode: importModeEnum("import_mode").notNull().default("create_only"),
    // Live progress tracker (updated during the run).
    progress: jsonb("progress")
      .$type<ImportJobProgress>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    // Whether this is a dry-run (no DB writes).
    isDryRun: boolean("is_dry_run").notNull().default(false),
    // Populated after a dry-run step.
    dryRunResults: jsonb("dry_run_results").$type<ImportDryRunResults>(),
    // Per-entity counters, updated during the run.
    stats: jsonb("stats").$type<ImportStats>().notNull().default(sql`'{}'::jsonb`),
    // Append-only structured log.
    logEntries: jsonb("log_entries")
      .$type<ImportLogEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    errorCount: integer("error_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("import_jobs_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("import_jobs_status_idx").on(t.status),
    profileIdx: index("import_jobs_profile_id_idx").on(t.profileId),
  }),
);

// ── import_conflicts ──────────────────────────────────────────────────────────
//
// One row per field-level conflict detected during an update-mode import.
// Conflicts stay in "pending" until the user resolves them or the job is cancelled.

export const importConflicts = pgTable(
  "import_conflicts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    // "products" | "customers" | "orders"
    entity: varchar("entity", { length: 50 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    internalId: uuid("internal_id").notNull(),
    conflictFields: jsonb("conflict_fields")
      .$type<ConflictField[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    resolution: importConflictResolutionEnum("resolution")
      .notNull()
      .default("pending"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("import_conflicts_store_account_id_idx").on(
      t.storeAccountId,
    ),
    jobIdx: index("import_conflicts_job_id_idx").on(t.jobId),
    jobEntityResolutionIdx: index(
      "import_conflicts_job_entity_resolution_idx",
    ).on(t.jobId, t.entity, t.resolution),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ImportProfile = typeof importProfiles.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type ImportConflict = typeof importConflicts.$inferSelect;
export type ImportPlatform = (typeof importPlatformEnum.enumValues)[number];
export type ImportJobStatus = (typeof importJobStatusEnum.enumValues)[number];
export type ImportMode = (typeof importModeEnum.enumValues)[number];
export type ImportConflictResolution =
  (typeof importConflictResolutionEnum.enumValues)[number];
