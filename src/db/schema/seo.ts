/**
 * SEO — Per-store SEO controls: redirects, robots overrides, canonical config.
 * Google Merchant Feed is generated on-demand from product/variant data.
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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const redirectTypeEnum = pgEnum("redirect_type", ["301", "302"]);

// ── store_redirects ────────────────────────────────────────────────────────────

export const storeRedirects = pgTable(
  "store_redirects",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"), // null = store-level, set = shop-specific
    fromPath: varchar("from_path", { length: 2048 }).notNull(),
    toPath: varchar("to_path", { length: 2048 }).notNull(),
    type: redirectTypeEnum("type").notNull().default("301"),
    isActive: boolean("is_active").notNull().default(true),
    hits: integer("hits").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("store_redirects_store_account_idx").on(t.storeAccountId),
    fromPathIdx: index("store_redirects_from_path_idx").on(t.storeAccountId, t.fromPath),
  }),
);

// ── store_seo_settings ────────────────────────────────────────────────────────
// Per-store SEO configuration: robots, canonical base, hreflang mapping.

export const storeSeoSettings = pgTable(
  "store_seo_settings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull().unique(),
    // robots.txt overrides — array of rules like "Disallow: /cart"
    robotsRules: jsonb("robots_rules").$type<string[]>().default(sql`'[]'::jsonb`),
    // Canonical base URL (e.g. "https://mystore.se")
    canonicalBase: varchar("canonical_base", { length: 500 }),
    // hreflang mapping: { sv: 'https://mystore.se', en: 'https://mystore.com' }
    hreflangMap: jsonb("hreflang_map").$type<Record<string, string>>().default(sql`'{}'::jsonb`),
    // Google Merchant account ID for feed attribution
    googleMerchantId: varchar("google_merchant_id", { length: 100 }),
    // Whether to include out-of-stock products in Merchant feed
    merchantFeedIncludeOutOfStock: boolean("merchant_feed_include_out_of_stock").notNull().default(false),
    // Cache buster — bump this to invalidate cached sitemaps
    sitemapVersion: integer("sitemap_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountUnique: uniqueIndex("store_seo_settings_store_account_unique").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoreRedirect = typeof storeRedirects.$inferSelect;
export type NewStoreRedirect = typeof storeRedirects.$inferInsert;
export type StoreSeoSettings = typeof storeSeoSettings.$inferSelect;
