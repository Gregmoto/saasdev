import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const b2bCompanyStatusEnum = pgEnum("b2b_company_status", [
  "pending",    // applied, awaiting approval
  "approved",
  "suspended",
  "rejected",
]);

export const b2bPriceListDiscountTypeEnum = pgEnum("b2b_price_list_discount_type", [
  "percentage",    // % off retail price
  "fixed_price",   // fixed price per item (override in b2b_price_list_items)
  "margin",        // cost + margin %
]);

export const b2bPaymentMethodEnum = pgEnum("b2b_payment_method", [
  "invoice",
  "credit_card",
  "bank_transfer",
  "direct_debit",
]);

// ── b2b_companies ─────────────────────────────────────────────────────────────
// One per registered B2B/dealer customer per Store Account.
// DISTINCT from the service-reseller portal (portal module).

export const b2bCompanies = pgTable(
  "b2b_companies",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),                           // null = store-wide account

    // Company details
    name: varchar("name", { length: 200 }).notNull(),
    orgNumber: varchar("org_number", { length: 50 }),  // Swedish org nr / EU reg
    vatNumber: varchar("vat_number", { length: 50 }),
    website: text("website"),
    industry: varchar("industry", { length: 100 }),

    // Link to customer account
    customerId: uuid("customer_id"),

    // Internal management
    salesRepUserId: uuid("sales_rep_user_id"),
    status: b2bCompanyStatusEnum("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id"),

    // Pricing + terms
    defaultPriceListId: uuid("default_price_list_id"), // FK to b2b_price_lists
    defaultPaymentTermsId: uuid("default_payment_terms_id"),

    // Credit
    creditLimitCents: integer("credit_limit_cents").notNull().default(0),
    usedCreditCents: integer("used_credit_cents").notNull().default(0),  // outstanding invoices
    allowCreditOverdraft: boolean("allow_credit_overdraft").notNull().default(false),

    // Shipping
    defaultShippingAddressId: uuid("default_shipping_address_id"),
    defaultBillingAddressId: uuid("default_billing_address_id"),

    // Visibility config
    showWarehouseAvailability: boolean("show_warehouse_availability").notNull().default(true),
    showRetailPrice: boolean("show_retail_price").notNull().default(true),  // show RRP vs B2B price

    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("b2b_co_store_idx").on(t.storeAccountId),
    statusIdx: index("b2b_co_status_idx").on(t.status),
    customerIdx: index("b2b_co_customer_idx").on(t.customerId),
  }),
);

// ── b2b_price_lists ───────────────────────────────────────────────────────────

export const b2bPriceLists = pgTable(
  "b2b_price_lists",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    discountType: b2bPriceListDiscountTypeEnum("discount_type").notNull().default("percentage"),
    // global discount value — items in b2b_price_list_items can override
    globalDiscountValue: numeric("global_discount_value", { precision: 10, scale: 4 }).notNull().default("0"),
    isDefault: boolean("is_default").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("b2b_pl_store_idx").on(t.storeAccountId),
  }),
);

// ── b2b_price_list_items ──────────────────────────────────────────────────────
// Product-level price overrides within a price list

export const b2bPriceListItems = pgTable(
  "b2b_price_list_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    priceListId: uuid("price_list_id").notNull().references(() => b2bPriceLists.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    // Fixed price (when discount_type = fixed_price)
    priceCents: integer("price_cents"),
    // Item-level percentage override (when discount_type = percentage)
    discountPercentage: numeric("discount_percentage", { precision: 6, scale: 4 }),
    // MOQ for this product in this price list
    minimumQuantity: integer("minimum_quantity").notNull().default(1),
    maximumQuantity: integer("maximum_quantity"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    priceListIdx: index("b2b_pli_price_list_idx").on(t.priceListId),
    productIdx: index("b2b_pli_product_idx").on(t.productId),
    uniqueVariant: uniqueIndex("b2b_pli_unique_variant").on(t.priceListId, t.productId, t.variantId),
  }),
);

// ── b2b_payment_terms ─────────────────────────────────────────────────────────

export const b2bPaymentTerms = pgTable(
  "b2b_payment_terms",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),  // e.g. "Net 30", "Omgående"
    netDays: integer("net_days").notNull().default(0),  // 0=immediate, 30=net30
    earlyPaymentDiscountDays: integer("early_payment_discount_days"),
    earlyPaymentDiscountPercent: numeric("early_payment_discount_percent", { precision: 6, scale: 4 }),
    allowedMethods: jsonb("allowed_methods").$type<string[]>().notNull().default(sql`'["invoice"]'::jsonb`),
    requiresPurchaseOrder: boolean("requires_purchase_order").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("b2b_pt_store_idx").on(t.storeAccountId),
  }),
);

// ── b2b_minimum_orders ────────────────────────────────────────────────────────
// Global or per-company MOQ / minimum order value rules

export const b2bMinimumOrders = pgTable(
  "b2b_minimum_orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    b2bCompanyId: uuid("b2b_company_id"),              // null = applies to all B2B
    shopId: uuid("shop_id"),
    minimumOrderCents: integer("minimum_order_cents"),  // minimum order value
    minimumOrderQuantity: integer("minimum_order_quantity"), // minimum total units
    minimumOrderLines: integer("minimum_order_lines"),  // minimum line items
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("b2b_mo_store_idx").on(t.storeAccountId),
    companyIdx: index("b2b_mo_company_idx").on(t.b2bCompanyId),
  }),
);

// ── b2b_reorder_templates ─────────────────────────────────────────────────────
// Saved order templates for quick repeat ordering by B2B customers

export const b2bReorderTemplates = pgTable(
  "b2b_reorder_templates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    b2bCompanyId: uuid("b2b_company_id").notNull().references(() => b2bCompanies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    items: jsonb("items").notNull().$type<Array<{
      productId: string;
      variantId?: string;
      sku?: string;
      name?: string;
      quantity: number;
    }>>(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    useCount: integer("use_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("b2b_rt_company_idx").on(t.b2bCompanyId),
    storeIdx: index("b2b_rt_store_idx").on(t.storeAccountId),
  }),
);

// ── b2b_credit_events ────────────────────────────────────────────────────────
// Immutable credit ledger (invoices issued, payments received)

export const b2bCreditEvents = pgTable(
  "b2b_credit_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    b2bCompanyId: uuid("b2b_company_id").notNull().references(() => b2bCompanies.id),
    orderId: uuid("order_id"),
    type: varchar("type", { length: 50 }).notNull(), // invoice_issued / payment_received / credit_note / adjustment
    amountCents: integer("amount_cents").notNull(),   // positive = debit (owes), negative = credit (paid)
    reference: varchar("reference", { length: 200 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("b2b_ce_company_idx").on(t.b2bCompanyId),
    storeIdx: index("b2b_ce_store_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type B2bCompany = typeof b2bCompanies.$inferSelect;
export type B2bPriceList = typeof b2bPriceLists.$inferSelect;
export type B2bPriceListItem = typeof b2bPriceListItems.$inferSelect;
export type B2bPaymentTerms = typeof b2bPaymentTerms.$inferSelect;
export type B2bMinimumOrder = typeof b2bMinimumOrders.$inferSelect;
export type B2bReorderTemplate = typeof b2bReorderTemplates.$inferSelect;
export type B2bCreditEvent = typeof b2bCreditEvents.$inferSelect;
export type B2bCompanyStatus = (typeof b2bCompanyStatusEnum.enumValues)[number];
