import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const rmaStatusEnum = pgEnum("rma_status", [
  "requested",
  "approved",
  "label_sent",
  "received",
  "inspected",
  "refunded",
  "exchanged",
  "denied",
  "closed",
]);

export const rmaItemConditionEnum = pgEnum("rma_item_condition", [
  "new",
  "good",
  "damaged",
  "defective",
  "missing_parts",
  "unknown",
]);

export const rmaDispositionEnum = pgEnum("rma_disposition", [
  "restock",
  "refurbish",
  "scrap",
  "vendor_return",
  "pending",
]);

export const rmaMessageAuthorTypeEnum = pgEnum("rma_author_type", [
  "agent",
  "customer",
  "system",
]);

// ── rmas ──────────────────────────────────────────────────────────────────────

export const rmas = pgTable(
  "rmas",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    orderId: uuid("order_id").notNull(),
    customerId: uuid("customer_id"),
    customerEmail: varchar("customer_email", { length: 255 }),
    rmaNumber: varchar("rma_number", { length: 30 }).notNull(),
    status: rmaStatusEnum("status").notNull().default("requested"),
    reason: text("reason").notNull(),
    notes: text("notes"),
    refundAmountCents: integer("refund_amount_cents"),
    refundId: uuid("refund_id"),
    replacementOrderId: uuid("replacement_order_id"),
    returnLabelUrl: varchar("return_label_url", { length: 500 }),
    returnLabelCarrier: varchar("return_label_carrier", { length: 100 }),
    returnTrackingNumber: varchar("return_tracking_number", { length: 255 }),
    assignedToUserId: uuid("assigned_to_user_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    labelSentAt: timestamp("label_sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    inspectedAt: timestamp("inspected_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("rmas_store_account_id_idx").on(t.storeAccountId),
    orderIdx: index("rmas_order_id_idx").on(t.orderId),
    customerIdx: index("rmas_customer_id_idx").on(t.customerId),
    statusIdx: index("rmas_status_idx").on(t.status),
    assignedToUserIdx: index("rmas_assigned_to_user_id_idx").on(t.assignedToUserId),
    storeRmaNumberUniq: uniqueIndex("rmas_store_rma_number_idx").on(t.storeAccountId, t.rmaNumber),
  }),
);

// ── rma_items ─────────────────────────────────────────────────────────────────

export const rmaItems = pgTable(
  "rma_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rmaId: uuid("rma_id")
      .notNull()
      .references(() => rmas.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    orderItemId: uuid("order_item_id").notNull(),
    sku: varchar("sku", { length: 100 }),
    quantityRequested: integer("quantity_requested").notNull(),
    quantityReceived: integer("quantity_received"),
    condition: rmaItemConditionEnum("condition"),
    disposition: rmaDispositionEnum("disposition").notNull().default("pending"),
    restockedWarehouseId: uuid("restocked_warehouse_id"),
    inspectionNotes: text("inspection_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rmaIdx: index("rma_items_rma_id_idx").on(t.rmaId),
    storeAccountIdx: index("rma_items_store_account_id_idx").on(t.storeAccountId),
    orderItemIdx: index("rma_items_order_item_id_idx").on(t.orderItemId),
    dispositionIdx: index("rma_items_disposition_idx").on(t.disposition),
  }),
);

// ── rma_messages ──────────────────────────────────────────────────────────────

export const rmaMessages = pgTable(
  "rma_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rmaId: uuid("rma_id")
      .notNull()
      .references(() => rmas.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    authorType: rmaMessageAuthorTypeEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id"),
    authorCustomerId: uuid("author_customer_id"),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rmaIdx: index("rma_messages_rma_id_idx").on(t.rmaId),
    storeAccountIdx: index("rma_messages_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── rma_attachments ───────────────────────────────────────────────────────────

export const rmaAttachments = pgTable(
  "rma_attachments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rmaId: uuid("rma_id").references(() => rmas.id, { onDelete: "cascade" }),
    rmaItemId: uuid("rma_item_id").references(() => rmaItems.id, { onDelete: "cascade" }),
    rmaMessageId: uuid("rma_message_id").references(() => rmaMessages.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rmaIdx: index("rma_attachments_rma_id_idx").on(t.rmaId),
    rmaItemIdx: index("rma_attachments_rma_item_id_idx").on(t.rmaItemId),
    rmaMessageIdx: index("rma_attachments_rma_message_id_idx").on(t.rmaMessageId),
    storeAccountIdx: index("rma_attachments_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Rma = typeof rmas.$inferSelect;
export type RmaItem = typeof rmaItems.$inferSelect;
export type RmaMessage = typeof rmaMessages.$inferSelect;
export type RmaAttachment = typeof rmaAttachments.$inferSelect;
export type RmaStatus = (typeof rmaStatusEnum.enumValues)[number];
export type RmaItemCondition = (typeof rmaItemConditionEnum.enumValues)[number];
export type RmaDisposition = (typeof rmaDispositionEnum.enumValues)[number];
