import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  smallint,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "published",
  "rejected",
  "flagged",
  "archived",
]);

export const reviewVerificationEnum = pgEnum("review_verification", [
  "none",
  "purchase",     // submitted via invitation token linked to an order line
  "account",      // logged-in customer, no purchase
]);

export const reviewMediaTypeEnum = pgEnum("review_media_type", [
  "image",
  "video",
]);

export const reviewVoteTypeEnum = pgEnum("review_vote_type", [
  "helpful",
  "not_helpful",
]);

export const reviewReplyAuthorEnum = pgEnum("review_reply_author", [
  "vendor",
  "admin",
]);

export const reviewInvitationStatusEnum = pgEnum("review_invitation_status", [
  "pending",
  "sent",
  "opened",
  "completed",
  "expired",
  "cancelled",
]);

// ── product_reviews ───────────────────────────────────────────────────────────

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),                          // null = store-level
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    customerId: uuid("customer_id"),
    orderId: uuid("order_id"),
    orderItemId: uuid("order_item_id"),
    invitationId: uuid("invitation_id"),              // FK → review_invitations
    vendorId: uuid("vendor_id"),                      // marketplace: product vendor

    // author info (for non-logged-in display / pseudonym)
    authorName: varchar("author_name", { length: 100 }),
    authorEmail: varchar("author_email", { length: 255 }), // hashed / private
    ipAddress: varchar("ip_address", { length: 45 }),       // IPv4/IPv6 for anti-spam

    // content
    rating: smallint("rating").notNull(),             // 1-5
    title: varchar("title", { length: 255 }),
    body: text("body"),
    language: varchar("language", { length: 10 }).notNull().default("sv"),

    // verification
    verification: reviewVerificationEnum("verification").notNull().default("none"),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false), // legacy compat

    // moderation
    status: reviewStatusEnum("status").notNull().default("pending"),
    rejectedReason: text("rejected_reason"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderatedByUserId: uuid("moderated_by_user_id"),
    flagCount: integer("flag_count").notNull().default(0),

    // aggregates (denormalised, updated on vote changes)
    helpfulCount: integer("helpful_count").notNull().default(0),
    notHelpfulCount: integer("not_helpful_count").notNull().default(0),

    // schema.org / SEO
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("pr_store_idx").on(t.storeAccountId),
    productIdx: index("pr_product_idx").on(t.productId),
    statusIdx: index("pr_status_idx").on(t.status),
    vendorIdx: index("pr_vendor_idx").on(t.vendorId),
    customerIdx: index("pr_customer_idx").on(t.customerId),
    invitationIdx: index("pr_invitation_idx").on(t.invitationId),
  }),
);

// ── review_media ──────────────────────────────────────────────────────────────

export const reviewMedia = pgTable(
  "review_media",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    reviewId: uuid("review_id").notNull().references(() => productReviews.id, { onDelete: "cascade" }),
    mediaType: reviewMediaTypeEnum("media_type").notNull(),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewIdx: index("review_media_review_idx").on(t.reviewId),
  }),
);

// ── review_votes ──────────────────────────────────────────────────────────────

export const reviewVotes = pgTable(
  "review_votes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    reviewId: uuid("review_id").notNull().references(() => productReviews.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"),
    ipAddress: varchar("ip_address", { length: 45 }),
    voteType: reviewVoteTypeEnum("vote_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // one vote per customer per review (partial: customer not null)
    uniqueCustomerVote: uniqueIndex("rv_unique_customer_vote")
      .on(t.reviewId, t.customerId)
      .where(sql`customer_id IS NOT NULL`),
    reviewIdx: index("rv_review_idx").on(t.reviewId),
  }),
);

// ── review_replies ────────────────────────────────────────────────────────────

export const reviewReplies = pgTable(
  "review_replies",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    reviewId: uuid("review_id").notNull().references(() => productReviews.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    vendorId: uuid("vendor_id"),                      // set when vendor replies
    authorUserId: uuid("author_user_id"),
    authorType: reviewReplyAuthorEnum("author_type").notNull(),
    body: text("body").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reviewIdx: index("rr_review_idx").on(t.reviewId),
    storeIdx: index("rr_store_idx").on(t.storeAccountId),
  }),
);

// ── review_invitations ────────────────────────────────────────────────────────

export const reviewInvitations = pgTable(
  "review_invitations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    orderId: uuid("order_id").notNull(),
    orderItemId: uuid("order_item_id").notNull(),
    productId: uuid("product_id").notNull(),
    customerId: uuid("customer_id"),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    language: varchar("language", { length: 10 }).notNull().default("sv"),
    token: varchar("token", { length: 64 }).notNull().unique(),
    status: reviewInvitationStatusEnum("status").notNull().default("pending"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), // when to send
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    reviewId: uuid("review_id"),                      // set when review is submitted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("ri_store_idx").on(t.storeAccountId),
    orderItemIdx: index("ri_order_item_idx").on(t.orderItemId),
    tokenIdx: index("ri_token_idx").on(t.token),
    statusIdx: index("ri_status_idx").on(t.status),
    scheduledIdx: index("ri_scheduled_idx").on(t.scheduledAt, t.status),
  }),
);

// ── review_invitation_configs ─────────────────────────────────────────────────
// Per store (+ optional market / language) configuration for automated requests

export const reviewInvitationConfigs = pgTable(
  "review_invitation_configs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    language: varchar("language", { length: 10 }),    // null = all languages
    sendAfterDays: integer("send_after_days").notNull().default(7),
    tokenValidityDays: integer("token_validity_days").notNull().default(30),
    enabled: boolean("enabled").notNull().default(true),
    allowNonPurchaseReviews: boolean("allow_non_purchase_reviews").notNull().default(false),
    // template overrides stored as JSON {subject, body_html, body_text}
    emailTemplate: jsonb("email_template").$type<{
      subject: string;
      bodyHtml: string;
      bodyText: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("ric_store_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductReview = typeof productReviews.$inferSelect;
export type ReviewMedia = typeof reviewMedia.$inferSelect;
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type ReviewReply = typeof reviewReplies.$inferSelect;
export type ReviewInvitation = typeof reviewInvitations.$inferSelect;
export type ReviewInvitationConfig = typeof reviewInvitationConfigs.$inferSelect;
export type ReviewStatus = (typeof reviewStatusEnum.enumValues)[number];
export type ReviewVerification = (typeof reviewVerificationEnum.enumValues)[number];
