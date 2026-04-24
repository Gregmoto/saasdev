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

export const affiliateStatusEnum = pgEnum("affiliate_status", [
  "pending",      // applied, awaiting approval
  "approved",
  "paused",
  "rejected",
  "terminated",
]);

export const affiliateCommissionTypeEnum = pgEnum("affiliate_commission_type", [
  "percentage",
  "flat",
]);

export const affiliateConversionStatusEnum = pgEnum("affiliate_conversion_status", [
  "pending",      // order placed, not yet confirmed
  "confirmed",    // order delivered / past return window
  "cancelled",    // order cancelled / refunded
  "paid",
]);

export const affiliatePayoutStatusEnum = pgEnum("affiliate_payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

// ── affiliates ────────────────────────────────────────────────────────────────

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    customerId: uuid("customer_id"),                 // linked customer account, if any
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    companyName: varchar("company_name", { length: 200 }),
    website: text("website"),
    status: affiliateStatusEnum("status").notNull().default("pending"),

    // commission configuration (overrides store default)
    commissionType: affiliateCommissionTypeEnum("commission_type").notNull().default("percentage"),
    commissionValue: numeric("commission_value", { precision: 10, scale: 4 }).notNull().default("10"),
    cookieWindowDays: integer("cookie_window_days").notNull().default(30),

    // payout info
    paymentMethod: varchar("payment_method", { length: 50 }),   // bank_transfer / swish
    paymentDetails: jsonb("payment_details").$type<Record<string, string>>(), // encrypted bank info

    // stats (denormalised for dashboard performance)
    totalClickCount: integer("total_click_count").notNull().default(0),
    totalConversionCount: integer("total_conversion_count").notNull().default(0),
    totalRevenueCents: integer("total_revenue_cents").notNull().default(0),
    totalCommissionCents: integer("total_commission_cents").notNull().default(0),
    totalPaidOutCents: integer("total_paid_out_cents").notNull().default(0),

    // lifecycle
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("aff_store_idx").on(t.storeAccountId),
    statusIdx: index("aff_status_idx").on(t.status),
    emailStoreUnique: uniqueIndex("aff_email_store_unique").on(t.storeAccountId, t.email),
  }),
);

// ── affiliate_links ───────────────────────────────────────────────────────────
// Each affiliate can have multiple tracking links/codes

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    code: varchar("code", { length: 50 }).notNull(),          // e.g. AFF-ANNA2024
    // destination URL — can point to homepage, product, campaign, etc.
    targetUrl: text("target_url"),
    label: varchar("label", { length: 100 }),                  // friendly name
    enabled: boolean("enabled").notNull().default(true),
    clickCount: integer("click_count").notNull().default(0),   // denormalised
    conversionCount: integer("conversion_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    affiliateIdx: index("al_affiliate_idx").on(t.affiliateId),
    codeStoreUnique: uniqueIndex("al_code_store_unique").on(t.storeAccountId, t.code),
  }),
);

// ── affiliate_clicks ──────────────────────────────────────────────────────────

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    affiliateLinkId: uuid("affiliate_link_id").notNull().references(() => affiliateLinks.id, { onDelete: "cascade" }),
    affiliateId: uuid("affiliate_id").notNull(),
    storeAccountId: uuid("store_account_id").notNull(),
    sessionId: uuid("session_id"),                   // browser session identifier
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    referer: text("referer"),
    landingUrl: text("landing_url"),
    // cookie expiry set to now() + cookie_window_days
    cookieExpiresAt: timestamp("cookie_expires_at", { withTimezone: true }).notNull(),
    convertedAt: timestamp("converted_at", { withTimezone: true }), // set when order placed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    linkIdx: index("ac_link_idx").on(t.affiliateLinkId),
    affiliateIdx: index("ac_affiliate_idx").on(t.affiliateId),
    sessionIdx: index("ac_session_idx").on(t.sessionId),
    // for deduplication / last-touch attribution
    createdAtIdx: index("ac_created_at_idx").on(t.createdAt),
  }),
);

// ── affiliate_conversions ─────────────────────────────────────────────────────

export const affiliateConversions = pgTable(
  "affiliate_conversions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    affiliateId: uuid("affiliate_id").notNull(),
    affiliateLinkId: uuid("affiliate_link_id").notNull(),
    affiliateClickId: uuid("affiliate_click_id"),    // the winning click (last-touch)
    orderId: uuid("order_id").notNull(),
    customerId: uuid("customer_id"),
    status: affiliateConversionStatusEnum("status").notNull().default("pending"),

    // financial
    orderRevenueCents: integer("order_revenue_cents").notNull(),
    commissionType: affiliateCommissionTypeEnum("commission_type").notNull(),
    commissionValue: numeric("commission_value", { precision: 10, scale: 4 }).notNull(),
    commissionCents: integer("commission_cents").notNull(),

    payoutId: uuid("payout_id"),                     // set when paid out

    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    affiliateIdx: index("aconv_affiliate_idx").on(t.affiliateId),
    orderIdx: index("aconv_order_idx").on(t.orderId),
    statusIdx: index("aconv_status_idx").on(t.status),
    payoutIdx: index("aconv_payout_idx").on(t.payoutId),
    // prevent double-attribution
    uniqueOrder: uniqueIndex("aconv_unique_order").on(t.orderId),
  }),
);

// ── affiliate_payouts ─────────────────────────────────────────────────────────

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    affiliateId: uuid("affiliate_id").notNull(),
    status: affiliatePayoutStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    paymentMethod: varchar("payment_method", { length: 50 }),
    paymentReference: varchar("payment_reference", { length: 255 }),
    exportedAt: timestamp("exported_at", { withTimezone: true }),
    exportFormat: varchar("export_format", { length: 20 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    affiliateIdx: index("ap_affiliate_idx").on(t.affiliateId),
    statusIdx: index("ap_status_idx").on(t.status),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Affiliate = typeof affiliates.$inferSelect;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type AffiliateStatus = (typeof affiliateStatusEnum.enumValues)[number];
export type AffiliateConversionStatus = (typeof affiliateConversionStatusEnum.enumValues)[number];
