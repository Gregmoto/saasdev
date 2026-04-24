/**
 * Leads — Marketing lead capture for ShopMan platform.
 * Stores contact form submissions, demo requests, and trial sign-ups.
 * Platform-level, no storeAccountId.
 */
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

// ── Enums ─────────────────────────────────────────────────────────────────────

export const leadTypeEnum = pgEnum("lead_type", [
  "contact",      // general contact form
  "demo",         // book a demo request
  "trial",        // start trial sign-up
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "spam",
]);

// ── leads ─────────────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    type: leadTypeEnum("type").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),

    // Contact info
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }).notNull(),
    company: varchar("company", { length: 200 }),
    phone: varchar("phone", { length: 50 }),

    // Lead details
    message: text("message"),
    // For demo: preferred time slot, for trial: plan interest
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),

    // UTM tracking
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 200 }),
    utmContent: varchar("utm_content", { length: 200 }),
    utmTerm: varchar("utm_term", { length: 200 }),

    // Attribution
    referrer: text("referrer"),
    landingPage: text("landing_page"),
    userAgent: text("user_agent"),

    // CRM webhook status
    webhookSent: boolean("webhook_sent").notNull().default(false),
    webhookSentAt: timestamp("webhook_sent_at", { withTimezone: true }),
    webhookError: text("webhook_error"),

    // Admin notes
    notes: text("notes"),
    assignedTo: varchar("assigned_to", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("leads_type_idx").on(t.type),
    statusIdx: index("leads_status_idx").on(t.status),
    emailIdx: index("leads_email_idx").on(t.email),
    createdAtIdx: index("leads_created_at_idx").on(t.createdAt),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadType = (typeof leadTypeEnum.enumValues)[number];
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
