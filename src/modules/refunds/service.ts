import type { Db } from "../../db/client.js";
import {
  refunds,
  refundItems,
  refundAuditLog,
  orders,
  payments,
  paymentProviders,
} from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { getStripeClient } from "../payments/stripe.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type RefundMethod =
  | "original_payment"
  | "manual_bank"
  | "manual_cash"
  | "store_credit"
  | "other";

type RefundStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";

// ── calculateOrderRefundTotal ─────────────────────────────────────────────────

export async function calculateOrderRefundTotal(
  db: Db,
  orderId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${refunds.amountCents}), 0)` })
    .from(refunds)
    .where(and(eq(refunds.orderId, orderId), eq(refunds.status, "succeeded")));
  return parseInt(row?.total ?? "0", 10);
}

// ── updateOrderPaymentStatus ──────────────────────────────────────────────────

export async function updateOrderPaymentStatus(
  db: Db,
  orderId: string,
  storeAccountId: string,
): Promise<void> {
  const [order] = await db
    .select({ totalCents: orders.totalCents })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) return;

  const totalRefunded = await calculateOrderRefundTotal(db, orderId);

  if (totalRefunded >= order.totalCents) {
    await db
      .update(orders)
      .set({ paymentStatus: "refunded", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  } else if (totalRefunded > 0) {
    await db
      .update(orders)
      .set({ paymentStatus: "partially_refunded", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }
  // else: no change
}

// ── processProviderRefund ─────────────────────────────────────────────────────

export async function processProviderRefund(
  db: Db,
  refundId: string,
  storeAccountId: string,
): Promise<void> {
  // 1. Load refund + payment + paymentProvider
  const [refund] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.storeAccountId, storeAccountId)))
    .limit(1);

  if (!refund || !refund.paymentId) {
    await db
      .update(refunds)
      .set({ status: "failed", failedAt: new Date(), failureReason: "Payment not found", updatedAt: new Date() })
      .where(eq(refunds.id, refundId));
    await db.insert(refundAuditLog).values({
      storeAccountId,
      refundId,
      action: "failed",
      fromStatus: "pending",
      toStatus: "failed",
      notes: "Payment not found",
    });
    return;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, refund.paymentId), eq(payments.storeAccountId, storeAccountId)))
    .limit(1);

  if (!payment) {
    await db
      .update(refunds)
      .set({ status: "failed", failedAt: new Date(), failureReason: "Payment record not found", updatedAt: new Date() })
      .where(eq(refunds.id, refundId));
    await db.insert(refundAuditLog).values({
      storeAccountId,
      refundId,
      action: "failed",
      fromStatus: "pending",
      toStatus: "failed",
      notes: "Payment record not found",
    });
    return;
  }

  const [provider] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.id, payment.providerId),
        eq(paymentProviders.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!provider || provider.type !== "stripe") {
    await db
      .update(refunds)
      .set({ status: "failed", failedAt: new Date(), failureReason: "Provider not supported", updatedAt: new Date() })
      .where(eq(refunds.id, refundId));
    await db.insert(refundAuditLog).values({
      storeAccountId,
      refundId,
      action: "failed",
      fromStatus: "pending",
      toStatus: "failed",
      notes: "Provider not supported",
    });
    return;
  }

  // 2. Stripe provider — create refund
  try {
    const stripe = getStripeClient(provider.encryptedConfig);
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: payment.externalId,
        amount: refund.amountCents,
      },
      { idempotencyKey: `refund_${refundId}` },
    );

    await db
      .update(refunds)
      .set({
        providerRefundId: stripeRefund.id,
        status: "succeeded",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refunds.id, refundId));

    await db.insert(refundAuditLog).values({
      storeAccountId,
      refundId,
      action: "processed",
      fromStatus: "pending",
      toStatus: "succeeded",
    });
  } catch (err) {
    const failureReason = err instanceof Error ? err.message : String(err);
    await db
      .update(refunds)
      .set({ status: "failed", failedAt: new Date(), failureReason, updatedAt: new Date() })
      .where(eq(refunds.id, refundId));
    await db.insert(refundAuditLog).values({
      storeAccountId,
      refundId,
      action: "failed",
      fromStatus: "pending",
      toStatus: "failed",
      notes: failureReason,
    });
  }
}

// ── createRefund ──────────────────────────────────────────────────────────────

export async function createRefund(
  db: Db,
  storeAccountId: string,
  data: {
    orderId: string;
    paymentId?: string;
    method: RefundMethod;
    amountCents: number;
    reason: string;
    isPartial: boolean;
    items?: Array<{ orderItemId: string; quantity: number; amountCents: number }>;
    notes?: string;
    actorUserId?: string;
  },
) {
  // 1. Verify order belongs to storeAccountId
  const [order] = await db
    .select({ id: orders.id, totalCents: orders.totalCents })
    .from(orders)
    .where(and(eq(orders.id, data.orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }

  // 2. Check order hasn't already been fully refunded
  const totalRefunded = await calculateOrderRefundTotal(db, data.orderId);
  if (totalRefunded + data.amountCents > order.totalCents) {
    throw Object.assign(
      new Error(
        `Refund amount exceeds remaining refundable amount. Already refunded: ${totalRefunded}, order total: ${order.totalCents}`,
      ),
      { statusCode: 422 },
    );
  }

  // 3. INSERT refund row
  const isManual = data.method !== "original_payment";

  const insertValues: typeof refunds.$inferInsert = {
    storeAccountId,
    orderId: data.orderId,
    status: "pending",
    method: data.method,
    amountCents: data.amountCents,
    reason: data.reason,
    isManual,
    isPartial: data.isPartial,
  };
  if (data.paymentId !== undefined) insertValues.paymentId = data.paymentId;
  if (data.actorUserId !== undefined) insertValues.createdByUserId = data.actorUserId;

  const [refund] = await db.insert(refunds).values(insertValues).returning();
  const createdRefund = refund!;

  // 4. If items provided: INSERT refundItems
  if (data.items && data.items.length > 0) {
    const itemValues = data.items.map((item) => ({
      refundId: createdRefund.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      amountCents: item.amountCents,
    }));
    await db.insert(refundItems).values(itemValues);
  }

  // 5. INSERT refundAuditLog: action='created', toStatus='pending'
  const auditValues: typeof refundAuditLog.$inferInsert = {
    storeAccountId,
    refundId: createdRefund.id,
    action: "created",
    toStatus: "pending",
  };
  if (data.notes !== undefined) auditValues.notes = data.notes;
  if (data.actorUserId !== undefined) auditValues.actorUserId = data.actorUserId;
  await db.insert(refundAuditLog).values(auditValues);

  // 6. If method === 'original_payment' && paymentId provided: call processProviderRefund
  if (data.method === "original_payment" && data.paymentId !== undefined) {
    await processProviderRefund(db, createdRefund.id, storeAccountId);
  }

  // 7. Update order paymentStatus
  await updateOrderPaymentStatus(db, data.orderId, storeAccountId);

  // 8. Return created refund (re-fetch to get final state)
  const [finalRefund] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.id, createdRefund.id))
    .limit(1);

  return finalRefund!;
}

// ── cancelRefund ──────────────────────────────────────────────────────────────

export async function cancelRefund(
  db: Db,
  refundId: string,
  storeAccountId: string,
  actorUserId?: string,
) {
  // 1. Load refund, verify belongs to store, check status === 'pending'
  const [refund] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.storeAccountId, storeAccountId)))
    .limit(1);

  if (!refund) {
    throw Object.assign(new Error("Refund not found"), { statusCode: 404 });
  }
  if (refund.status !== "pending") {
    throw Object.assign(
      new Error(`Cannot cancel refund with status '${refund.status}'. Only pending refunds can be cancelled.`),
      { statusCode: 422 },
    );
  }

  // 2. UPDATE refund SET status='cancelled'
  await db
    .update(refunds)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(refunds.id, refundId));

  // 3. INSERT audit: action='cancelled', fromStatus='pending', toStatus='cancelled'
  const auditValues: typeof refundAuditLog.$inferInsert = {
    storeAccountId,
    refundId,
    action: "cancelled",
    fromStatus: "pending",
    toStatus: "cancelled",
  };
  if (actorUserId !== undefined) auditValues.actorUserId = actorUserId;
  await db.insert(refundAuditLog).values(auditValues);

  // 4. Recalculate order paymentStatus
  await updateOrderPaymentStatus(db, refund.orderId, storeAccountId);

  const [updated] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundId))
    .limit(1);

  return updated!;
}

// ── listRefunds ───────────────────────────────────────────────────────────────

export async function listRefunds(
  db: Db,
  storeAccountId: string,
  opts?: { orderId?: string; status?: string },
) {
  const conditions = [eq(refunds.storeAccountId, storeAccountId)];
  if (opts?.orderId !== undefined) {
    conditions.push(eq(refunds.orderId, opts.orderId));
  }
  if (opts?.status !== undefined) {
    conditions.push(eq(refunds.status, opts.status as RefundStatus));
  }

  return db
    .select()
    .from(refunds)
    .where(and(...conditions))
    .orderBy(refunds.createdAt);
}

// ── getRefund ─────────────────────────────────────────────────────────────────

export async function getRefund(
  db: Db,
  refundId: string,
  storeAccountId: string,
) {
  const [refund] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.storeAccountId, storeAccountId)))
    .limit(1);

  if (!refund) return null;

  const items = await db
    .select()
    .from(refundItems)
    .where(eq(refundItems.refundId, refundId));

  const auditLog = await db
    .select()
    .from(refundAuditLog)
    .where(eq(refundAuditLog.refundId, refundId))
    .orderBy(refundAuditLog.createdAt);

  return { ...refund, items, auditLog };
}

// ── getRefundsByOrder ─────────────────────────────────────────────────────────

export async function getRefundsByOrder(
  db: Db,
  orderId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(refunds)
    .where(and(eq(refunds.orderId, orderId), eq(refunds.storeAccountId, storeAccountId)))
    .orderBy(refunds.createdAt);
}

// ── updateRefund ──────────────────────────────────────────────────────────────

export async function updateRefund(
  db: Db,
  refundId: string,
  storeAccountId: string,
  data: {
    status?: RefundStatus;
    providerRefundId?: string;
    notes?: string;
    failureReason?: string;
    actorUserId?: string;
  },
) {
  const [existing] = await db
    .select()
    .from(refunds)
    .where(and(eq(refunds.id, refundId), eq(refunds.storeAccountId, storeAccountId)))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("Refund not found"), { statusCode: 404 });
  }

  const updateValues: Partial<typeof refunds.$inferInsert> = { updatedAt: new Date() };
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.providerRefundId !== undefined) updateValues.providerRefundId = data.providerRefundId;
  if (data.failureReason !== undefined) updateValues.failureReason = data.failureReason;

  await db.update(refunds).set(updateValues).where(eq(refunds.id, refundId));

  if (data.status !== undefined && data.status !== existing.status) {
    const auditValues: typeof refundAuditLog.$inferInsert = {
      storeAccountId,
      refundId,
      action: "updated",
      fromStatus: existing.status,
      toStatus: data.status,
    };
    if (data.notes !== undefined) auditValues.notes = data.notes;
    if (data.actorUserId !== undefined) auditValues.actorUserId = data.actorUserId;
    await db.insert(refundAuditLog).values(auditValues);

    // Keep order paymentStatus in sync when succeeded/failed/cancelled
    await updateOrderPaymentStatus(db, existing.orderId, storeAccountId);
  }

  const [updated] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundId))
    .limit(1);

  return updated!;
}
