import { z } from "zod";

export const createFulfillmentSchema = z.object({
  orderId: z.string().uuid(),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    sku: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  shippingMethodName: z.string().optional(),
  estimatedDeliveryAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateFulfillmentSchema = z.object({
  status: z.enum(["pending", "packed", "shipped", "delivered", "returned", "cancelled"]).optional(),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  shippingMethodName: z.string().optional(),
  estimatedDeliveryAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const addTrackingEventSchema = z.object({
  status: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  occurredAt: z.string().datetime(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  reason: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1),
  refund: z.boolean().default(false),
});

export const fulfillmentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});
