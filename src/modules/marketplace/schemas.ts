import { z } from "zod";

// ── Commission Rules ──────────────────────────────────────────────────────────

const tierSchema = z.object({
  upToRevenueCents: z.number().int().positive(),
  value: z.number().positive(),
});

export const createCommissionRuleSchema = z.object({
  vendorId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  commissionType: z.enum(["percentage", "flat", "tiered"]),
  value: z.number().nonnegative(),
  tiers: z.array(tierSchema).optional(),
  minCommissionCents: z.number().int().nonnegative().optional(),
  maxCommissionCents: z.number().int().positive().optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export const updateCommissionRuleSchema = z.object({
  vendorId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  commissionType: z.enum(["percentage", "flat", "tiered"]).optional(),
  value: z.number().nonnegative().optional(),
  tiers: z.array(tierSchema).optional(),
  minCommissionCents: z.number().int().nonnegative().optional(),
  maxCommissionCents: z.number().int().positive().optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

// ── Orders ────────────────────────────────────────────────────────────────────

export const splitOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const vendorOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .optional(),
  vendorId: z.string().uuid().optional(),
});

export const updateVendorOrderSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .optional(),
  trackingNumber: z.string().max(200).optional(),
  trackingCarrier: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
});

// ── Settlements ───────────────────────────────────────────────────────────────

export const createSettlementSchema = z.object({
  vendorId: z.string().uuid(),
  periodStart: z.string().datetime({ offset: true }),
  periodEnd: z.string().datetime({ offset: true }),
});

export const updateSettlementSchema = z.object({
  status: z.enum(["open", "closed", "paid"]).optional(),
  notes: z.string().optional(),
});

// ── Payouts ───────────────────────────────────────────────────────────────────

export const createPayoutSchema = z.object({
  vendorId: z.string().uuid(),
  settlementId: z.string().uuid().optional(),
  amountCents: z.number().int().positive(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const updatePayoutSchema = z.object({
  status: z.enum(["pending", "processing", "paid", "failed"]).optional(),
  paymentReference: z.string().max(255).optional(),
  paidAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export const exportPayoutsQuerySchema = z.object({
  format: z.enum(["csv", "bgmax"]),
  status: z.enum(["pending", "processing", "paid", "failed"]).optional(),
});

// ── Param schemas ─────────────────────────────────────────────────────────────

export const idParamSchema = z.object({ id: z.string().uuid() });
export const vendorIdParamSchema = z.object({ vendorId: z.string().uuid() });
