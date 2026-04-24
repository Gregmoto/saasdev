import type { Db } from "../../db/client.js";
import {
  affiliates,
  affiliateLinks,
  affiliateClicks,
  affiliateConversions,
  affiliatePayouts,
  orders,
} from "../../db/schema/index.js";
import { eq, and, gt, isNull, sql, desc, lt } from "drizzle-orm";

// ── Helpers ────────────────────────────────────────────────────────────────────

function randomUppercase6(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function generateUniqueCode(db: Db, storeAccountId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `AFF-${randomUppercase6()}`;
    const [existing] = await db
      .select({ id: affiliateLinks.id })
      .from(affiliateLinks)
      .where(
        and(eq(affiliateLinks.storeAccountId, storeAccountId), eq(affiliateLinks.code, code)),
      )
      .limit(1);
    if (!existing) return code;
  }
  throw Object.assign(new Error("Failed to generate unique affiliate code"), { statusCode: 500 });
}

// ── Affiliates (admin) ─────────────────────────────────────────────────────────

export async function createAffiliate(
  db: Db,
  storeAccountId: string,
  data: {
    name: string;
    email: string;
    companyName?: string;
    website?: string;
    commissionType?: "percentage" | "flat";
    commissionValue?: number;
    cookieWindowDays?: number;
    paymentMethod?: string;
    notes?: string;
  },
) {
  // Insert the affiliate
  const insertAff: {
    storeAccountId: string;
    name: string;
    email: string;
    status: "pending";
    companyName?: string;
    website?: string;
    commissionType?: "percentage" | "flat";
    commissionValue?: string;
    cookieWindowDays?: number;
    paymentMethod?: string;
    notes?: string;
  } = {
    storeAccountId,
    name: data.name,
    email: data.email,
    status: "pending",
  };

  if (data.companyName !== undefined) insertAff.companyName = data.companyName;
  if (data.website !== undefined) insertAff.website = data.website;
  if (data.commissionType !== undefined) insertAff.commissionType = data.commissionType;
  if (data.commissionValue !== undefined) insertAff.commissionValue = String(data.commissionValue);
  if (data.cookieWindowDays !== undefined) insertAff.cookieWindowDays = data.cookieWindowDays;
  if (data.paymentMethod !== undefined) insertAff.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) insertAff.notes = data.notes;

  const [affiliate] = await db.insert(affiliates).values(insertAff).returning();
  if (!affiliate) throw Object.assign(new Error("Failed to create affiliate"), { statusCode: 500 });

  // Generate default link
  const code = await generateUniqueCode(db, storeAccountId);
  const [link] = await db
    .insert(affiliateLinks)
    .values({
      affiliateId: affiliate.id,
      storeAccountId,
      code,
      label: "Default",
    })
    .returning();

  return { affiliate, defaultLink: link };
}

export async function listAffiliates(
  db: Db,
  storeAccountId: string,
  opts: { page: number; limit: number; status?: string },
) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(affiliates.storeAccountId, storeAccountId)];
  if (opts.status !== undefined) {
    conditions.push(
      eq(
        affiliates.status,
        opts.status as "pending" | "approved" | "paused" | "rejected" | "terminated",
      ),
    );
  }

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliates)
    .where(whereClause);

  const rows = await db
    .select()
    .from(affiliates)
    .where(whereClause)
    .orderBy(desc(affiliates.createdAt))
    .limit(opts.limit)
    .offset(offset);

  return {
    data: rows,
    total: parseInt(countRow?.count ?? "0", 10),
    page: opts.page,
    limit: opts.limit,
  };
}

export async function getAffiliate(db: Db, id: string, storeAccountId: string) {
  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(and(eq(affiliates.id, id), eq(affiliates.storeAccountId, storeAccountId)))
    .limit(1);

  if (!affiliate) return null;

  const links = await db
    .select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.affiliateId, id))
    .orderBy(desc(affiliateLinks.createdAt));

  const recentConversions = await db
    .select()
    .from(affiliateConversions)
    .where(eq(affiliateConversions.affiliateId, id))
    .orderBy(desc(affiliateConversions.createdAt))
    .limit(5);

  return { ...affiliate, links, recentConversions };
}

