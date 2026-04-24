import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const chatThreadStatusEnum = pgEnum("chat_thread_status", [
  "open",
  "assigned",
  "closed",
  "archived",
]);

export const chatMessageAuthorTypeEnum = pgEnum("chat_message_author_type", [
  "customer",
  "agent",
  "bot",
  "system",
]);

export const chatWidgetPositionEnum = pgEnum("chat_widget_position", [
  "bottom_right",
  "bottom_left",
]);

// ── chat_threads ──────────────────────────────────────────────────────────────

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    customerId: uuid("customer_id"),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerName: varchar("customer_name", { length: 255 }),
    sessionId: varchar("session_id", { length: 255 }),
    status: chatThreadStatusEnum("status").notNull().default("open"),
    assignedToUserId: uuid("assigned_to_user_id"),
    subject: varchar("subject", { length: 500 }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("chat_threads_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("chat_threads_shop_id_idx").on(t.shopId),
    customerIdx: index("chat_threads_customer_id_idx").on(t.customerId),
    statusIdx: index("chat_threads_status_idx").on(t.status),
    assignedToUserIdx: index("chat_threads_assigned_to_user_id_idx").on(t.assignedToUserId),
    lastMessageAtIdx: index("chat_threads_last_message_at_idx").on(t.lastMessageAt),
  }),
);

// ── chat_messages ─────────────────────────────────────────────────────────────

export interface ChatAttachment {
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    authorType: chatMessageAuthorTypeEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id"),
    authorCustomerId: uuid("author_customer_id"),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    attachments: jsonb("attachments").$type<ChatAttachment[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    threadIdx: index("chat_messages_thread_id_idx").on(t.threadId),
    storeAccountIdx: index("chat_messages_store_account_id_idx").on(t.storeAccountId),
    isReadIdx: index("chat_messages_is_read_idx").on(t.isRead),
    authorTypeIdx: index("chat_messages_author_type_idx").on(t.authorType),
  }),
);

// ── business_hours ────────────────────────────────────────────────────────────

export const businessHours = pgTable(
  "business_hours",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: varchar("open_time", { length: 5 }).notNull(),
    closeTime: varchar("close_time", { length: 5 }).notNull(),
    isOpen: boolean("is_open").notNull().default(true),
    timezone: varchar("timezone", { length: 100 }).notNull().default("Europe/Stockholm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("business_hours_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── chat_widget_config ────────────────────────────────────────────────────────

export const chatWidgetConfig = pgTable(
  "chat_widget_config",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    welcomeMessage: text("welcome_message"),
    offlineMessage: text("offline_message"),
    primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#2563EB"),
    position: chatWidgetPositionEnum("position").notNull().default("bottom_right"),
    requireEmail: boolean("require_email").notNull().default(false),
    autoGreetDelaySecs: integer("auto_greet_delay_secs").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("chat_widget_config_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── chat_offline_submissions ──────────────────────────────────────────────────

export const chatOfflineSubmissions = pgTable(
  "chat_offline_submissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    message: text("message").notNull(),
    ticketId: uuid("ticket_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("chat_offline_submissions_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("chat_offline_submissions_shop_id_idx").on(t.shopId),
    ticketIdx: index("chat_offline_submissions_ticket_id_idx").on(t.ticketId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type BusinessHours = typeof businessHours.$inferSelect;
export type ChatWidgetConfig = typeof chatWidgetConfig.$inferSelect;
export type ChatOfflineSubmission = typeof chatOfflineSubmissions.$inferSelect;
export type ChatThreadStatus = (typeof chatThreadStatusEnum.enumValues)[number];
