import { z } from "zod";

export const createRmaSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1),
  notes: z.string().optional(),
  shopId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        sku: z.string().optional(),
        quantityRequested: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const updateRmaSchema = z.object({
  status: z
    .enum([
      "requested",
      "approved",
      "label_sent",
      "received",
      "inspected",
      "refunded",
      "exchanged",
      "denied",
      "closed",
    ])
    .optional(),
  notes: z.string().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  returnLabelUrl: z.string().url().optional(),
  returnLabelCarrier: z.string().optional(),
  returnTrackingNumber: z.string().optional(),
  refundAmountCents: z.number().int().nonnegative().optional(),
});

export const receiveRmaSchema = z.object({
  items: z.array(
    z.object({
      rmaItemId: z.string().uuid(),
      quantityReceived: z.number().int().nonnegative(),
    }),
  ),
  notes: z.string().optional(),
});

export const inspectRmaSchema = z.object({
  items: z.array(
    z.object({
      rmaItemId: z.string().uuid(),
      condition: z.enum(["new", "good", "damaged", "defective", "missing_parts", "unknown"]),
      disposition: z.enum(["restock", "refurbish", "scrap", "vendor_return", "pending"]),
      restockedWarehouseId: z.string().uuid().optional(),
      inspectionNotes: z.string().optional(),
    }),
  ),
});

export const addRmaMessageSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
  authorType: z.enum(["agent", "customer", "system"]).default("agent"),
  authorCustomerId: z.string().uuid().optional(),
});

export const rmaQuerySchema = z.object({
  status: z
    .enum([
      "requested",
      "approved",
      "label_sent",
      "received",
      "inspected",
      "refunded",
      "exchanged",
      "denied",
      "closed",
    ])
    .optional(),
  orderId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const rmaIdParamSchema = z.object({ id: z.string().uuid() });
export const orderIdParamSchema = z.object({ orderId: z.string().uuid() });