export async function updateAffiliate(
  db: Db,
  id: string,
  storeAccountId: string,
  data: {
    name?: string;
    email?: string;
    companyName?: string;
    website?: string;
    commissionType?: "percentage" | "flat";
    commissionValue?: number;
    cookieWindowDays?: number;
    paymentMethod?: string;
    notes?: string;
    status?: "pending" | "approved" | "paused" | "rejected" | "terminated";
  },
) {
  const upd: Partial<typeof affiliates.$inferInsert> = {};
  if (data.name !== undefined) upd.name = data.name;
  if (data.email !== undefined) upd.email = data.email;
  if (data.companyName !== undefined) upd.companyName = data.companyName;
  if (data.website !== undefined) upd.website = data.website;
  if (data.commissionType !== undefined) upd.commissionType = data.commissionType;
  if (data.commissionValue !== undefined) upd.commissionValue = String(data.commissionValue);
  if (data.cookieWindowDays !== undefined) upd.cookieWindowDays = data.cookieWindowDays;
  if (data.paymentMethod !== undefined) upd.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) upd.notes = data.notes;
  if (data.status !== undefined) upd.status = data.status;

  if (Object.keys(upd).length === 0) {
    const existing = await getAffiliate(db, id, storeAccountId);
    return existing;
  }

  upd.updatedAt = new Date();

  const [updated] = await db
    .update(affiliates)
    .set(upd)
    .where(and(eq(affiliates.id, id), eq(affiliates.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function approveAffiliate(
  db: Db,
  id: string,
  storeAccountId: string,
  approvedByUserId: string,
) {
  const [updated] = await db
    .update(affiliates)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedByUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(affiliates.id, id), eq(affiliates.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function rejectAffiliate(db: Db, id: string, storeAccountId: string) {
  const [updated] = await db
    .update(affiliates)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(affiliates.id, id), eq(affiliates.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

// ── Affiliate Links ────────────────────────────────────────────────────────────

export async function createAffiliateLink(
  db: Db,
  storeAccountId: string,
  data: {
    affiliateId: string;
    code: string;
    targetUrl?: string;
    label?: string;
  },
) {
  // Validate affiliate belongs to store
  const [affiliate] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(and(eq(affiliates.id, data.affiliateId), eq(affiliates.storeAccountId, storeAccountId)))
    .limit(1);

  if (!affiliate) {
    throw Object.assign(new Error("Affiliate not found"), { statusCode: 404 });
  }

  // Validate code uniqueness per store
  const [existing] = await db
    .select({ id: affiliateLinks.id })
    .from(affiliateLinks)
    .where(
      and(eq(affiliateLinks.storeAccountId, storeAccountId), eq(affiliateLinks.code, data.code)),
    )
    .limit(1);

  if (existing) {
    throw Object.assign(new Error("Affiliate code already exists for this store"), {
      statusCode: 409,
    });
  }

  const insert: {
    affiliateId: string;
    storeAccountId: string;
    code: string;
    targetUrl?: string;
    label?: string;
  } = {
    affiliateId: data.affiliateId,
    storeAccountId,
    code: data.code,
  };
  if (data.targetUrl !== undefined) insert.targetUrl = data.targetUrl;
  if (data.label !== undefined) insert.label = data.label;

  const [link] = await db.insert(affiliateLinks).values(insert).returning();
  return link;
}

export async function listAffiliateLinks(db: Db, affiliateId: string, storeAccountId: string) {
  return db
    .select()
    .from(affiliateLinks)
    .where(
      and(
        eq(affiliateLinks.affiliateId, affiliateId),
        eq(affiliateLinks.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(desc(affiliateLinks.createdAt));
}

export async function updateAffiliateLink(
  db: Db,
  id: string,
  storeAccountId: string,
  data: {
    targetUrl?: string;
    label?: string;
    enabled?: boolean;
  },
) {
  const upd: Partial<typeof affiliateLinks.$inferInsert> = {};
  if (data.targetUrl !== undefined) upd.targetUrl = data.targetUrl;
  if (data.label !== undefined) upd.label = data.label;
  if (data.enabled !== undefined) upd.enabled = data.enabled;

  if (Object.keys(upd).length === 0) {
    const [existing] = await db
      .select()
      .from(affiliateLinks)
      .where(
        and(eq(affiliateLinks.id, id), eq(affiliateLinks.storeAccountId, storeAccountId)),
      )
      .limit(1);
    return existing ?? null;
  }

  const [updated] = await db
    .update(affiliateLinks)
    .set(upd)
    .where(and(eq(affiliateLinks.id, id), eq(affiliateLinks.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function deleteAffiliateLink(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(affiliateLinks)
    .where(and(eq(affiliateLinks.id, id), eq(affiliateLinks.storeAccountId, storeAccountId)));
}

// ── Click Tracking (PUBLIC) ────────────────────────────────────────────────────

export async function recordClick(
  db: Db,
  storeAccountId: string,
  code: string,
  clickData: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    landingUrl?: string;
  },
) {
  // 1. Look up link by code + storeAccountId, must be enabled
  const [link] = await db
    .select()
    .from(affiliateLinks)
    .where(
      and(
        eq(affiliateLinks.storeAccountId, storeAccountId),
        eq(affiliateLinks.code, code),
        eq(affiliateLinks.enabled, true),
      ),
    )
    .limit(1);

  if (!link) {
    throw Object.assign(new Error("Affiliate link not found or disabled"), { statusCode: 404 });
  }

  // Load affiliate for cookieWindowDays
  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, link.affiliateId))
    .limit(1);

  if (!affiliate) {
    throw Object.assign(new Error("Affiliate not found"), { statusCode: 404 });
  }

  // 2. Insert click
  const cookieExpiresAt = new Date(
    Date.now() + affiliate.cookieWindowDays * 24 * 60 * 60 * 1000,
  );

  const clickInsert: {
    affiliateLinkId: string;
    affiliateId: string;
    storeAccountId: string;
    cookieExpiresAt: Date;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    landingUrl?: string;
  } = {
    affiliateLinkId: link.id,
    affiliateId: affiliate.id,
    storeAccountId,
    cookieExpiresAt,
  };
  if (clickData.sessionId !== undefined) clickInsert.sessionId = clickData.sessionId;
  if (clickData.ipAddress !== undefined) clickInsert.ipAddress = clickData.ipAddress;
  if (clickData.userAgent !== undefined) clickInsert.userAgent = clickData.userAgent;
  if (clickData.referer !== undefined) clickInsert.referer = clickData.referer;
  if (clickData.landingUrl !== undefined) clickInsert.landingUrl = clickData.landingUrl;

  const [click] = await db.insert(affiliateClicks).values(clickInsert).returning();
  if (!click) throw Object.assign(new Error("Failed to record click"), { statusCode: 500 });

  // 3. Increment counters
  await db
    .update(affiliateLinks)
    .set({ clickCount: sql`${affiliateLinks.clickCount} + 1` })
    .where(eq(affiliateLinks.id, link.id));

  await db
    .update(affiliates)
    .set({ totalClickCount: sql`${affiliates.totalClickCount} + 1` })
    .where(eq(affiliates.id, affiliate.id));

  return {
    affiliateId: affiliate.id,
    affiliateLinkId: link.id,
    clickId: click.id,
    cookieExpiresAt,
    targetUrl: link.targetUrl ?? null,
  };
}

// ── Conversion Attribution ─────────────────────────────────────────────────────

export async function attributeOrder(
  db: Db,
  storeAccountId: string,
  orderId: string,
  sessionId?: string,
  affiliateCode?: string,
) {
  const now = new Date();

  // 1. Find active click
  let click: typeof affiliateClicks.$inferSelect | undefined;

  if (sessionId) {
    const [c] = await db
      .select()
      .from(affiliateClicks)
      .where(
        and(
          eq(affiliateClicks.storeAccountId, storeAccountId),
          eq(affiliateClicks.sessionId, sessionId),
          gt(affiliateClicks.cookieExpiresAt, now),
        ),
      )
      .orderBy(desc(affiliateClicks.createdAt))
      .limit(1);
    click = c;
  }

  if (!click && affiliateCode) {
    // Look up link by code
    const [link] = await db
      .select()
      .from(affiliateLinks)
      .where(
        and(
          eq(affiliateLinks.storeAccountId, storeAccountId),
          eq(affiliateLinks.code, affiliateCode),
        ),
      )
      .limit(1);

    if (link) {
      const [c] = await db
        .select()
        .from(affiliateClicks)
        .where(
          and(
            eq(affiliateClicks.affiliateLinkId, link.id),
            eq(affiliateClicks.storeAccountId, storeAccountId),
            gt(affiliateClicks.cookieExpiresAt, now),
          ),
        )
        .orderBy(desc(affiliateClicks.createdAt))
        .limit(1);
      click = c;
    }
  }

  if (!click) return null;

  // 2. Check for existing conversion for orderId
  const [existingConversion] = await db
    .select({ id: affiliateConversions.id })
    .from(affiliateConversions)
    .where(eq(affiliateConversions.orderId, orderId))
    .limit(1);

  if (existingConversion) return null;

  // 3. Load order
  const [order] = await db
    .select({ totalCents: orders.totalCents, customerId: orders.customerId })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });

  // 4. Load affiliate commission config
  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, click.affiliateId))
    .limit(1);

  if (!affiliate) return null;

  // 5. Calculate commission
  const commissionValue = parseFloat(affiliate.commissionValue);
  let commissionCents: number;
  if (affiliate.commissionType === "percentage") {
    commissionCents = Math.round((order.totalCents * commissionValue) / 100);
  } else {
    commissionCents = Math.round(commissionValue);
  }

  // 6. INSERT conversion
  const conversionInsert: {
    storeAccountId: string;
    affiliateId: string;
    affiliateLinkId: string;
    affiliateClickId: string;
    orderId: string;
    orderRevenueCents: number;
    commissionType: "percentage" | "flat";
    commissionValue: string;
    commissionCents: number;
    status: "pending";
    customerId?: string;
  } = {
    storeAccountId,
    affiliateId: click.affiliateId,
    affiliateLinkId: click.affiliateLinkId,
    affiliateClickId: click.id,
    orderId,
    orderRevenueCents: order.totalCents,
    commissionType: affiliate.commissionType,
    commissionValue: affiliate.commissionValue,
    commissionCents,
    status: "pending",
  };
  if (order.customerId !== null && order.customerId !== undefined) {
    conversionInsert.customerId = order.customerId;
  }

  const [conversion] = await db.insert(affiliateConversions).values(conversionInsert).returning();
  if (!conversion)
    throw Object.assign(new Error("Failed to create conversion"), { statusCode: 500 });

  // 7. Mark click as converted
  await db
    .update(affiliateClicks)
    .set({ convertedAt: now })
    .where(eq(affiliateClicks.id, click.id));

  // 8. Increment affiliate stats
  await db
    .update(affiliates)
    .set({
      totalConversionCount: sql`${affiliates.totalConversionCount} + 1`,
      totalRevenueCents: sql`${affiliates.totalRevenueCents} + ${order.totalCents}`,
      totalCommissionCents: sql`${affiliates.totalCommissionCents} + ${commissionCents}`,
    })
    .where(eq(affiliates.id, affiliate.id));

  return conversion;
}

export async function confirmConversion(db: Db, conversionId: string) {
  const [updated] = await db
    .update(affiliateConversions)
    .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(affiliateConversions.id, conversionId))
    .returning();
  return updated ?? null;
}

export async function cancelConversion(db: Db, conversionId: string) {
  const [conversion] = await db
    .select()
    .from(affiliateConversions)
    .where(eq(affiliateConversions.id, conversionId))
    .limit(1);

  if (!conversion) return null;

  const [updated] = await db
    .update(affiliateConversions)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(affiliateConversions.id, conversionId))
    .returning();

  // Reverse affiliate stat increments
  await db
    .update(affiliates)
    .set({
      totalConversionCount: sql`${affiliates.totalConversionCount} - 1`,
      totalRevenueCents: sql`${affiliates.totalRevenueCents} - ${conversion.orderRevenueCents}`,
      totalCommissionCents: sql`${affiliates.totalCommissionCents} - ${conversion.commissionCents}`,
    })
    .where(eq(affiliates.id, conversion.affiliateId));

  return updated ?? null;
}

// ── Conversions (admin) ────────────────────────────────────────────────────────

export async function listConversions(
  db: Db,
  storeAccountId: string,
  opts: {
    page: number;
    limit: number;
    status?: string;
    affiliateId?: string;
  },
) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(affiliateConversions.storeAccountId, storeAccountId)];
  if (opts.status !== undefined) {
    conditions.push(
      eq(
        affiliateConversions.status,
        opts.status as "pending" | "confirmed" | "cancelled" | "paid",
      ),
    );
  }
  if (opts.affiliateId !== undefined) {
    conditions.push(eq(affiliateConversions.affiliateId, opts.affiliateId));
  }

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliateConversions)
    .where(whereClause);

  const rows = await db
    .select()
    .from(affiliateConversions)
    .where(whereClause)
    .orderBy(desc(affiliateConversions.createdAt))
    .limit(opts.limit)
    .offset(offset);

  return {
    data: rows,
    total: parseInt(countRow?.count ?? "0", 10),
    page: opts.page,
    limit: opts.limit,
  };
}

export async function getConversion(db: Db, id: string, storeAccountId: string) {
  const [conversion] = await db
    .select()
    .from(affiliateConversions)
    .where(
      and(eq(affiliateConversions.id, id), eq(affiliateConversions.storeAccountId, storeAccountId)),
    )
    .limit(1);
  return conversion ?? null;
}

// ── Payouts ────────────────────────────────────────────────────────────────────

export async function createPayout(
  db: Db,
  storeAccountId: string,
  data: {
    affiliateId: string;
    amountCents: number;
    paymentMethod?: string;
    notes?: string;
  },
) {
  const insert: {
    storeAccountId: string;
    affiliateId: string;
    amountCents: number;
    status: "pending";
    paymentMethod?: string;
    notes?: string;
  } = {
    storeAccountId,
    affiliateId: data.affiliateId,
    amountCents: data.amountCents,
    status: "pending",
  };
  if (data.paymentMethod !== undefined) insert.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) insert.notes = data.notes;

  const [payout] = await db.insert(affiliatePayouts).values(insert).returning();
  if (!payout) throw Object.assign(new Error("Failed to create payout"), { statusCode: 500 });

  // Link confirmed unpaid conversions
  await db
    .update(affiliateConversions)
    .set({ payoutId: payout.id, status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(affiliateConversions.affiliateId, data.affiliateId),
        eq(affiliateConversions.storeAccountId, storeAccountId),
        eq(affiliateConversions.status, "confirmed"),
        isNull(affiliateConversions.payoutId),
      ),
    );

  return payout;
}

export async function listPayouts(
  db: Db,
  storeAccountId: string,
  opts: {
    page: number;
    limit: number;
    status?: string;
    affiliateId?: string;
  },
) {
  const offset = (opts.page - 1) * opts.limit;
  const conditions = [eq(affiliatePayouts.storeAccountId, storeAccountId)];
  if (opts.status !== undefined) {
    conditions.push(
      eq(
        affiliatePayouts.status,
        opts.status as "pending" | "processing" | "paid" | "failed",
      ),
    );
  }
  if (opts.affiliateId !== undefined) {
    conditions.push(eq(affiliatePayouts.affiliateId, opts.affiliateId));
  }

  const whereClause = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliatePayouts)
    .where(whereClause);

  const rows = await db
    .select()
    .from(affiliatePayouts)
    .where(whereClause)
    .orderBy(desc(affiliatePayouts.createdAt))
    .limit(opts.limit)
    .offset(offset);

  return {
    data: rows,
    total: parseInt(countRow?.count ?? "0", 10),
    page: opts.page,
    limit: opts.limit,
  };
}

