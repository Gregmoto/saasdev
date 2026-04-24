import { and, eq, gte, isNull, lte, sql, desc, asc, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  vendorCommissionRules,
  vendorOrders,
  vendorOrderItems,
  commissions,
  vendorSettlements,
  vendorPayouts,
  type VendorCommissionRule,
  type VendorOrder,
  type VendorSettlement,
  type VendorPayout,
  type CommissionType,
} from "../../db/schema/marketplace.js";
import { orders, orderItems } from "../../db/schema/orders.js";
import type { z } from "zod";
import type {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
  updateVendorOrderSchema,
  createSettlementSchema,
  updatePayoutSchema,
  createPayoutSchema,
} from "./schemas.js";

export interface CommissionResult {
  commissionCents: number;
  netAmountCents: number;
  rateValue: number;
  commissionType: CommissionType;
}

// ── Commission Rules ──────────────────────────────────────────────────────────

export async function listCommissionRules(
  db: Db,
  storeAccountId: string,
  opts?: { enabled?: boolean },
): Promise<VendorCommissionRule[]> {
  const conditions = [eq(vendorCommissionRules.storeAccountId, storeAccountId)];
  if (opts?.enabled !== undefined) {
    conditions.push(eq(vendorCommissionRules.enabled, opts.enabled));
  }
  return db
    .select()
    .from(vendorCommissionRules)
    .where(and(...conditions))
    .orderBy(desc(vendorCommissionRules.priority), asc(vendorCommissionRules.createdAt));
}

export async function createCommissionRule(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createCommissionRuleSchema>,
): Promise<VendorCommissionRule> {
  const insert: typeof vendorCommissionRules.$inferInsert = {
    storeAccountId,
    commissionType: data.commissionType,
    value: String(data.value),
  };
  if (data.vendorId !== undefined) insert.vendorId = data.vendorId;
  if (data.productId !== undefined) insert.productId = data.productId;
  if (data.categoryId !== undefined) insert.categoryId = data.categoryId;
  if (data.tiers !== undefined) insert.tiers = data.tiers;
  if (data.minCommissionCents !== undefined) insert.minCommissionCents = data.minCommissionCents;
  if (data.maxCommissionCents !== undefined) insert.maxCommissionCents = data.maxCommissionCents;
  if (data.priority !== undefined) insert.priority = data.priority;
  if (data.enabled !== undefined) insert.enabled = data.enabled;

  const [rule] = await db.insert(vendorCommissionRules).values(insert).returning();
  return rule!;
}

