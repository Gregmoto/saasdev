import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

// ── shops ──────────────────────────────────────────────────────────────────────
//
// One Store Account → many Shops (storefront instances).
// A Shop is an independently themed, language/currency-scoped storefront.
// Products are mastered at the Store Account level and activated per-shop
// via shop_product_visibility.

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    // Slug is unique within the store account (not globally).
    slug: varchar("slug", { length: 100 }).notNull(),
    // Optional reference to a theme configuration (opaque string).
    themeId: varchar("theme_id", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    defaultLanguage: varchar("default_language", { length: 10 }).notNull().default("en"),
    defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("SEK"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("shops_store_account_id_idx").on(t.storeAccountId),
    storeSlugIdx: uniqueIndex("shops_store_slug_idx").on(t.storeAccountId, t.slug),
  }),
);

// ── shop_domains ───────────────────────────────────────────────────────────────
//
// Per-shop custom hostnames. When a request arrives for a hostname in this table
// the router resolves both storeAccountId AND shopId in a single lookup.
//
// Hostnames here are globally unique (one hostname → one shop only).
// Verification is expected externally (DNS/file); isVerified is set by an admin
// action after confirming the challenge.

export const shopDomains = pgTable(
  "shop_domains",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    hostname: varchar("hostname", { length: 253 }).notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    // The canonical hostname for this shop (used in redirects / Link headers).
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Hostname uniqueness is global (no two shops / store accounts can share a hostname).
    hostnameIdx: uniqueIndex("shop_domains_hostname_idx").on(t.hostname),
    shopIdx: index("shop_domains_shop_id_idx").on(t.shopId),
    storeAccountIdx: index("shop_domains_store_account_id_idx").on(t.storeAccountId),
    verifiedIdx: index("shop_domains_verified_idx").on(t.isVerified),
  }),
);

// ── shop_product_visibility ────────────────────────────────────────────────────
//
// Products are mastered at the Store Account level. This join table records
// which products are activated (published) for each shop.
//
// productId is a plain uuid — FK enforced in migration SQL (avoids cross-file
// import from products.ts).

export const shopProductVisibility = pgTable(
  "shop_product_visibility",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // Plain uuid — FK to products.id in migration, no cross-file .references()
    productId: uuid("product_id").notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Each product appears at most once per shop.
    uniqueShopProduct: uniqueIndex("shop_product_visibility_shop_product_idx").on(
      t.shopId,
      t.productId,
    ),
    shopIdx: index("shop_product_visibility_shop_id_idx").on(t.shopId),
    productIdx: index("shop_product_visibility_product_id_idx").on(t.productId),
    storeAccountIdx: index("shop_product_visibility_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── shop_prices ────────────────────────────────────────────────────────────────
//
// Per-shop pricing overrides for product variants.
// When an override exists it takes precedence over the master variant price.
// When absent, the master variant price_cents is used (with optional currency
// conversion handled at the application layer).
//
// variantId is a plain uuid — FK enforced in migration SQL.

export const shopPrices = pgTable(
  "shop_prices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // Plain uuid — FK to product_variants.id in migration.
    variantId: uuid("variant_id").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Each variant has at most one price override per shop.
    uniqueShopVariant: uniqueIndex("shop_prices_shop_variant_idx").on(t.shopId, t.variantId),
    shopIdx: index("shop_prices_shop_id_idx").on(t.shopId),
    variantIdx: index("shop_prices_variant_id_idx").on(t.variantId),
  }),
);

// ── shop_warehouses ───────────────────────────────────────────────────────────
//
// Links a shop to specific warehouses and defines the order in which they are
// considered when computing storefront availability and allocating stock.
//
// When a shop has no rows here, ALL active warehouses for the store account are
// used (with their global priority).  When rows exist, only the linked
// warehouses are used, ordered by shop_warehouses.priority asc.
//
// warehouseId is typed with .references() — same file is fine; actual FK goes
// to warehouses table in inventory.ts which is a separate file, so we use a
// plain uuid and enforce FK in migration SQL.

export const shopWarehouses = pgTable(
  "shop_warehouses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    // Plain uuid — FK to warehouses.id enforced in migration SQL.
    warehouseId: uuid("warehouse_id").notNull(),
    // Lower = higher priority for stock allocation within this shop.
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Each warehouse linked at most once per shop.
    uniqueShopWarehouse: uniqueIndex("shop_warehouses_shop_warehouse_idx").on(
      t.shopId,
      t.warehouseId,
    ),
    shopIdx: index("shop_warehouses_shop_id_idx").on(t.shopId),
    warehouseIdx: index("shop_warehouses_warehouse_id_idx").on(t.warehouseId),
    storeAccountIdx: index("shop_warehouses_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Shop = typeof shops.$inferSelect;
export type ShopDomain = typeof shopDomains.$inferSelect;
export type ShopProductVisibility = typeof shopProductVisibility.$inferSelect;
export type ShopPrice = typeof shopPrices.$inferSelect;
export type ShopWarehouse = typeof shopWarehouses.$inferSelect;