export async function updatePayout(
  db: Db,
  id: string,
  storeAccountId: string,
  data: {
    status?: "pending" | "processing" | "paid" | "failed";
    paymentReference?: string;
    paidAt?: string;
    notes?: string;
  },
) {
  const upd: Partial<typeof affiliatePayouts.$inferInsert> = {};
  if (data.status !== undefined) upd.status = data.status;
  if (data.paymentReference !== undefined) upd.paymentReference = data.paymentReference;
  if (data.paidAt !== undefined) upd.paidAt = new Date(data.paidAt);
  if (data.notes !== undefined) upd.notes = data.notes;

  if (Object.keys(upd).length === 0) {
    const [existing] = await db
      .select()
      .from(affiliatePayouts)
      .where(and(eq(affiliatePayouts.id, id), eq(affiliatePayouts.storeAccountId, storeAccountId)))
      .limit(1);
    return existing ?? null;
  }

  upd.updatedAt = new Date();

  const [updated] = await db
    .update(affiliatePayouts)
    .set(upd)
    .where(and(eq(affiliatePayouts.id, id), eq(affiliatePayouts.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function markPayoutPaid(
  db: Db,
  id: string,
  storeAccountId: string,
  paymentReference: string,
) {
  const [payout] = await db
    .select()
    .from(affiliatePayouts)
    .where(and(eq(affiliatePayouts.id, id), eq(affiliatePayouts.storeAccountId, storeAccountId)))
    .limit(1);

  if (!payout) return null;

  const now = new Date();

  const [updated] = await db
    .update(affiliatePayouts)
    .set({
      status: "paid",
      paymentReference,
      paidAt: now,
      updatedAt: now,
    })
    .where(and(eq(affiliatePayouts.id, id), eq(affiliatePayouts.storeAccountId, storeAccountId)))
    .returning();

  if (updated) {
    // Update affiliate total paid out
    await db
      .update(affiliates)
      .set({
        totalPaidOutCents: sql`${affiliates.totalPaidOutCents} + ${payout.amountCents}`,
      })
      .where(eq(affiliates.id, payout.affiliateId));
  }

  return updated ?? null;
}

export async function exportPayouts(
  db: Db,
  storeAccountId: string,
  _format: "csv",
): Promise<string> {
  const rows = await db
    .select({
      payout: affiliatePayouts,
      affiliate: affiliates,
    })
    .from(affiliatePayouts)
    .leftJoin(affiliates, eq(affiliatePayouts.affiliateId, affiliates.id))
    .where(eq(affiliatePayouts.storeAccountId, storeAccountId))
    .orderBy(desc(affiliatePayouts.createdAt));

  const header = "affiliate_name,email,amount,currency,method,reference,paid_at";
  const lines = rows.map((r) => {
    const name = (r.affiliate?.name ?? "").replace(/,/g, " ");
    const email = (r.affiliate?.email ?? "").replace(/,/g, " ");
    const amount = (r.payout.amountCents / 100).toFixed(2);
    const currency = r.payout.currency;
    const method = (r.payout.paymentMethod ?? "").replace(/,/g, " ");
    const reference = (r.payout.paymentReference ?? "").replace(/,/g, " ");
    const paidAt = r.payout.paidAt ? r.payout.paidAt.toISOString() : "";
    return `${name},${email},${amount},${currency},${method},${reference},${paidAt}`;
  });

  return [header, ...lines].join("\n");
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export async function getAffiliateDashboard(
  db: Db,
  storeAccountId: string,
  affiliateId: string,
) {
  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(and(eq(affiliates.id, affiliateId), eq(affiliates.storeAccountId, storeAccountId)))
    .limit(1);

  if (!affiliate) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [pendingCommRow] = await db
    .select({ total: sql<string>`coalesce(sum(commission_cents), 0)` })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.affiliateId, affiliateId),
        eq(affiliateConversions.status, "pending"),
      ),
    );

  const [confirmedCommRow] = await db
    .select({ total: sql<string>`coalesce(sum(commission_cents), 0)` })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.affiliateId, affiliateId),
        eq(affiliateConversions.status, "confirmed"),
      ),
    );

  const [last30ClicksRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliateClicks)
    .where(
      and(
        eq(affiliateClicks.affiliateId, affiliateId),
        gt(affiliateClicks.createdAt, thirtyDaysAgo),
      ),
    );

  const [last30ConvRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.affiliateId, affiliateId),
        gt(affiliateConversions.createdAt, thirtyDaysAgo),
      ),
    );

  const totalClicks = affiliate.totalClickCount;
  const totalConversions = affiliate.totalConversionCount;
  const conversionRate =
    totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;

  return {
    totalClicks,
    totalConversions,
    pendingCommissionCents: parseInt(pendingCommRow?.total ?? "0", 10),
    confirmedCommissionCents: parseInt(confirmedCommRow?.total ?? "0", 10),
    paidOutCents: affiliate.totalPaidOutCents,
    conversionRate,
    last30DaysClicks: parseInt(last30ClicksRow?.count ?? "0", 10),
    last30DaysConversions: parseInt(last30ConvRow?.count ?? "0", 10),
  };
}

