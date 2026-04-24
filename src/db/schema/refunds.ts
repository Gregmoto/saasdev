import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  text,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
]);

export const refundMethodEnum = pgEnum("refund_method", [
  "original_payment",
  "manual_bank",
  "manual_cash",
  "store_credit",
  "other",
]);

// ── refunds ───────────────────────────────────────────────────────────────────

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    orderId: uuid("order_id").notNull(),
    paymentId: uuid("payment_id"),
    rmaId: uuid("rma_id"),
    status: refundStatusEnum("status").notNull().default("pending"),
    method: refundMethodEnum("method").notNull().default("original_payment"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    reason: text("reason"),
    providerRefundId: varchar("provider_refund_id", { length: 255 }),
    isManual: boolean("is_manual").notNull().default(false),
    isPartial: boolean("is_partial").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdByUserId: uuid("created_by_user_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("refunds_store_account_id_idx").on(t.storeAccountId),
    orderIdx: index("refunds_order_id_idx").on(t.orderId),
    paymentIdx: index("refunds_payment_id_idx").on(t.paymentId),
    statusIdx: index("refunds_status_idx").on(t.status),
    rmaIdx: index("refunds_rma_id_idx").on(t.rmaId),
  }),
);

// ── refund_items ──────────────────────────────────────────────────────────────

export const refundItems = pgTable(
  "refund_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    refundId: uuid("refund_id")
      .notNull()
      .references(() => refunds.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").notNull(),
    quantity: integer("quantity").notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    refundIdx: index("refund_items_refund_id_idx").on(t.refundId),
    orderItemIdx: index("refund_items_order_item_id_idx").on(t.orderItemId),
  }),
);

// ── refund_audit_log ──────────────────────────────────────────────────────────

export const refundAuditLog = pgTable(
  "refund_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    refundId: uuid("refund_id")
      .notNull()
      .references(() => refunds.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id"),
    action: varchar("action", { length: 100 }).notNull(),
    fromStatus: refundStatusEnum("from_status"),
    toStatus: refundStatusEnum("to_status"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    refundIdx: index("refund_audit_log_refund_id_idx").on(t.refundId),
    storeAccountIdx: index("refund_audit_log_store_account_id_idx").on(t.storeAccountId),
    actorUserIdx: index("refund_audit_log_actor_user_id_idx").on(t.actorUserId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Refund = typeof refunds.$inferSelect;
export type RefundItem = typeof refundItems.$inferSelect;
export type RefundAuditLog = typeof refundAuditLog.$inferSelect;
export type RefundStatus = (typeof refundStatusEnum.enumValues)[number];
export type RefundMethod = (typeof refundMethodEnum.enumValues)[number];
