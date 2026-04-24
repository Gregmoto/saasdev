import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";
import { warehouses } from "./inventory.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const supplierConnectorTypeEnum = pgEnum("supplier_connector_type", [
  "ftp",
  "sftp",
  "api",
  "manual_csv",
]);

export const supplierFeedFormatEnum = pgEnum("supplier_feed_format", [
  "csv",
  "xml",
  "json",
]);

export const supplierFeedRunStatusEnum = pgEnum("supplier_feed_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const supplierFeedTriggerEnum = pgEnum("supplier_feed_trigger", [
  "scheduled",
  "manual",
]);

export const supplierApiAuthTypeEnum = pgEnum("supplier_api_auth_type", [
  "api_key",
  "bearer",
  "basic",
]);

export const supplierApiPaginationTypeEnum = pgEnum("supplier_api_pagination_type", [
  "none",
  "page",
  "cursor",
  "offset",
]);

export const unknownSkuBehaviorEnum = pgEnum("unknown_sku_behavior", [
  "ignore",
  "create_placeholder",
  "flag_for_review",
]);

export const reviewItemStatusEnum = pgEnum("review_item_status", [
  "pending",
  "mapped",
  "ignored",
]);

// ── Shared config types ───────────────────────────────────────────────────────

/** Plaintext credentials shape (stored encrypted). */
export interface SupplierCredentials {
  // FTP / SFTP
  host?: string | undefined;
  port?: number | undefined;
  username?: string | undefined;
  password?: string | undefined;
  privateKey?: string | undefined; // SFTP private-key PEM
  passphrase?: string | undefined; // SFTP private-key passphrase
  // API
  apiKey?: string | undefined;
  bearerToken?: string | undefined;
}

/** Remote file-transfer options (FTP/SFTP). */
export interface RemoteConfig {
  host: string;
  port: number;
  remotePath: string;   // directory on the remote server
  filePattern: string;  // glob / regex string to match file names
  unzip: boolean;       // whether to decompress .gz / .zip after download
  encoding: string;     // file encoding, e.g. "utf-8" or "latin1"
}

/** HTTP API connector options. */
export interface ApiConfig {
  url: string;
  authType: "api_key" | "bearer" | "basic";
  /** Header name when authType = 'api_key' (e.g. "X-API-Key"). */
  authHeader?: string | undefined;
  paginationType: "none" | "page" | "cursor" | "offset";
  pageSize?: number | undefined;
  /** Dot-path into the response object where the item array lives (e.g. "data" or "products.items"). */
  dataField: string;
  totalField?: string | undefined;
  nextCursorField?: string | undefined;
  pageParam?: string | undefined;    // default "page"
  perPageParam?: string | undefined; // default "per_page"
  offsetParam?: string | undefined;  // default "offset"
  /** Additional static headers to include. */
  headers?: Record<string, string> | undefined;
}

/** Field-name mapping from supplier data to our system fields. */
export interface MappingConfig {
  sku?: string | undefined;       // supplier field name → our SKU
  ean?: string | undefined;       // supplier field name → our EAN
  qty: string;                    // supplier field name → quantity available
  price?: string | undefined;     // supplier field name → price/cost in supplier currency
  costPrice?: string | undefined; // alternative cost-price field
  name?: string | undefined;      // supplier field name → product name (informational)
}

/** Rules for matching supplier rows to our products. */
export interface MatchRules {
  primary: "sku" | "ean";
  secondary?: "sku" | "ean" | undefined;
}

// ── suppliers ─────────────────────────────────────────────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("suppliers_store_account_id_idx").on(t.storeAccountId),
    storeSlugIdx: uniqueIndex("suppliers_store_slug_idx").on(t.storeAccountId, t.slug),
  }),
);

// ── supplier_feeds ────────────────────────────────────────────────────────────

export const supplierFeeds = pgTable(
  "supplier_feeds",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    // FK to warehouses.id — same-file import from inventory.ts is fine.
    targetWarehouseId: uuid("target_warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    connectorType: supplierConnectorTypeEnum("connector_type").notNull(),
    format: supplierFeedFormatEnum("format").notNull().default("csv"),
    // AES-256-GCM encrypted JSON of SupplierCredentials.
    credentialsEncrypted: text("credentials_encrypted"),
    // FTP/SFTP remote options.
    remoteConfig: jsonb("remote_config").$type<RemoteConfig>(),
    // HTTP API options.
    apiConfig: jsonb("api_config").$type<ApiConfig>(),
    // Field-name mapping from supplier data to our system.
    mappingConfig: jsonb("mapping_config").$type<MappingConfig>().notNull().default(sql`'{}'::jsonb`),
    // Primary/secondary match rules.
    matchRules: jsonb("match_rules").$type<MatchRules>().notNull().default(sql`'{"primary":"sku","secondary":"ean"}'::jsonb`),
    // Cron expression or null for manual-only.
    schedule: varchar("schedule", { length: 100 }),
    // What to do when a supplier row's SKU/EAN cannot be matched to any product.
    unknownSkuBehavior: unknownSkuBehaviorEnum("unknown_sku_behavior").notNull().default("ignore"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("supplier_feeds_store_account_id_idx").on(t.storeAccountId),
    supplierIdx: index("supplier_feeds_supplier_id_idx").on(t.supplierId),
    warehouseIdx: index("supplier_feeds_warehouse_id_idx").on(t.targetWarehouseId),
  }),
);