export async function updateCommissionRule(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updateCommissionRuleSchema>,
): Promise<VendorCommissionRule> {
  const upd: Partial<typeof vendorCommissionRules.$inferInsert> = {};
  if (data.vendorId !== undefined) upd.vendorId = data.vendorId;
  if (data.productId !== undefined) upd.productId = data.productId;
  if (data.categoryId !== undefined) upd.categoryId = data.categoryId;
  if (data.commissionType !== undefined) upd.commissionType = data.commissionType;
  if (data.value !== undefined) upd.value = String(data.value);
  if (data.tiers !== undefined) upd.tiers = data.tiers;
  if (data.minCommissionCents !== undefined) upd.minCommissionCents = data.minCommissionCents;
  if (data.maxCommissionCents !== undefined) upd.maxCommissionCents = data.maxCommissionCents;
  if (data.priority !== undefined) upd.priority = data.priority;
  if (data.enabled !== undefined) upd.enabled = data.enabled;
  upd.updatedAt = new Date();

  const [rule] = await db
    .update(vendorCommissionRules)
    .set(upd)
    .where(
      and(
        eq(vendorCommissionRules.id, id),
        eq(vendorCommissionRules.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!rule) throw new Error("Commission rule not found");
  return rule;
}

export async function deleteCommissionRule(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<void> {
  await db
    .delete(vendorCommissionRules)
    .where(
      and(
        eq(vendorCommissionRules.id, id),
        eq(vendorCommissionRules.storeAccountId, storeAccountId),
      ),
    );
}

// ── Commission Calculation ────────────────────────────────────────────────────

/**
 * Finds the best matching commission rule using priority:
 * product-level > category-level > vendor-level > global.
 * Among same specificity, higher priority wins.
 */
export async function resolveCommissionRule(
  db: Db,
  storeAccountId: string,
  vendorId: string,
  productId?: string,
  categoryId?: string,
): Promise<VendorCommissionRule | null> {
  const allRules = await db
    .select()
    .from(vendorCommissionRules)
    .where(
      and(
        eq(vendorCommissionRules.storeAccountId, storeAccountId),
        eq(vendorCommissionRules.enabled, true),
      ),
    )
    .orderBy(desc(vendorCommissionRules.priority));

  // Score specificity: product=3, category=2, vendor=1, global=0
  let bestRule: VendorCommissionRule | null = null;
  let bestScore = -1;

  for (const rule of allRules) {
    // Check if rule applies to this context
    const ruleVendorMatch = rule.vendorId === null || rule.vendorId === vendorId;
    const ruleProductMatch = rule.productId === null || rule.productId === (productId ?? null);
    const ruleCategoryMatch = rule.categoryId === null || rule.categoryId === (categoryId ?? null);

    if (!ruleVendorMatch || !ruleProductMatch || !ruleCategoryMatch) continue;

    // Calculate specificity score
    let score = 0;
    if (rule.productId !== null) score += 4;
    if (rule.categoryId !== null) score += 2;
    if (rule.vendorId !== null) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  return bestRule;
}

/**
 * Pure function — calculates commission from a rule and gross amount.
 */
export function calculateCommission(
  rule: VendorCommissionRule,
  grossAmountCents: number,
): CommissionResult {
  const commissionType = rule.commissionType as CommissionType;
  const rateValue = parseFloat(rule.value);
  let commissionCents = 0;

  if (commissionType === "percentage") {
    commissionCents = Math.round(grossAmountCents * (rateValue / 100));
  } else if (commissionType === "flat") {
    commissionCents = Math.round(rateValue);
  } else if (commissionType === "tiered") {
    const tiers = rule.tiers ?? [];
    // Sort tiers ascending by upToRevenueCents
    const sorted = [...tiers].sort((a, b) => a.upToRevenueCents - b.upToRevenueCents);
    let matchedValue = rateValue; // fallback to rule.value if no tier matches
    for (const tier of sorted) {
      if (grossAmountCents <= tier.upToRevenueCents) {
        matchedValue = tier.value;
        break;
      }
    }
    commissionCents = Math.round(grossAmountCents * (matchedValue / 100));
  }

  // Apply min/max caps
  if (rule.minCommissionCents !== null && rule.minCommissionCents !== undefined) {
    commissionCents = Math.max(commissionCents, rule.minCommissionCents);
  }
  if (rule.maxCommissionCents !== null && rule.maxCommissionCents !== undefined) {
    commissionCents = Math.min(commissionCents, rule.maxCommissionCents);
  }

  const netAmountCents = grossAmountCents - commissionCents;

  return { commissionCents, netAmountCents, rateValue, commissionType };
}

// ── Order Splitting ───────────────────────────────────────────────────────────

export async function splitOrderByVendor(
  db: Db,
  storeAccountId: string,
  orderId: string,
): Promise<VendorOrder[]> {
  // 1. Load order + orderItems
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) throw new Error("Order not found");

  const items = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.storeAccountId, storeAccountId)));

  // 2. Group items by vendorId — items without productId / vendorId concept are skipped
  // We look up the product's vendorId from products table via productId on order items.
  // Since products schema doesn't have a vendorId column, we use productId as vendor grouping key
  // per the schema (the spec says items without vendorId are skipped / belong to store).
  // In practice the caller must have set metadata.vendorId on order items; we read from there.
  const vendorMap = new Map<string, typeof items>();

  for (const item of items) {
    // Try to get vendorId from item metadata
    const meta = item.metadata as Record<string, unknown> | null | undefined;
    const vendorId = (meta?.vendorId as string | undefined) ?? null;
    if (!vendorId) continue; // no vendor association — belongs to store, skip

    const existing = vendorMap.get(vendorId);
    if (existing) {
      existing.push(item);
    } else {
      vendorMap.set(vendorId, [item]);
    }
  }

  const createdOrders: VendorOrder[] = [];
  let vendorIndex = 1;

  for (const [vendorId, vendorItems] of vendorMap.entries()) {
    // a. Generate vendor order number
    const vendorOrderNumber = `${order.orderNumber}-V${vendorIndex}`;
    vendorIndex++;

    // Calculate subtotal from items
    const subtotalCents = vendorItems.reduce((sum, i) => sum + i.totalPriceCents, 0);

    // b. INSERT vendorOrders row (initial, totals will be updated after commission calc)
    const [vendorOrder] = await db
      .insert(vendorOrders)
      .values({
        storeAccountId,
        orderId,
        vendorId,
        orderNumber: vendorOrderNumber,
        status: "pending",
        subtotalCents,
        taxCents: 0,
        shippingCents: 0,
        totalCents: subtotalCents,
        commissionCents: 0,
        netPayoutCents: subtotalCents,
      })
      .returning();

    if (!vendorOrder) throw new Error("Failed to create vendor order");

    let totalCommissionCents = 0;
    let totalNetPayoutCents = 0;

    // c. For each item: resolve commission rule, calculate commission, insert rows
    for (const item of vendorItems) {
      const rule = await resolveCommissionRule(
        db,
        storeAccountId,
        vendorId,
        item.productId ?? undefined,
      );

      let commissionCents = 0;
      let netPayoutCents = item.totalPriceCents;
      let rateValue = 0;
      let commissionType: CommissionType = "percentage";
      let ruleId: string | null = null;

      if (rule) {
        const calc = calculateCommission(rule, item.totalPriceCents);
        commissionCents = calc.commissionCents;
        netPayoutCents = calc.netAmountCents;
        rateValue = calc.rateValue;
        commissionType = calc.commissionType;
        ruleId = rule.id;
      }

      totalCommissionCents += commissionCents;
      totalNetPayoutCents += netPayoutCents;

      // INSERT vendorOrderItems
      const [voItem] = await db
        .insert(vendorOrderItems)
        .values({
          vendorOrderId: vendorOrder.id,
          orderItemId: item.id,
          productId: item.productId ?? vendorId, // fallback — should always have productId
          variantId: item.variantId ?? undefined,
          sku: item.sku ?? undefined,
          name: item.title,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalPriceCents,
          commissionRuleId: ruleId ?? undefined,
          commissionCents,
          netPayoutCents,
        })
        .returning();

      if (!voItem) throw new Error("Failed to create vendor order item");

      // INSERT commissions ledger row
      await db.insert(commissions).values({
        storeAccountId,
        vendorId,
        vendorOrderId: vendorOrder.id,
        vendorOrderItemId: voItem.id,
        commissionRuleId: ruleId ?? undefined,
        commissionType,
        rateValue: String(rateValue),
        grossAmountCents: item.totalPriceCents,
        commissionCents,
        netAmountCents: netPayoutCents,
      });
    }

    // d. UPDATE vendorOrder totals
    await db
      .update(vendorOrders)
      .set({
        commissionCents: totalCommissionCents,
        netPayoutCents: totalNetPayoutCents,
        updatedAt: new Date(),
      })
      .where(eq(vendorOrders.id, vendorOrder.id));

    const [updated] = await db
      .select()
      .from(vendorOrders)
      .where(eq(vendorOrders.id, vendorOrder.id))
      .limit(1);

    createdOrders.push(updated ?? vendorOrder);
  }

  return createdOrders;
}

