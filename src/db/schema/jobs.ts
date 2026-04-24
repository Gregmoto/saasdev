/**
 * Background jobs — unified job tracking table for all async work.
 * Workers use BullMQ for execution; this table provides visibility,
 * logging, retry management, and per-store isolation.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const jobTypeEnum = pgEnum("job_type", [
  "import_products",
  "import_orders",
  "import_customers",
  "supplier_sync",
  "fortnox_sync",
  "analytics_aggregate",
  "feed_generate",
  "search_index_sync",
  "demo_reseed",
  "cache_purge",
  "media_process",
  "sitemap_generate",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
  "retrying",
]);

// ── store_jobs ────────────────────────────────────────────────────────────────

export const storeJobs = pgTable(
  "store_jobs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // Null for platform-level jobs (analytics_aggregate, demo_reseed, etc.)
    storeAccountId: uuid("store_account_id"),
    bullJobId: varchar("bull_job_id", { length: 255 }), // BullMQ job ID
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),

    // Input payload (e.g. import source URL, supplier feed run ID)
    payload: jsonb("payload").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    // Output / result summary
    result: jsonb("result").$type<Record<string, unknown>>(),

    // Progress 0–100
    progress: integer("progress").notNull().default(0),
    progressMessage: varchar("progress_message", { length: 500 }),

    // Execution metadata
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),

    // Triggered by (email of the user or 'system')
    triggeredBy: varchar("triggered_by", { length: 255 }).notNull().default("system"),

    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("store_jobs_store_account_idx").on(t.storeAccountId),
    statusIdx: index("store_jobs_status_idx").on(t.status),
    typeIdx: index("store_jobs_type_idx").on(t.type),
    createdAtIdx: index("store_jobs_created_at_idx").on(t.createdAt),
  }),
);

// ── store_job_logs ────────────────────────────────────────────────────────────

export const storeJobLogs = pgTable(
  "store_job_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    jobId: uuid("job_id").notNull().references(() => storeJobs.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 10 }).notNull().default("info"), // info/warn/error
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    jobIdx: index("store_job_logs_job_idx").on(t.jobId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoreJob = typeof storeJobs.$inferSelect;
export type NewStoreJob = typeof storeJobs.$inferInsert;
export type StoreJobLog = typeof storeJobLogs.$inferSelect;
export type JobType = (typeof jobTypeEnum.enumValues)[number];
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
