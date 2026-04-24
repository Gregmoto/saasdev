import { z } from "zod";

export const addItemSchema = z.object({
  variantId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  sku: z.string().min(1).optional(),
  title: z.string().min(1),
  variantTitle: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().nonnegative(), // 0 = remove
});

export const updateCartSchema = z.object({
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

// Checkout schemas
export const startCheckoutSchema = z.object({
  email: z.string().email().optional(),
});

export const setAddressSchema = z.object({
  email: z.string().email(),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().length(2),
    phone: z.string().optional(),
  }),
  billingAddress: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      address1: z.string().min(1),
      address2: z.string().optional(),
      city: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().length(2),
      phone: z.string().optional(),
    })
    .optional(), // if null, same as shipping
  sameAsShipping: z.boolean().default(true),
});

export const setShippingSchema = z.object({
  shippingMethodId: z.string().uuid(),
});

export const shippingMethodSchema = z.object({
  name: z.string().min(1),
  carrier: z.string().optional(),
  estimatedDays: z.number().int().nonnegative().optional(),
  priceCents: z.number().int().nonnegative(),
  freeAboveCents: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

export const itemIdParamSchema = z.object({
  itemId: z.string().uuid(),
});

export const shippingMethodIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const shippingMethodQuerySchema = z.object({
  shopId: z.string().uuid().optional(),
});

export const confirmCheckoutSchema = z.object({
  paymentId: z.string().min(1),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UpdateCartInput = z.infer<typeof updateCartSchema>;
export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;
export type SetAddressInput = z.infer<typeof setAddressSchema>;
export type SetShippingInput = z.infer<typeof setShippingSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;
export type ConfirmCheckoutInput = z.infer<typeof confirmCheckoutSchema>;
