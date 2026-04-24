/**
 * Media — store-isolated media library.
 * Paths are namespaced by store_account_id and optionally shop_id.
 * Processing pipeline generates WebP/AVIF variants of each upload.
 * alt_text is required for accessibility compliance.
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

export const mediaStatusEnum = pgEnum("media_status", [
  "pending",    // upload received, processing not started
  "processing", // generating variants
  "ready",      // all variants available
  "failed",     // processing failed
]);

// ── store_media ───────────────────────────────────────────────────────────────

export const storeMedia = pgTable(
  "store_media",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"), // null = store-level, set = shop-specific

    // Original file
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),

    // Required for accessibility
    altText: text("alt_text").notNull().default(""),
    title: varchar("title", { length: 255 }),
    caption: text("caption"),

    // Storage path: e.g. "{storeAccountId}/{shopId?}/{id}/original.jpg"
    storagePath: text("storage_path").notNull(),
    // Public URL for original
    publicUrl: text("public_url"),

    // Processing status
    status: mediaStatusEnum("status").notNull().default("pending"),
    processingError: text("processing_error"),

    // Generated variants: { webp_sm: {url, w, h, bytes}, webp_md: {...}, avif_sm: {...}, ... }
    variants: jsonb("variants").$type<Record<string, {
      url: string;
      width: number;
      height: number;
      bytes: number;
    }>>().default(sql`'{}'::jsonb`),

    // Which entities use this media (for reference counting / cleanup)
    // e.g. [{ type: "product", id: "uuid" }, { type: "product_variant", id: "uuid" }]
    usedIn: jsonb("used_in").$type<Array<{ type: string; id: string }>>().default(sql`'[]'::jsonb`),

    // Admin metadata
    uploadedBy: varchar("uploaded_by", { length: 255 }),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    folder: varchar("folder", { length: 255 }).default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("store_media_store_account_idx").on(t.storeAccountId),
    shopIdx: index("store_media_shop_idx").on(t.shopId),
    statusIdx: index("store_media_status_idx").on(t.status),
    createdAtIdx: index("store_media_created_at_idx").on(t.createdAt),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoreMedia = typeof storeMedia.$inferSelect;
export type NewStoreMedia = typeof storeMedia.$inferInsert;
export type MediaStatus = (typeof mediaStatusEnum.enumValues)[number];

// Variant size definitions used by the processing pipeline
export const MEDIA_VARIANT_SIZES = [
  { key: "webp_sm",  format: "webp" as const, width: 400 },
  { key: "webp_md",  format: "webp" as const, width: 800 },
  { key: "webp_lg",  format: "webp" as const, width: 1600 },
  { key: "avif_sm",  format: "avif" as const, width: 400 },
  { key: "avif_md",  format: "avif" as const, width: 800 },
] as const;