// ── Vendor Orders ─────────────────────────────────────────────────────────────

export async function listVendorOrders(
  db: Db,
  storeAccountId: string,
  opts: {
    page: number;
    limit: number;
    status?: string;
    vendorId?: string;
  },
): Promise<{ data: VendorOrder[]; total: number; page: number; limit: number }> {
  const conditions = [eq(vendorOrders.storeAccountId, storeAccountId)];
  if (opts.status) {
    conditions.push(
      eq(
        vendorOrders.status,
        opts.status as
          | "pending"
          | "confirmed"
          | "processing"
          | "shipped"
          | "delivered"
          | "cancelled"
          | "refunded",
      ),
    );
  }
  if (opts.vendorId) {
    conditions.push(eq(vendorOrders.vendorId, opts.vendorId));
  }

  const offset = (opts.page - 1) * opts.limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorOrders)
    .where(and(...conditions));

  const data = await db
    .select()
    .from(vendorOrders)
    .where(and(...conditions))
    .orderBy(desc(vendorOrders.createdAt))
    .limit(opts.limit)
    .offset(offset);

  return {
    data,
    total: countResult?.count ?? 0,
    page: opts.page,
    limit: opts.limit,
  };
}

export async function getVendorOrder(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<(VendorOrder & { items: (typeof vendorOrderItems.$inferSelect)[] }) | null> {
  const [order] = await db
    .select()
    .from(vendorOrders)
    .where(and(eq(vendorOrders.id, id), eq(vendorOrders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(vendorOrderItems)
    .where(eq(vendorOrderItems.vendorOrderId, id));

  return { ...order, items };
}

export async function updateVendorOrder(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updateVendorOrderSchema>,
): Promise<VendorOrder> {
  const upd: Partial<typeof vendorOrders.$inferInsert> = {};
  if (data.status !== undefined) upd.status = data.status;
  if (data.trackingNumber !== undefined) upd.trackingNumber = data.trackingNumber;
  if (data.trackingCarrier !== undefined) upd.trackingCarrier = data.trackingCarrier;
  if (data.trackingUrl !== undefined) upd.trackingUrl = data.trackingUrl;

  // Set timestamps based on status transitions
  if (data.status === "shipped") upd.shippedAt = new Date();
  if (data.status === "delivered") upd.deliveredAt = new Date();

  upd.updatedAt = new Date();

  const [updated] = await db
    .update(vendorOrders)
    .set(upd)
    .where(and(eq(vendorOrders.id, id), eq(vendorOrders.storeAccountId, storeAccountId)))
    .returning();

  if (!updated) throw new Error("Vendor order not found");
  return updated;
}

// ── Settlements ───────────────────────────────────────────────────────────────

export async function generateSettlementNumber(db: Db, storeAccountId: string): Promise<string> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorSettlements)
    .where(eq(vendorSettlements.storeAccountId, storeAccountId));

  const count = (result?.count ?? 0) + 1;
  return `SET-${String(count).padStart(4, "0")}`;
}

export async function createSettlement(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createSettlementSchema>,
): Promise<VendorSettlement> {
  const settlementNumber = await generateSettlementNumber(db, storeAccountId);

  // 1. Create settlement row
  const [settlement] = await db
    .insert(vendorSettlements)
    .values({
      storeAccountId,
      vendorId: data.vendorId,
      settlementNumber,
      status: "open",
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      grossRevenueCents: 0,
      totalCommissionCents: 0,
      refundAdjustmentCents: 0,
      netPayoutCents: 0,
    })
    .returning();

  if (!settlement) throw new Error("Failed to create settlement");

  // 2. Aggregate unsettled commissions for this vendor in the period
  const periodCommissions = await db
    .select()
    .from(commissions)
    .where(
      and(
        eq(commissions.storeAccountId, storeAccountId),
        eq(commissions.vendorId, data.vendorId),
        isNull(commissions.settlementId),
        gte(commissions.createdAt, new Date(data.periodStart)),
        lte(commissions.createdAt, new Date(data.periodEnd)),
      ),
    );

  const grossRevenueCents = periodCommissions.reduce((s, c) => s + c.grossAmountCents, 0);
  const totalCommissionCents = periodCommissions.reduce((s, c) => s + c.commissionCents, 0);
  const netPayoutCents = grossRevenueCents - totalCommissionCents;

  // Update settlement totals
  const [updatedSettlement] = await db
    .update(vendorSettlements)
    .set({
      grossRevenueCents,
      totalCommissionCents,
      netPayoutCents,
      updatedAt: new Date(),
    })
    .where(eq(vendorSettlements.id, settlement.id))
    .returning();

  // 3. Link commissions to this settlement
  if (periodCommissions.length > 0) {
    const commissionIds = periodCommissions.map((c) => c.id);
    await db
      .update(commissions)
      .set({ settlementId: settlement.id })
      .where(inArray(commissions.id, commissionIds));
  }

  return updatedSettlement ?? settlement;
}

export async function listSettlements(
  db: Db,
  storeAccountId: string,
  opts?: { status?: string; vendorId?: string },
): Promise<VendorSettlement[]> {
  const conditions = [eq(vendorSettlements.storeAccountId, storeAccountId)];
  if (opts?.status) {
    conditions.push(
      eq(vendorSettlements.status, opts.status as "open" | "closed" | "paid"),
    );
  }
  if (opts?.vendorId) {
    conditions.push(eq(vendorSettlements.vendorId, opts.vendorId));
  }

  return db
    .select()
    .from(vendorSettlements)
    .where(and(...conditions))
    .orderBy(desc(vendorSettlements.createdAt));
}

export async function getSettlement(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<(VendorSettlement & { commissions: (typeof commissions.$inferSelect)[] }) | null> {
  const [settlement] = await db
    .select()
    .from(vendorSettlements)
    .where(
      and(eq(vendorSettlements.id, id), eq(vendorSettlements.storeAccountId, storeAccountId)),
    )
    .limit(1);

  if (!settlement) return null;

  const linkedCommissions = await db
    .select()
    .from(commissions)
    .where(eq(commissions.settlementId, id));

  return { ...settlement, commissions: linkedCommissions };
}

export async function closeSettlement(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<VendorSettlement> {
  const [updated] = await db
    .update(vendorSettlements)
    .set({
      status: "closed",
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(vendorSettlements.id, id), eq(vendorSettlements.storeAccountId, storeAccountId)),
    )
    .returning();

  if (!updated) throw new Error("Settlement not found");
  return updated;
}

// ── Payouts ───────────────────────────────────────────────────────────────────

export async function createPayout(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createPayoutSchema>,
): Promise<VendorPayout> {
  const insert: typeof vendorPayouts.$inferInsert = {
    storeAccountId,
    vendorId: data.vendorId,
    amountCents: data.amountCents,
    status: "pending",
    currency: "SEK",
  };
  if (data.settlementId !== undefined) insert.settlementId = data.settlementId;
  if (data.paymentMethod !== undefined) insert.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) insert.notes = data.notes;

  const [payout] = await db.insert(vendorPayouts).values(insert).returning();
  if (!payout) throw new Error("Failed to create payout");

  // If linked to a settlement, mark settlement as paid
  if (data.settlementId) {
    await db
      .update(vendorSettlements)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(vendorSettlements.id, data.settlementId));
  }

  return payout;
}

export async function listPayouts(
  db: Db,
  storeAccountId: string,
  opts?: { page?: number; limit?: number; status?: string; vendorId?: string },
): Promise<{ data: VendorPayout[]; total: number; page: number; limit: number }> {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(vendorPayouts.storeAccountId, storeAccountId)];
  if (opts?.status) {
    conditions.push(
      eq(vendorPayouts.status, opts.status as "pending" | "processing" | "paid" | "failed"),
    );
  }
  if (opts?.vendorId) {
    conditions.push(eq(vendorPayouts.vendorId, opts.vendorId));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorPayouts)
    .where(and(...conditions));

  const data = await db
    .select()
    .from(vendorPayouts)
    .where(and(...conditions))
    .orderBy(desc(vendorPayouts.createdAt))
    .limit(limit)
    .offset(offset);

  return { data, total: countResult?.count ?? 0, page, limit };
}

export async function updatePayout(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updatePayoutSchema>,
): Promise<VendorPayout> {
  const upd: Partial<typeof vendorPayouts.$inferInsert> = {};
  if (data.status !== undefined) upd.status = data.status;
  if (data.paymentReference !== undefined) upd.paymentReference = data.paymentReference;
  if (data.paidAt !== undefined) upd.paidAt = new Date(data.paidAt);
  if (data.notes !== undefined) upd.notes = data.notes;
  upd.updatedAt = new Date();

  const [updated] = await db
    .update(vendorPayouts)
    .set(upd)
    .where(and(eq(vendorPayouts.id, id), eq(vendorPayouts.storeAccountId, storeAccountId)))
    .returning();

  if (!updated) throw new Error("Payout not found");
  return updated;
}

export async function exportPayouts(
  db: Db,
  storeAccountId: string,
  format: "csv" | "bgmax",
  statusFilter?: string,
): Promise<string> {
  const conditions = [eq(vendorPayouts.storeAccountId, storeAccountId)];
  if (statusFilter) {
    conditions.push(
      eq(vendorPayouts.status, statusFilter as "pending" | "processing" | "paid" | "failed"),
    );
  }

  const rows = await db
    .select()
    .from(vendorPayouts)
    .where(and(...conditions))
    .orderBy(asc(vendorPayouts.createdAt));

  if (format === "csv") {
    const header = "vendorId,amount,currency,method,reference,paidAt";
    const lines = rows.map((p) => {
      const amount = (p.amountCents / 100).toFixed(2);
      const method = p.paymentMethod ?? "";
      const reference = p.paymentReference ?? "";
      const paidAt = p.paidAt ? p.paidAt.toISOString() : "";
      return `${p.vendorId},${amount},${p.currency},${method},${reference},${paidAt}`;
    });
    return [header, ...lines].join("\n");
  }

  // BgMax format (simplified Swedish bank giro batch)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const lines: string[] = [];

  // Header record
  lines.push(`01BGMAX               ${today}0100`);

  // Detail records
  for (const p of rows) {
    // BgMax detail: record type 20, amount in öre (cents), reference
    const amountStr = String(p.amountCents).padStart(12, "0");
    const ref = (p.paymentReference ?? p.id).slice(0, 16).padEnd(16, " ");
    lines.push(`20${p.vendorId.replace(/-/g, "").slice(0, 10).padEnd(10, "0")}${amountStr}${ref}`);
  }

  // Footer
  const totalAmount = rows.reduce((s, p) => s + p.amountCents, 0);
  lines.push(`70${String(rows.length).padStart(8, "0")}${String(totalAmount).padStart(12, "0")}`);

  return lines.join("\n");
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface VendorDashboard {
  pendingOrders: number;
  openSettlements: number;
  pendingPayoutsCents: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  last30DaysRevenueCents: number;
}

export async function getVendorDashboard(
  db: Db,
  storeAccountId: string,
  vendorId: string,
): Promise<VendorDashboard> {
  const vendorConditions = [
    eq(vendorOrders.storeAccountId, storeAccountId),
    eq(vendorOrders.vendorId, vendorId),
  ];

  // Pending orders count
  const [pendingOrdersResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorOrders)
    .where(and(...vendorConditions, eq(vendorOrders.status, "pending")));

  // Open settlements count
  const [openSettlementsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vendorSettlements)
    .where(
      and(
        eq(vendorSettlements.storeAccountId, storeAccountId),
        eq(vendorSettlements.vendorId, vendorId),
        eq(vendorSettlements.status, "open"),
      ),
    );

  // Pending payouts total
  const [pendingPayoutsResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount_cents), 0)::int` })
    .from(vendorPayouts)
    .where(
      and(
        eq(vendorPayouts.storeAccountId, storeAccountId),
        eq(vendorPayouts.vendorId, vendorId),
        eq(vendorPayouts.status, "pending"),
      ),
    );

  // Total revenue + commission from commissions ledger
  const [totalsResult] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(gross_amount_cents), 0)::int`,
      totalCommission: sql<number>`coalesce(sum(commission_cents), 0)::int`,
    })
    .from(commissions)
    .where(
      and(
        eq(commissions.storeAccountId, storeAccountId),
        eq(commissions.vendorId, vendorId),
      ),
    );

  // Last 30 days revenue
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [last30Result] = await db
    .select({ total: sql<number>`coalesce(sum(gross_amount_cents), 0)::int` })
    .from(commissions)
    .where(
      and(
        eq(commissions.storeAccountId, storeAccountId),
        eq(commissions.vendorId, vendorId),
        gte(commissions.createdAt, thirtyDaysAgo),
      ),
    );

  return {
    pendingOrders: pendingOrdersResult?.count ?? 0,
    openSettlements: openSettlementsResult?.count ?? 0,
    pendingPayoutsCents: pendingPayoutsResult?.total ?? 0,
    totalRevenueCents: totalsResult?.totalRevenue ?? 0,
    totalCommissionCents: totalsResult?.totalCommission ?? 0,
    last30DaysRevenueCents: last30Result?.total ?? 0,
  };
}
