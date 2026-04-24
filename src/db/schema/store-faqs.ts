/**
 * Store FAQs — per-store FAQ/Help Center entries with versioning and audit log.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const faqStatusEnum = pgEnum("faq_status", [
  "draft",
  "published",
  "archived",
]);

// ── store_faqs ────────────────────────────────────────────────────────────────

export const storeFaqs = pgTable(
  "store_faqs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull().default(""),
    category: varchar("category", { length: 100 }),
    status: faqStatusEnum("status").notNull().default("draft"),
    // Only platform admin can set isGlobal=true; global FAQs appear in all stores.
    isGlobal: boolean("is_global").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // Empty array = visible to all roles; populated = restricted to listed roles.
    visibleToRoles: jsonb("visible_to_roles")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    scheduledPublishAt: timestamp("scheduled_publish_at", { withTimezone: true }),
    scheduledArchiveAt: timestamp("scheduled_archive_at", { withTimezone: true }),
    currentVersion: integer("current_version").notNull().default(1),
    viewCount: integer("view_count").notNull().default(0),
    helpfulCount: integer("helpful_count").notNull().default(0),
    notHelpfulCount: integer("not_helpful_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeStatusIdx: index("store_faqs_store_status_idx").on(t.storeAccountId, t.status),
    globalStatusIdx: index("store_faqs_global_status_idx").on(t.isGlobal, t.status),
  }),
);

// ── store_faq_versions ────────────────────────────────────────────────────────

export const storeFaqVersions = pgTable(
  "store_faq_versions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    faqId: uuid("faq_id")
      .notNull()
      .references(() => storeFaqs.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull().default(""),
    editedBy: varchar("edited_by", { length: 255 }),
    editSummary: varchar("edit_summary", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    faqIdx: index("store_faq_versions_faq_id_idx").on(t.faqId),
  }),
);

// ── store_faq_audit ───────────────────────────────────────────────────────────

export const storeFaqAudit = pgTable(
  "store_faq_audit",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    faqId: uuid("faq_id")
      .notNull()
      .references(() => storeFaqs.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(),
    actorEmail: varchar("actor_email", { length: 255 }),
    actorRole: varchar("actor_role", { length: 50 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    faqIdx: index("store_faq_audit_faq_id_idx").on(t.faqId),
    createdAtIdx: index("store_faq_audit_created_at_idx").on(t.createdAt),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StoreFaq = typeof storeFaqs.$inferSelect;
export type StoreFaqVersion = typeof storeFaqVersions.$inferSelect;
export type StoreFaqAudit = typeof storeFaqAudit.$inferSelect;
export type FaqStatus = (typeof faqStatusEnum.enumValues)[number];
