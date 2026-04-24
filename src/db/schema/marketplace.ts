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

export const commissionTypeEnum = pgEnum("commission_type", [
  "percentage",   // e.g. 15% of line total
  "flat",         // fixed amount per item
  "tiered",       // percentage varies by revenue tier (stored in tiers JSON)
]);

export const vendorOrderStatusEnum = pgEnum("vendor_order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "open",         // accumulating
  "closed",       // period ended, ready for payout
  "paid",
]);

export const vendorPayoutStatusEnum = pgEnum("vendor_payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

// ── vendor_commission_rules ───────────────────────────────────────────────────
// Rules applied in priority order (product > category > global)

export const vendorCommissionRules = pgTable(
  "vendor_commission_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    vendorId: uuid("vendor_id"),           // null = global default for all vendors
    productId: uuid("product_id"),         // null = applies to category or all
    categoryId: uuid("category_id"),       // null = all categories
    commissionType: commissionTypeEnum("commission_type").notNull().default("percentage"),
    // For percentage: value = 15.00 means 15%
    // For flat: value = 500 means 5.00 in cents (using numeric for precision)
    value: numeric("value", { precision: 10, scale: 4 }).notNull(),
    // For tiered: JSON array [{upToRevenueCents, percentageValue}]
    tiers: jsonb("tiers").$type<Array<{ upToRevenueCents: number; value: number }>>(),
    minCommissionCents: integer("min_commission_cents"),
    maxCommissionCents: integer("max_commission_cents"),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0), // higher = matched first
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("vcr_store_idx").on(t.storeAccountId),
    vendorIdx: index("vcr_vendor_idx").on(t.vendorId),
  }),
);

// ── vendor_orders ─────────────────────────────────────────────────────────────
// Splits of a parent order, one per vendor

export const vendorOrders = pgTable(
  "vendor_orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    orderId: uuid("order_id").notNull(),             // parent order
    vendorId: uuid("vendor_id").notNull(),
    orderNumber: varchar("order_number", { length: 50 }).notNull(), // e.g. ORD-0042-V2
    status: vendorOrderStatusEnum("status").notNull().default("pending"),

    // financial summary (cents)
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    commissionCents: integer("commission_cents").notNull().default(0),
    netPayoutCents: integer("net_payout_cents").notNull().default(0), // total - commission

    // fulfillment
    trackingNumber: varchar("tracking_number", { length: 200 }),
    trackingCarrier: varchar("tracking_carrier", { length: 100 }),
    trackingUrl: text("tracking_url"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("vo_order_idx").on(t.orderId),
    vendorIdx: index("vo_vendor_idx").on(t.vendorId),
    storeIdx: index("vo_store_idx").on(t.storeAccountId),
    uniqueOrderVendor: uniqueIndex("vo_unique_order_vendor").on(t.orderId, t.vendorId),
  }),
);

// ── vendor_order_items ────────────────────────────────────────────────────────

export const vendorOrderItems = pgTable(
  "vendor_order_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorOrderId: uuid("vendor_order_id").notNull().references(() => vendorOrders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").notNull(),    // FK to orders.orderItems
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    sku: varchar("sku", { length: 100 }),
    name: varchar("name", { length: 500 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    commissionRuleId: uuid("commission_rule_id"),
    commissionCents: integer("commission_cents").notNull().default(0),
    netPayoutCents: integer("net_payout_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vendorOrderIdx: index("voi_vendor_order_idx").on(t.vendorOrderId),
  }),
);

// ── commissions ───────────────────────────────────────────────────────────────
// Ledger of commission events (immutable append-only)

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    vendorId: uuid("vendor_id").notNull(),
    vendorOrderId: uuid("vendor_order_id").notNull().references(() => vendorOrders.id),
    vendorOrderItemId: uuid("vendor_order_item_id"),
    commissionRuleId: uuid("commission_rule_id"),
    commissionType: commissionTypeEnum("commission_type").notNull(),
    rateValue: numeric("rate_value", { precision: 10, scale: 4 }).notNull(),
    grossAmountCents: integer("gross_amount_cents").notNull(),
    commissionCents: integer("commission_cents").notNull(),
    netAmountCents: integer("net_amount_cents").notNull(),
    settlementId: uuid("settlement_id"),              // set when included in a settlement
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vendorIdx: index("comm_vendor_idx").on(t.vendorId),
    vendorOrderIdx: index("comm_vendor_order_idx").on(t.vendorOrderId),
    settlementIdx: index("comm_settlement_idx").on(t.settlementId),
    storeIdx: index("comm_store_idx").on(t.storeAccountId),
  }),
);

// ── vendor_settlements ────────────────────────────────────────────────────────
// Aggregated period settlement (e.g. monthly)

export const vendorSettlements = pgTable(
  "vendor_settlements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    vendorId: uuid("vendor_id").notNull(),
    settlementNumber: varchar("settlement_number", { length: 50 }).notNull(), // SET-0001
    status: settlementStatusEnum("status").notNull().default("open"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // totals (cents)
    grossRevenueCents: integer("gross_revenue_cents").notNull().default(0),
    totalCommissionCents: integer("total_commission_cents").notNull().default(0),
    refundAdjustmentCents: integer("refund_adjustment_cents").notNull().default(0),
    netPayoutCents: integer("net_payout_cents").notNull().default(0),

    notes: text("notes"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vendorIdx: index("vs_vendor_idx").on(t.vendorId),
    storeIdx: index("vs_store_idx").on(t.storeAccountId),
    statusIdx: index("vs_status_idx").on(t.status),
  }),
);

// ── vendor_payouts ────────────────────────────────────────────────────────────

export const vendorPayouts = pgTable(
  "vendor_payouts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    vendorId: uuid("vendor_id").notNull(),
    settlementId: uuid("settlement_id").references(() => vendorSettlements.id),
    status: vendorPayoutStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),

    // payment details
    paymentMethod: varchar("payment_method", { length: 50 }), // bank_transfer / swish / etc
    paymentReference: varchar("payment_reference", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    // export
    exportedAt: timestamp("exported_at", { withTimezone: true }),
    exportFormat: varchar("export_format", { length: 20 }),  // csv / bgmax

    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    vendorIdx: index("vp_vendor_idx").on(t.vendorId),
    settlementIdx: index("vp_settlement_idx").on(t.settlementId),
    statusIdx: index("vp_status_idx").on(t.status),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type VendorCommissionRule = typeof vendorCommissionRules.$inferSelect;
export type VendorOrder = typeof vendorOrders.$inferSelect;
export type VendorOrderItem = typeof vendorOrderItems.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type VendorSettlement = typeof vendorSettlements.$inferSelect;
export type VendorPayout = typeof vendorPayouts.$inferSelect;
export type CommissionType = (typeof commissionTypeEnum.enumValues)[number];
export type VendorOrderStatus = (typeof vendorOrderStatusEnum.enumValues)[number];
export type SettlementStatus = (typeof settlementStatusEnum.enumValues)[number];
