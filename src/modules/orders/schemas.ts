import { z } from "zod";

// ── Address sub-schema ────────────────────────────────────────────────────────

const addressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});

// ── Order item sub-schema ─────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  title: z.string(),
  variantTitle: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  taxCents: z.number().int().min(0).optional(),
});

// ── Create order ──────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerFirstName: z.string().optional(),
  customerLastName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  items: z.array(orderItemSchema).min(1),
  shopId: z.string().uuid().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ── Update status schemas ─────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(["unpaid", "paid", "partially_refunded", "refunded", "voided"]),
});

export const updateFulfillmentStatusSchema = z.object({
  fulfillmentStatus: z.enum(["unfulfilled", "partial", "fulfilled", "returned"]),
});

// ── Query / params ────────────────────────────────────────────────────────────

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .optional(),
  paymentStatus: z.enum(["unpaid", "paid", "partially_refunded", "refunded", "voided"]).optional(),
  fulfillmentStatus: z.enum(["unfulfilled", "partial", "fulfilled", "returned"]).optional(),
  customerId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  sort: z.enum(["createdAt", "totalCents", "orderNumber"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});
