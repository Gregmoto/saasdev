import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const syncJobStatusEnum = pgEnum("sync_job_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const syncLogLevelEnum = pgEnum("sync_log_level", [
  "info",
  "warn",
  "error",
]);

// ── sync_jobs ─────────────────────────────────────────────────────────────────

export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    provider: varchar("provider", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    status: syncJobStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    totalRecords: integer("total_records"),
    processedRecords: integer("processed_records").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("sync_jobs_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("sync_jobs_status_idx").on(t.status),
    providerIdx: index("sync_jobs_provider_idx").on(t.provider),
    nextRetryAtIdx: index("sync_jobs_next_retry_at_idx").on(t.nextRetryAt),
  }),
);

// ── sync_logs ─────────────────────────────────────────────────────────────────

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    syncJobId: uuid("sync_job_id")
      .notNull()
      .references(() => syncJobs.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    provider: varchar("provider", { length: 60 }).notNull(),
    level: syncLogLevelEnum("level").notNull().default("info"),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    syncJobIdx: index("sync_logs_sync_job_id_idx").on(t.syncJobId),
    storeAccountIdx: index("sync_logs_store_account_id_idx").on(t.storeAccountId),
    levelIdx: index("sync_logs_level_idx").on(t.level),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type SyncJob = typeof syncJobs.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
export type SyncJobStatus = (typeof syncJobStatusEnum.enumValues)[number];
