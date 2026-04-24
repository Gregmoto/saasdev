import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders.js";

// ── Enums ─────────────────────────────────────────────────────────────────────
// Note: fulfillmentStatusEnum already exists in orders.ts (order-level status).
// This enum tracks individual fulfillment/item-level status.

export const fulfillmentStatusEnum2 = pgEnum("fulfillment_item_status", [
  "pending",
  "packed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
]);

// ── order_fulfillments ─────────────────────────────────────────────────────────

export const orderFulfillments = pgTable(
  "order_fulfillments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    status: fulfillmentStatusEnum2("status").notNull().default("pending"),
    trackingNumber: varchar("tracking_number", { length: 255 }),
    trackingCarrier: varchar("tracking_carrier", { length: 100 }),
    trackingUrl: varchar("tracking_url", { length: 500 }),
    shippingMethodName: varchar("shipping_method_name", { length: 255 }),
    estimatedDeliveryAt: timestamp("estimated_delivery_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_fulfillments_order_id_idx").on(t.orderId),
    storeAccountIdx: index("order_fulfillments_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("order_fulfillments_status_idx").on(t.status),
  }),
);

// ── fulfillment_items ──────────────────────────────────────────────────────────

export const fulfillmentItems = pgTable(
  "fulfillment_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => orderFulfillments.id, { onDelete: "cascade" }),
    // Plain uuid — FK to order_items.id enforced in migration.
    orderItemId: uuid("order_item_id").notNull(),
    storeAccountId: uuid("store_account_id").notNull(),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fulfillmentIdx: index("fulfillment_items_fulfillment_id_idx").on(t.fulfillmentId),
    orderItemIdx: index("fulfillment_items_order_item_id_idx").on(t.orderItemId),
  }),
);

// ── fulfillment_tracking_events ────────────────────────────────────────────────

export const fulfillmentTrackingEvents = pgTable(
  "fulfillment_tracking_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    fulfillmentId: uuid("fulfillment_id")
      .notNull()
      .references(() => orderFulfillments.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 100 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fulfillmentIdx: index("fulfillment_tracking_events_fulfillment_id_idx").on(t.fulfillmentId),
    occurredAtIdx: index("fulfillment_tracking_events_occurred_at_idx").on(t.occurredAt),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderFulfillment = typeof orderFulfillments.$inferSelect;
export type FulfillmentItem = typeof fulfillmentItems.$inferSelect;
export type FulfillmentTrackingEvent = typeof fulfillmentTrackingEvents.$inferSelect;
