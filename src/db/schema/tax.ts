import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const taxCategoryEnum = pgEnum("tax_category", [
  "standard",
  "reduced",
  "super_reduced",
  "zero",
  "exempt",
]);

// ── tax_rates ──────────────────────────────────────────────────────────────────

export const taxRates = pgTable(
  "tax_rates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    category: taxCategoryEnum("category").notNull().default("standard"),
    ratePercent: numeric("rate_percent", { precision: 5, scale: 2 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    countryCodeIdx: index("tax_rates_country_code_idx").on(t.countryCode),
    categoryIdx: index("tax_rates_category_idx").on(t.category),
    activeCountryCategoryIdx: uniqueIndex("tax_rates_active_country_category_idx")
      .on(t.countryCode, t.category)
      .where(sql`valid_to IS NULL`),
  }),
);

// ── store_tax_configs ──────────────────────────────────────────────────────────

export const storeTaxConfigs = pgTable(
  "store_tax_configs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    defaultCountryCode: varchar("default_country_code", { length: 2 }).notNull().default("SE"),
    pricesIncludeTax: boolean("prices_include_tax").notNull().default(true),
    defaultTaxCategory: taxCategoryEnum("default_tax_category").notNull().default("standard"),
    b2bTaxExemptByDefault: boolean("b2b_tax_exempt_by_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountUniq: uniqueIndex("store_tax_configs_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── product_tax_categories ─────────────────────────────────────────────────────

export const productTaxCategories = pgTable(
  "product_tax_categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    productId: uuid("product_id").notNull(),
    taxCategory: taxCategoryEnum("tax_category").notNull().default("standard"),
  },
  (t) => ({
    storeProductUniq: uniqueIndex("product_tax_categories_store_product_idx").on(
      t.storeAccountId,
      t.productId,
    ),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaxRate = typeof taxRates.$inferSelect;
export type StoreTaxConfig = typeof storeTaxConfigs.$inferSelect;
export type TaxCategory = (typeof taxCategoryEnum.enumValues)[number];
