import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums (legacy, not re-exported to avoid collisions with tickets.ts) ────────

const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

const supportTicketPriorityEnum = pgEnum("support_ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// ── support_tickets ───────────────────────────────────────────────────────────
// Legacy simple support ticket table. The full-featured tickets system is in tickets.ts.

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    customerId: uuid("customer_id"),
    orderId: uuid("order_id"),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    priority: supportTicketPriorityEnum("priority").notNull().default("medium"),
    assignedUserId: uuid("assigned_user_id"),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("support_tickets_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("support_tickets_status_idx").on(t.status),
    priorityIdx: index("support_tickets_priority_idx").on(t.priority),
    customerIdx: index("support_tickets_customer_id_idx").on(t.customerId),
  }),
);

// ── support_ticket_messages ───────────────────────────────────────────────────
// Legacy message table for support_tickets. Named supportTicketMessages internally
// but exported as ticketMessages for backward-compat with existing service code.

const supportTicketMessagesTable = pgTable(
  "support_ticket_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    authorId: uuid("author_id"),
    authorType: varchar("author_type", { length: 20 }).notNull(),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    attachments: jsonb("attachments").$type<Array<{ url: string; name: string; size: number }>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("support_ticket_messages_ticket_id_idx").on(t.ticketId),
    storeAccountIdx: index("support_ticket_messages_store_account_id_idx").on(t.storeAccountId),
  }),
);

// Exported as supportTicketMessages (the service imports it by this name).
export { supportTicketMessagesTable as supportTicketMessages };

// ── rma_requests ──────────────────────────────────────────────────────────────
// Legacy simple RMA table. The full-featured RMA system is in rma.ts.

export const rmaRequests = pgTable(
  "rma_requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    orderId: uuid("order_id"),
    customerId: uuid("customer_id"),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    reason: varchar("reason", { length: 100 }).notNull(),
    items: jsonb("items")
      .$type<Array<{ orderItemId: string; quantity: number; reason: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    resolution: varchar("resolution", { length: 100 }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("rma_requests_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("rma_requests_status_idx").on(t.status),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportTicketMessage = typeof supportTicketMessagesTable.$inferSelect;
export type RmaRequest = typeof rmaRequests.$inferSelect;
export type SupportTicketStatus = (typeof supportTicketStatusEnum.enumValues)[number];
export type SupportTicketPriority = (typeof supportTicketPriorityEnum.enumValues)[number];
