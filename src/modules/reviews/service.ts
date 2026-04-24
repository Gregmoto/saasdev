import { randomBytes } from "node:crypto";
import {
  and,
  eq,
  desc,
  asc,
  count,
  sql,
  lt,
  lte,
  inArray,
  gte,
} from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  productReviews,
  reviewMedia,
  reviewVotes,
  reviewReplies,
  reviewInvitations,
  reviewInvitationConfigs,
} from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  createReviewSchema,
  updateReviewSchema,
  moderateReviewSchema,
  voteReviewSchema,
  createReplySchema,
  updateReplySchema,
  reviewQuerySchema,
  invitationConfigSchema,
  listInvitationsQuerySchema,
} from "./schemas.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type CreateReviewData = z.infer<typeof createReviewSchema>;
type UpdateReviewData = z.infer<typeof updateReviewSchema>;
type ModerateReviewData = z.infer<typeof moderateReviewSchema>;
type VoteReviewData = z.infer<typeof voteReviewSchema>;
type CreateReplyData = z.infer<typeof createReplySchema>;
type UpdateReplyData = z.infer<typeof updateReplySchema>;
type ReviewQueryOpts = z.infer<typeof reviewQuerySchema>;
type InvitationConfigData = z.infer<typeof invitationConfigSchema>;
type ListInvitationsQueryOpts = z.infer<typeof listInvitationsQuerySchema>;

// ── Review CRUD ───────────────────────────────────────────────────────────────

export async function createReview(
  db: Db,
  storeAccountId: string,
  customerId: string | null,
  ipAddress: string,
  data: CreateReviewData,
) {
  // 1. Invitation token flow
  let invitationId: string | undefined;
  let verification: "none" | "purchase" | "account" = "none";
  let verifiedPurchase = false;

  if (data.invitationToken !== undefined) {
    const [invitation] = await db
      .select()
      .from(reviewInvitations)
      .where(
        and(
          eq(reviewInvitations.token, data.invitationToken),
          eq(reviewInvitations.storeAccountId, storeAccountId),
          eq(reviewInvitations.status, "pending"),
        ),
      )
      .limit(1);

    if (!invitation) {
      const err = Object.assign(new Error("Invalid or expired invitation token"), {
        statusCode: 400,
      });
      throw err;
    }

    if (invitation.expiresAt < new Date()) {
      const err = Object.assign(new Error("Invitation token has expired"), {
        statusCode: 400,
      });
      throw err;
    }

    // Mark invitation completed
    await db
      .update(reviewInvitations)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(reviewInvitations.id, invitation.id));

    invitationId = invitation.id;
    verification = "purchase";
    verifiedPurchase = true;
  } else {
    // 2. Check allowNonPurchaseReviews config
    const cfg = await getInvitationConfig(db, storeAccountId);
    if (!cfg.allowNonPurchaseReviews) {
      const err = Object.assign(
        new Error("Only verified purchase reviews are accepted for this store"),
        { statusCode: 403 },
      );
      throw err;
    }
    if (customerId !== null) {
      verification = "account";
    }
  }

  // 3. Anti-spam: max 3 reviews per IP per 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [spamCount] = await db
    .select({ value: count() })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.storeAccountId, storeAccountId),
        eq(productReviews.ipAddress, ipAddress),
        gte(productReviews.createdAt, oneDayAgo),
      ),
    );

  if (Number(spamCount?.value ?? 0) > 3) {
    const err = Object.assign(
      new Error("Too many reviews submitted from this IP address"),
      { statusCode: 429 },
    );
    throw err;
  }

  // 4. Duplicate detection
  if (customerId !== null) {
    const [existing] = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeAccountId, storeAccountId),
          eq(productReviews.customerId, customerId),
          eq(productReviews.productId, data.productId),
        ),
      )
      .limit(1);

    if (existing) {
      const err = Object.assign(
        new Error("You have already reviewed this product"),
        { statusCode: 409 },
      );
      throw err;
    }
  }

  // 5. Insert review
  const insertValues: typeof productReviews.$inferInsert = {
    storeAccountId,
    productId: data.productId,
    rating: data.rating,
    verification,
    verifiedPurchase,
    status: "pending",
    ipAddress,
  };
  if (customerId !== null) insertValues.customerId = customerId;
  if (data.title !== undefined) insertValues.title = data.title;
  if (data.body !== undefined) insertValues.body = data.body;
  if (data.authorName !== undefined) insertValues.authorName = data.authorName;
  if (data.language !== undefined) insertValues.language = data.language;
  if (data.variantId !== undefined) insertValues.variantId = data.variantId;
  if (data.orderId !== undefined) insertValues.orderId = data.orderId;
  if (data.orderItemId !== undefined) insertValues.orderItemId = data.orderItemId;
  if (invitationId !== undefined) insertValues.invitationId = invitationId;

  const [review] = await db
    .insert(productReviews)
    .values(insertValues)
    .returning();

  if (!review) throw new Error("Failed to insert review");

  // 6. Insert media
  let media: (typeof reviewMedia.$inferSelect)[] = [];
  if (data.media && data.media.length > 0) {
    const mediaValues = data.media.map((m) => {
      const mv: typeof reviewMedia.$inferInsert = {
        reviewId: review.id,
        mediaType: m.mediaType,
        url: m.url,
      };
      if (m.thumbnailUrl !== undefined) mv.thumbnailUrl = m.thumbnailUrl;
      if (m.altText !== undefined) mv.altText = m.altText;
      if (m.sortOrder !== undefined) mv.sortOrder = m.sortOrder;
      return mv;
    });
    media = await db.insert(reviewMedia).values(mediaValues).returning();
  }

  return { ...review, media };
}