export async function getAdminOverview(db: Db, storeAccountId: string) {
  const [totalRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliates)
    .where(eq(affiliates.storeAccountId, storeAccountId));

  const [pendingApprovalRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affiliates)
    .where(
      and(eq(affiliates.storeAccountId, storeAccountId), eq(affiliates.status, "pending")),
    );

  const [pendingCommRow] = await db
    .select({ total: sql<string>`coalesce(sum(commission_cents), 0)` })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.storeAccountId, storeAccountId),
        eq(affiliateConversions.status, "pending"),
      ),
    );

  const [unpaidRow] = await db
    .select({ total: sql<string>`coalesce(sum(commission_cents), 0)` })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.storeAccountId, storeAccountId),
        eq(affiliateConversions.status, "confirmed"),
        isNull(affiliateConversions.payoutId),
      ),
    );

  const top5 = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.storeAccountId, storeAccountId))
    .orderBy(desc(affiliates.totalRevenueCents))
    .limit(5);

  return {
    totalAffiliates: parseInt(totalRow?.count ?? "0", 10),
    pendingApprovals: parseInt(pendingApprovalRow?.count ?? "0", 10),
    totalPendingCommissionCents: parseInt(pendingCommRow?.total ?? "0", 10),
    totalUnpaidCents: parseInt(unpaidRow?.total ?? "0", 10),
    top5Affiliates: top5,
  };
}
