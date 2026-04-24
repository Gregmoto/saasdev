import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ticketStatusEnum = pgEnum("ticket_status", [
  "new",
  "open",
  "pending",
  "waiting_customer",
  "solved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const ticketMessageAuthorTypeEnum = pgEnum("ticket_author_type", [
  "agent",
  "customer",
  "system",
]);

// ── tickets ───────────────────────────────────────────────────────────────────

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    ticketNumber: varchar("ticket_number", { length: 30 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("new"),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    assignedToUserId: uuid("assigned_to_user_id"),
    customerId: uuid("customer_id"),
    customerEmail: varchar("customer_email", { length: 255 }),
    orderId: uuid("order_id"),
    productId: uuid("product_id"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    solvedAt: timestamp("solved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("tickets_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("tickets_status_idx").on(t.status),
    priorityIdx: index("tickets_priority_idx").on(t.priority),
    assignedToUserIdx: index("tickets_assigned_to_user_id_idx").on(t.assignedToUserId),
    customerIdx: index("tickets_customer_id_idx").on(t.customerId),
    orderIdx: index("tickets_order_id_idx").on(t.orderId),
    storeTicketNumberUniq: uniqueIndex("tickets_store_ticket_number_idx").on(t.storeAccountId, t.ticketNumber),
  }),
);

// ── ticket_messages ───────────────────────────────────────────────────────────

export interface TicketAttachment {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    authorType: ticketMessageAuthorTypeEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id"),
    authorCustomerId: uuid("author_customer_id"),
    authorEmail: varchar("author_email", { length: 255 }),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").notNull().default(false),
    attachments: jsonb("attachments").$type<TicketAttachment[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("ticket_messages_ticket_id_idx").on(t.ticketId),
    storeAccountIdx: index("ticket_messages_store_account_id_idx").on(t.storeAccountId),
    authorUserIdx: index("ticket_messages_author_user_id_idx").on(t.authorUserId),
    isInternalIdx: index("ticket_messages_is_internal_idx").on(t.isInternal),
  }),
);

// ── ticket_tags ───────────────────────────────────────────────────────────────

export const ticketTags = pgTable(
  "ticket_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("ticket_tags_store_account_id_idx").on(t.storeAccountId),
    storeNameUniq: uniqueIndex("ticket_tags_store_name_idx").on(t.storeAccountId, t.name),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type TicketTag = typeof ticketTags.$inferSelect;
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number];
