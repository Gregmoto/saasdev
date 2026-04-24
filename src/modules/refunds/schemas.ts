import { z } from "zod";

export const createRefundSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  method: z
    .enum(["original_payment", "manual_bank", "manual_cash", "store_credit", "other"])
    .default("original_payment"),
  amountCents: z.number().int().positive(),
  reason: z.string().min(1),
  isPartial: z.boolean().default(false),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        amountCents: z.number().int().positive(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
});

export const updateRefundSchema = z.object({
  status: z
    .enum(["pending", "processing", "succeeded", "failed", "cancelled"])
    .optional(),
  providerRefundId: z.string().optional(),
  notes: z.string().optional(),
  failureReason: z.string().optional(),
});

export const refundIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

export const listRefundsQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  status: z
    .enum(["pending", "processing", "succeeded", "failed", "cancelled"])
    .optional(),
});
