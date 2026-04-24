import { z } from "zod";

// ── Param helpers ─────────────────────────────────────────────────────────────

export const reviewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const replyParamSchema = z.object({
  id: z.string().uuid(),
  replyId: z.string().uuid(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

// ── Review CRUD ───────────────────────────────────────────────────────────────

const mediaItemSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  altText: z.string().max(255).optional(),
  mediaType: z.enum(["image", "video"]),
  sortOrder: z.number().int().min(0).optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().optional(),
  authorName: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  orderItemId: z.string().uuid().optional(),
  invitationToken: z.string().optional(),
  media: z.array(mediaItemSchema).optional(),
});

export const updateReviewSchema = z.object({
  status: z.enum(["pending", "published", "rejected", "flagged", "archived"]).optional(),
  rejectedReason: z.string().optional(),
  title: z.string().max(255).optional(),
  body: z.string().optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["published", "rejected", "archived", "flagged"]),
  rejectedReason: z.string().optional(),
});

export const voteReviewSchema = z.object({
  voteType: z.enum(["helpful", "not_helpful"]),
});

// ── Replies ───────────────────────────────────────────────────────────────────

export const createReplySchema = z.object({
  body: z.string().min(1),
  authorType: z.enum(["vendor", "admin"]),
  vendorId: z.string().uuid().optional(),
});

export const updateReplySchema = z.object({
  body: z.string().min(1),
});

// ── Query / list ──────────────────────────────────────────────────────────────

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "published", "rejected", "flagged", "archived"]).optional(),
  productId: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verification: z.enum(["none", "purchase", "account"]).optional(),
  sort: z.enum(["createdAt", "rating", "helpfulCount"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  vendorId: z.string().uuid().optional(),
});

// ── Invitation config ─────────────────────────────────────────────────────────

export const invitationConfigSchema = z.object({
  sendAfterDays: z.number().int().min(0),
  tokenValidityDays: z.number().int().min(1),
  enabled: z.boolean(),
  allowNonPurchaseReviews: z.boolean(),
  language: z.string().max(10).optional(),
  emailTemplate: z
    .object({
      subject: z.string(),
      bodyHtml: z.string(),
      bodyText: z.string(),
    })
    .optional(),
});

// ── Invitations list query ────────────────────────────────────────────────────

export const listInvitationsQuerySchema = z.object({
  status: z
    .enum(["pending", "sent", "opened", "completed", "expired", "cancelled"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