// ── supplier_feed_runs ────────────────────────────────────────────────────────

/** Single structured log entry appended during a run. */
export interface FeedRunLogEntry {
  ts: string;      // ISO timestamp
  level: "info" | "warn" | "error";
  message: string;
  rowIndex?: number;
}

export const supplierFeedRuns = pgTable(
  "supplier_feed_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => supplierFeeds.id, { onDelete: "cascade" }),
    status: supplierFeedRunStatusEnum("status").notNull().default("pending"),
    triggeredBy: supplierFeedTriggerEnum("triggered_by").notNull().default("manual"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rowsTotal: integer("rows_total").notNull().default(0),
    rowsUpdated: integer("rows_updated").notNull().default(0),
    rowsSkipped: integer("rows_skipped").notNull().default(0),
    rowsErrored: integer("rows_errored").notNull().default(0),
    errorMessage: text("error_message"),
    logEntries: jsonb("log_entries").$type<FeedRunLogEntry[]>().notNull().default(sql`'[]'::jsonb`),
    // Populated for manual_csv connector runs.
    fileName: varchar("file_name", { length: 255 }),
    // Dry-run support: when true, no DB writes are made; previewData holds results.
    isDryRun: boolean("is_dry_run").notNull().default(false),
    previewData: jsonb("preview_data").$type<PreviewData>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("supplier_feed_runs_store_account_id_idx").on(t.storeAccountId),
    feedIdx: index("supplier_feed_runs_feed_id_idx").on(t.feedId),
    statusIdx: index("supplier_feed_runs_status_idx").on(t.status),
    createdAtIdx: index("supplier_feed_runs_created_at_idx").on(t.createdAt),
  }),
);

// ── Dry-run preview type ──────────────────────────────────────────────────────

export interface PreviewRow {
  rowIndex: number;
  sku?: string | undefined;
  ean?: string | undefined;
  supplierQty: number;
  supplierPrice?: number | undefined;
  matchedSku?: string | undefined;       // internal SKU that was matched
  currentQty?: number | undefined;       // current inventory qty (if matched)
  action: "update" | "unmatched" | "skipped";
  unmatchedReason?: string | undefined;
}

export interface PreviewData {
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  skippedCount: number;
  rows: PreviewRow[];          // first 500 rows for UI display
}

// ── supplier_sku_mappings ─────────────────────────────────────────────────────
//
// Maps a supplier-provided SKU to an internal product SKU.
// feed_id = NULL → store-wide mapping (applies to all feeds).
// feed_id IS NOT NULL → overrides the store-wide mapping for a specific feed.

export const supplierSkuMappings = pgTable(
  "supplier_sku_mappings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    // Nullable: NULL = store-wide mapping
    feedId: uuid("feed_id").references(() => supplierFeeds.id, { onDelete: "cascade" }),
    supplierSku: varchar("supplier_sku", { length: 255 }).notNull(),
    internalSku: varchar("internal_sku", { length: 100 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("supplier_sku_mappings_store_account_id_idx").on(t.storeAccountId),
    feedIdx: index("supplier_sku_mappings_feed_id_idx").on(t.feedId),
  }),
);

// ── supplier_review_items ─────────────────────────────────────────────────────
//
// Rows from a feed run that could not be matched; require manual resolution.

export const supplierReviewItems = pgTable(
  "supplier_review_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => supplierFeeds.id, { onDelete: "cascade" }),
    // Plain uuid — FK to supplier_feed_runs.id (nullable; run may be deleted)
    runId: uuid("run_id"),
    supplierSku: varchar("supplier_sku", { length: 255 }),
    supplierEan: varchar("supplier_ean", { length: 100 }),
    supplierQty: integer("supplier_qty"),
    supplierPrice: numeric("supplier_price", { precision: 14, scale: 4 }),
    // Full raw row from the supplier file for debugging / re-processing.
    rawData: jsonb("raw_data").$type<Record<string, string>>(),
    status: reviewItemStatusEnum("status").notNull().default("pending"),
    resolutionNotes: text("resolution_notes"),
    // Set when status = 'mapped'.
    mappedInternalSku: varchar("mapped_internal_sku", { length: 100 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("supplier_review_items_store_account_id_idx").on(t.storeAccountId),
    feedIdx: index("supplier_review_items_feed_id_idx").on(t.feedId),
    runIdx: index("supplier_review_items_run_id_idx").on(t.runId),
    statusIdx: index("supplier_review_items_status_idx").on(t.status),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Supplier = typeof suppliers.$inferSelect;
export type SupplierFeed = typeof supplierFeeds.$inferSelect;
export type SupplierFeedRun = typeof supplierFeedRuns.$inferSelect;
export type SupplierSkuMapping = typeof supplierSkuMappings.$inferSelect;
export type SupplierReviewItem = typeof supplierReviewItems.$inferSelect;
export type SupplierConnectorType = (typeof supplierConnectorTypeEnum.enumValues)[number];
export type SupplierFeedFormat = (typeof supplierFeedFormatEnum.enumValues)[number];
export type SupplierFeedRunStatus = (typeof supplierFeedRunStatusEnum.enumValues)[number];
export type UnknownSkuBehavior = (typeof unknownSkuBehaviorEnum.enumValues)[number];
export type ReviewItemStatus = (typeof reviewItemStatusEnum.enumValues)[number];
