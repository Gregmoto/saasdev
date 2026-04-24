import { z } from "zod";

// ── Create customer ───────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  acceptsMarketing: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ── Update customer ───────────────────────────────────────────────────────────

export const updateCustomerSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  acceptsMarketing: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ── Query / params ────────────────────────────────────────────────────────────

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  acceptsMarketing: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(["createdAt", "totalSpentCents", "ordersCount"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  shopId: z.string().uuid().optional(),
});

export const customerIdParamSchema = z.object({
  customerId: z.string().uuid(),
});

// ── Addresses ─────────────────────────────────────────────────────────────────

export const createAddressSchema = z.object({
  type: z.enum(["shipping", "billing"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().length(2),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().length(2).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

// ── Merge customers ───────────────────────────────────────────────────────────

export const mergeCustomersSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

// ── Shop-customer analytics ───────────────────────────────────────────────────

export const shopCustomerQuerySchema = z.object({
  shopId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const customerShopParamSchema = z.object({
  customerId: z.string().uuid(),
});
