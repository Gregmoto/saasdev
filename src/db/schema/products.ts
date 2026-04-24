import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  real,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "published",
  "archived",
]);

export const productTypeEnum = pgEnum("product_type", [
  "simple",    // single SKU, no variants
  "variable",  // parent + one or more variant rows
  "bundle",    // composed of component products/variants
]);

// ── product_categories ────────────────────────────────────────────────────────

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    parentId: uuid("parent_id"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("product_categories_store_account_id_idx").on(t.storeAccountId),
    storeSlugIdx: uniqueIndex("product_categories_store_slug_idx").on(t.storeAccountId, t.slug),
  }),
);

// ── products ──────────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    // SIMPLE: sku on product itself; VARIABLE: sku on each variant; BUNDLE: no sku (derived)
    type: productTypeEnum("type").notNull().default("simple"),
    status: productStatusEnum("status").notNull().default("draft"),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    taxable: boolean("taxable").notNull().default(true),
    trackInventory: boolean("track_inventory").notNull().default(false),
    inventoryQuantity: integer("inventory_quantity").notNull().default(0),
    weight: real("weight"),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    images: jsonb("images")
      .$type<Array<{ url: string; alt: string }>>()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("products_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("products_status_idx").on(t.status),
    storeSlugIdx: uniqueIndex("products_store_slug_idx").on(t.storeAccountId, t.slug),
  }),
);

// ── product_variants ──────────────────────────────────────────────────────────

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    inventoryQuantity: integer("inventory_quantity").notNull().default(0),
    options: jsonb("options")
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productIdx: index("product_variants_product_id_idx").on(t.productId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type ProductType = (typeof productTypeEnum.enumValues)[number];