export async function listReviews(
  db: Db,
  storeAccountId: string,
  opts: ReviewQueryOpts,
) {
  const { page, limit, status, productId, rating, verification, sort, order, vendorId } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(productReviews.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(productReviews.status, status));
  if (productId !== undefined) conditions.push(eq(productReviews.productId, productId));
  if (rating !== undefined) conditions.push(eq(productReviews.rating, rating));
  if (verification !== undefined) conditions.push(eq(productReviews.verification, verification));
  if (vendorId !== undefined) conditions.push(eq(productReviews.vendorId, vendorId));

  const where = and(...conditions);

  let orderCol: typeof productReviews.createdAt | typeof productReviews.rating | typeof productReviews.helpfulCount;
  if (sort === "rating") {
    orderCol = productReviews.rating;
  } else if (sort === "helpfulCount") {
    orderCol = productReviews.helpfulCount;
  } else {
    orderCol = productReviews.createdAt;
  }

  const orderDir = order === "asc" ? asc(orderCol) : desc(orderCol);

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(productReviews)
      .where(where)
      .orderBy(orderDir)
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(productReviews).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReview(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [review] = await db
    .select()
    .from(productReviews)
    .where(
      and(
        eq(productReviews.id, id),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!review) return null;

  const [media, replies, votes] = await Promise.all([
    db.select().from(reviewMedia).where(eq(reviewMedia.reviewId, id)),
    db
      .select()
      .from(reviewReplies)
      .where(
        and(
          eq(reviewReplies.reviewId, id),
          eq(reviewReplies.storeAccountId, storeAccountId),
        ),
      ),
    db
      .select({
        voteType: reviewVotes.voteType,
        voteCount: count(),
      })
      .from(reviewVotes)
      .where(eq(reviewVotes.reviewId, id))
      .groupBy(reviewVotes.voteType),
  ]);

  const voteCounts = { helpful: 0, not_helpful: 0 };
  for (const v of votes) {
    voteCounts[v.voteType] = Number(v.voteCount);
  }

  return { ...review, media, replies, voteCounts };
}

export async function updateReview(
  db: Db,
  id: string,
  storeAccountId: string,
  data: UpdateReviewData,
) {
  const upd: Partial<typeof productReviews.$inferInsert> = {};
  if (data.status !== undefined) upd.status = data.status;
  if (data.rejectedReason !== undefined) upd.rejectedReason = data.rejectedReason;
  if (data.title !== undefined) upd.title = data.title;
  if (data.body !== undefined) upd.body = data.body;
  upd.updatedAt = new Date();

  const [updated] = await db
    .update(productReviews)
    .set(upd)
    .where(
      and(
        eq(productReviews.id, id),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function moderateReview(
  db: Db,
  id: string,
  storeAccountId: string,
  moderatorUserId: string,
  data: ModerateReviewData,
) {
  const upd: Partial<typeof productReviews.$inferInsert> = {
    status: data.status,
    moderatedAt: new Date(),
    moderatedByUserId: moderatorUserId,
    updatedAt: new Date(),
  };
  if (data.rejectedReason !== undefined) upd.rejectedReason = data.rejectedReason;
  if (data.status === "published") upd.publishedAt = new Date();

  const [updated] = await db
    .update(productReviews)
    .set(upd)
    .where(
      and(
        eq(productReviews.id, id),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function deleteReview(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(productReviews)
    .where(
      and(
        eq(productReviews.id, id),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: productReviews.id });
  return rows.length > 0;
}

export async function flagReview(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  // Increment flag_count
  const [updated] = await db
    .update(productReviews)
    .set({
      flagCount: sql`${productReviews.flagCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productReviews.id, id),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) return null;

  // If flag_count > 5 set status = flagged
  if (updated.flagCount > 5 && updated.status !== "flagged") {
    const [flagged] = await db
      .update(productReviews)
      .set({ status: "flagged", updatedAt: new Date() })
      .where(eq(productReviews.id, id))
      .returning();
    return flagged ?? null;
  }

  return updated;
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export async function voteReview(
  db: Db,
  reviewId: string,
  storeAccountId: string,
  customerId: string | null,
  ipAddress: string,
  voteType: VoteReviewData["voteType"],
) {
  // Verify review belongs to this store
  const [review] = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.id, reviewId),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!review) {
    const err = Object.assign(new Error("Review not found"), { statusCode: 404 });
    throw err;
  }

  if (customerId !== null) {
    // Upsert by customer: delete existing then insert
    await db
      .delete(reviewVotes)
      .where(
        and(
          eq(reviewVotes.reviewId, reviewId),
          eq(reviewVotes.customerId, customerId),
        ),
      );

    await db.insert(reviewVotes).values({
      reviewId,
      customerId,
      ipAddress,
      voteType,
    });
  } else {
    // Anonymous: just insert (no upsert possible without customer)
    await db.insert(reviewVotes).values({
      reviewId,
      ipAddress,
      voteType,
    });
  }

  // Recount
  const counts = await db
    .select({
      voteType: reviewVotes.voteType,
      voteCount: count(),
    })
    .from(reviewVotes)
    .where(eq(reviewVotes.reviewId, reviewId))
    .groupBy(reviewVotes.voteType);

  const helpfulCount = Number(
    counts.find((c) => c.voteType === "helpful")?.voteCount ?? 0,
  );
  const notHelpfulCount = Number(
    counts.find((c) => c.voteType === "not_helpful")?.voteCount ?? 0,
  );

  await db
    .update(productReviews)
    .set({ helpfulCount, notHelpfulCount, updatedAt: new Date() })
    .where(eq(productReviews.id, reviewId));

  return { helpfulCount, notHelpfulCount };
}

// ── Replies ───────────────────────────────────────────────────────────────────

export async function createReply(
  db: Db,
  reviewId: string,
  storeAccountId: string,
  authorUserId: string,
  data: CreateReplyData,
) {
  // Verify review belongs to this store
  const [review] = await db
    .select({ id: productReviews.id, vendorId: productReviews.vendorId })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.id, reviewId),
        eq(productReviews.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!review) {
    const err = Object.assign(new Error("Review not found"), { statusCode: 404 });
    throw err;
  }

  // Vendor can only reply to reviews on their products
  if (
    data.authorType === "vendor" &&
    data.vendorId !== undefined &&
    review.vendorId !== null &&
    data.vendorId !== review.vendorId
  ) {
    const err = Object.assign(
      new Error("Vendor cannot reply to reviews on products they do not own"),
      { statusCode: 403 },
    );
    throw err;
  }

  const insertValues: typeof reviewReplies.$inferInsert = {
    reviewId,
    storeAccountId,
    authorUserId,
    authorType: data.authorType,
    body: data.body,
  };
  if (data.vendorId !== undefined) insertValues.vendorId = data.vendorId;

  const [reply] = await db.insert(reviewReplies).values(insertValues).returning();
  return reply ?? null;
}

export async function updateReply(
  db: Db,
  replyId: string,
  storeAccountId: string,
  data: UpdateReplyData,
) {
  const [updated] = await db
    .update(reviewReplies)
    .set({ body: data.body, updatedAt: new Date() })
    .where(
      and(
        eq(reviewReplies.id, replyId),
        eq(reviewReplies.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function deleteReply(
  db: Db,
  replyId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(reviewReplies)
    .where(
      and(
        eq(reviewReplies.id, replyId),
        eq(reviewReplies.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: reviewReplies.id });
  return rows.length > 0;
}

// ── Invitations ───────────────────────────────────────────────────────────────

export async function createInvitations(
  db: Db,
  storeAccountId: string,
  orderId: string,
) {
  // Fetch order items via raw join-free query — avoid cross-module schema import
  // by querying through the already-imported reviewInvitations-compatible types.
  // We use dynamic import of the orders schema here to avoid circular deps.
  const { orderItems, orders } = await import("../../db/schema/index.js");

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!order) {
    const err = Object.assign(new Error("Order not found"), { statusCode: 404 });
    throw err;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.storeAccountId, storeAccountId),
      ),
    );

  const cfg = await getInvitationConfig(db, storeAccountId);
  const { sendAfterDays, tokenValidityDays } = cfg;

  const customerEmail = order.customerEmail ?? "";
  if (!customerEmail) {
    throw Object.assign(new Error("Order has no customer email"), { statusCode: 422 });
  }

  const created = [];
  for (const item of items) {
    if (!item.productId) continue;

    const scheduledAt = new Date(Date.now() + sendAfterDays * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(
      scheduledAt.getTime() + tokenValidityDays * 24 * 60 * 60 * 1000,
    );
    const token = randomBytes(32).toString("hex");

    const insertValues: typeof reviewInvitations.$inferInsert = {
      storeAccountId,
      orderId,
      orderItemId: item.id,
      productId: item.productId,
      customerEmail,
      token,
      scheduledAt,
      expiresAt,
    };
    if (order.customerId !== null && order.customerId !== undefined) {
      insertValues.customerId = order.customerId;
    }

    const [inv] = await db.insert(reviewInvitations).values(insertValues).returning();
    if (inv) created.push(inv);
  }

  return created;
}

export async function processDueInvitations(
  db: Db,
  storeAccountId?: string,
) {
  const now = new Date();
  const conditions = [
    eq(reviewInvitations.status, "pending"),
    lte(reviewInvitations.scheduledAt, now),
  ];
  if (storeAccountId !== undefined) {
    conditions.push(eq(reviewInvitations.storeAccountId, storeAccountId));
  }

  const due = await db
    .select()
    .from(reviewInvitations)
    .where(and(...conditions));

  for (const inv of due) {
    // Stub: log to console
    console.log(
      `[ReviewInvitations] Sending invitation ${inv.id} to ${inv.customerEmail} for product ${inv.productId}`,
    );

    await db
      .update(reviewInvitations)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(reviewInvitations.id, inv.id));
  }

  return due.length;
}

export async function expireOldInvitations(db: Db) {
  const now = new Date();
  const rows = await db
    .update(reviewInvitations)
    .set({ status: "expired" })
    .where(
      and(
        inArray(reviewInvitations.status, ["pending", "sent"]),
        lt(reviewInvitations.expiresAt, now),
      ),
    )
    .returning({ id: reviewInvitations.id });
  return rows.length;
}

export async function getInvitationByToken(db: Db, token: string) {
  const [inv] = await db
    .select()
    .from(reviewInvitations)
    .where(eq(reviewInvitations.token, token))
    .limit(1);
  return inv ?? null;
}

export async function listInvitations(
  db: Db,
  storeAccountId: string,
  opts: ListInvitationsQueryOpts,
) {
  const { page, limit, status } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(reviewInvitations.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(reviewInvitations.status, status));

  const where = and(...conditions);

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(reviewInvitations)
      .where(where)
      .orderBy(desc(reviewInvitations.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(reviewInvitations).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Invitation config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  sendAfterDays: 7,
  tokenValidityDays: 30,
  enabled: true,
  allowNonPurchaseReviews: false,
};

export async function upsertInvitationConfig(
  db: Db,
  storeAccountId: string,
  shopId: string | null,
  data: InvitationConfigData,
) {
  const conditions = [eq(reviewInvitationConfigs.storeAccountId, storeAccountId)];
  if (shopId !== null) {
    conditions.push(eq(reviewInvitationConfigs.shopId, shopId));
  }

  const [existing] = await db
    .select({ id: reviewInvitationConfigs.id })
    .from(reviewInvitationConfigs)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    const upd: Partial<typeof reviewInvitationConfigs.$inferInsert> = {
      sendAfterDays: data.sendAfterDays,
      tokenValidityDays: data.tokenValidityDays,
      enabled: data.enabled,
      allowNonPurchaseReviews: data.allowNonPurchaseReviews,
      updatedAt: new Date(),
    };
    if (data.language !== undefined) upd.language = data.language;
    if (data.emailTemplate !== undefined) upd.emailTemplate = data.emailTemplate;

    const [updated] = await db
      .update(reviewInvitationConfigs)
      .set(upd)
      .where(eq(reviewInvitationConfigs.id, existing.id))
      .returning();
    return updated ?? null;
  }

  const insertValues: typeof reviewInvitationConfigs.$inferInsert = {
    storeAccountId,
    sendAfterDays: data.sendAfterDays,
    tokenValidityDays: data.tokenValidityDays,
    enabled: data.enabled,
    allowNonPurchaseReviews: data.allowNonPurchaseReviews,
  };
  if (shopId !== null) insertValues.shopId = shopId;
  if (data.language !== undefined) insertValues.language = data.language;
  if (data.emailTemplate !== undefined) insertValues.emailTemplate = data.emailTemplate;

  const [inserted] = await db
    .insert(reviewInvitationConfigs)
    .values(insertValues)
    .returning();
  return inserted ?? null;
}

export async function getInvitationConfig(
  db: Db,
  storeAccountId: string,
  shopId?: string,
) {
  const conditions = [eq(reviewInvitationConfigs.storeAccountId, storeAccountId)];
  if (shopId !== undefined) {
    conditions.push(eq(reviewInvitationConfigs.shopId, shopId));
  }

  const [cfg] = await db
    .select()
    .from(reviewInvitationConfigs)
    .where(and(...conditions))
    .limit(1);

  if (cfg) return cfg;

  return {
    ...DEFAULT_CONFIG,
    storeAccountId,
    shopId: shopId ?? null,
    language: null,
    emailTemplate: null,
  };
}

// ── Schema.org JSON-LD ────────────────────────────────────────────────────────

export async function buildSchemaOrgAggregate(
  db: Db,
  storeAccountId: string,
  productId: string,
) {
  const [result] = await db
    .select({
      avgRating: sql<string>`AVG(${productReviews.rating})`,
      reviewCount: count(),
    })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.storeAccountId, storeAccountId),
        eq(productReviews.productId, productId),
        eq(productReviews.status, "published"),
      ),
    );

  const ratingValue = result ? parseFloat(result.avgRating ?? "0") : 0;
  const reviewCount = result ? Number(result.reviewCount) : 0;

  return {
    "@type": "AggregateRating",
    ratingValue: Math.round(ratingValue * 10) / 10,
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export function buildSchemaOrgReview(review: {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}) {
  return {
    "@type": "Review",
    "@id": review.id,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    name: review.title ?? undefined,
    reviewBody: review.body ?? undefined,
    author: {
      "@type": "Person",
      name: review.authorName ?? "Anonymous",
    },
    datePublished: (review.publishedAt ?? review.createdAt).toISOString(),
  };
}
