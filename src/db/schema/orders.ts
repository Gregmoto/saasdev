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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
  "partially_refunded",
  "refunded",
  "voided",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "unfulfilled",
  "partial",
  "fulfilled",
  "returned",
]);

// ── Tax line item interface ────────────────────────────────────────────────────

export interface TaxLineItem {
  label: string;       // e.g. "Moms 25%"
  ratePercent: number; // 25
  taxableAmountCents: number;
  taxAmountCents: number;
  category: string;    // "standard" | "reduced" etc.
}

// ── orders ────────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    // Plain uuid — FK to shops.id enforced in migration (avoids cross-file import).
    // Null = order not associated with a specific shop (legacy or API-only).
    shopId: uuid("shop_id"),
    orderNumber: varchar("order_number", { length: 30 }).notNull(),
    customerId: uuid("customer_id"),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("unfulfilled"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerFirstName: varchar("customer_first_name", { length: 255 }),
    customerLastName: varchar("customer_last_name", { length: 255 }),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    billingAddress: jsonb("billing_address").$type<Record<string, unknown>>(),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    // Tax breakdown — stored for accounting/export
    taxBreakdown: jsonb("tax_breakdown").$type<TaxLineItem[]>(),
    // Fulfillment tracking
    trackingNumber: varchar("tracking_number", { length: 255 }),
    trackingCarrier: varchar("tracking_carrier", { length: 100 }),
    trackingUrl: varchar("tracking_url", { length: 500 }),
    shippingMethodName: varchar("shipping_method_name", { length: 255 }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("orders_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("orders_shop_id_idx").on(t.shopId),
    statusIdx: index("orders_status_idx").on(t.status),
    paymentStatusIdx: index("orders_payment_status_idx").on(t.paymentStatus),
    customerIdx: index("orders_customer_id_idx").on(t.customerId),
    storeOrderNumberIdx: uniqueIndex("orders_store_order_number_idx").on(t.storeAccountId, t.orderNumber),
  }),
);

// ── order_items ───────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    title: varchar("title", { length: 255 }).notNull(),
    variantTitle: varchar("variant_title", { length: 255 }),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalPriceCents: integer("total_price_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.orderId),
    storeAccountIdx: index("order_items_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type FulfillmentStatus = (typeof fulfillmentStatusEnum.enumValues)[number];
