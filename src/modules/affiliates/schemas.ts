import { z } from "zod";

// ── Affiliates ─────────────────────────────────────────────────────────────────

export const createAffiliateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  companyName: z.string().max(200).optional(),
  website: z.string().url().optional(),
  commissionType: z.enum(["percentage", "flat"]).optional(),
  commissionValue: z.number().nonnegative().optional(),
  cookieWindowDays: z.number().int().positive().optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const updateAffiliateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  companyName: z.string().max(200).optional(),
  website: z.string().url().optional(),
  commissionType: z.enum(["percentage", "flat"]).optional(),
  commissionValue: z.number().nonnegative().optional(),
  cookieWindowDays: z.number().int().positive().optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "approved", "paused", "rejected", "terminated"]).optional(),
});

export const approveAffiliateSchema = z.object({});

// ── Affiliate Links ────────────────────────────────────────────────────────────

export const createAffiliateLinkSchema = z.object({
  affiliateId: z.string().uuid(),
  code: z.string().min(1).max(50),
  targetUrl: z.string().url().optional(),
  label: z.string().max(100).optional(),
});

export const updateAffiliateLinkSchema = z.object({
  targetUrl: z.string().url().optional(),
  label: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
});

// ── Click Tracking ─────────────────────────────────────────────────────────────

export const recordClickSchema = z.object({
  code: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  landingUrl: z.string().optional(),
  referer: z.string().optional(),
});

// ── Conversion Attribution ─────────────────────────────────────────────────────

export const attributeOrderSchema = z.object({
  orderId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  affiliateCode: z.string().optional(),
});

// ── Payouts ────────────────────────────────────────────────────────────────────

export const createPayoutSchema = z.object({
  affiliateId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const updatePayoutSchema = z.object({
  status: z.enum(["pending", "processing", "paid", "failed"]).optional(),
  paymentReference: z.string().max(255).optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// ── Query Schemas ──────────────────────────────────────────────────────────────

export const affiliateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "paused", "rejected", "terminated"]).optional(),
});

export const conversionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "confirmed", "cancelled", "paid"]).optional(),
  affiliateId: z.string().uuid().optional(),
});

export const payoutQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "processing", "paid", "failed"]).optional(),
  affiliateId: z.string().uuid().optional(),
});

export const exportPayoutsQuerySchema = z.object({
  format: z.literal("csv"),
});
