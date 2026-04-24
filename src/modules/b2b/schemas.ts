import { z } from "zod";

// ── Companies ─────────────────────────────────────────────────────────────────

export const createB2bCompanySchema = z.object({
  name: z.string().min(1).max(200),
  orgNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  customerId: z.string().uuid().optional(),
  salesRepUserId: z.string().uuid().optional(),
  defaultPriceListId: z.string().uuid().optional(),
  defaultPaymentTermsId: z.string().uuid().optional(),
  creditLimitCents: z.number().int().min(0).optional(),
  allowCreditOverdraft: z.boolean().optional(),
  showWarehouseAvailability: z.boolean().optional(),
  showRetailPrice: z.boolean().optional(),
  notes: z.string().optional(),
});

export const updateB2bCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  orgNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  customerId: z.string().uuid().optional(),
  salesRepUserId: z.string().uuid().optional(),
  defaultPriceListId: z.string().uuid().optional(),
  defaultPaymentTermsId: z.string().uuid().optional(),
  creditLimitCents: z.number().int().min(0).optional(),
  allowCreditOverdraft: z.boolean().optional(),
  showWarehouseAvailability: z.boolean().optional(),
  showRetailPrice: z.boolean().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "approved", "suspended", "rejected"]).optional(),
});

export const approveCompanySchema = z.object({});

// ── Price Lists ───────────────────────────────────────────────────────────────

export const createPriceListSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).optional(),
  discountType: z.enum(["percentage", "fixed_price", "margin"]),
  globalDiscountValue: z.number().optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const updatePriceListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  discountType: z.enum(["percentage", "fixed_price", "margin"]).optional(),
  globalDiscountValue: z.number().optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const upsertPriceListItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  priceCents: z.number().int().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  minimumQuantity: z.number().int().min(1).optional(),
  maximumQuantity: z.number().int().min(1).optional(),
  enabled: z.boolean().optional(),
});

// ── Payment Terms ─────────────────────────────────────────────────────────────

export const createPaymentTermsSchema = z.object({
  name: z.string().min(1).max(100),
  netDays: z.number().int().min(0),
  earlyPaymentDiscountDays: z.number().int().min(0).optional(),
  earlyPaymentDiscountPercent: z.number().min(0).max(100).optional(),
  allowedMethods: z.array(z.string()).optional(),
  requiresPurchaseOrder: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const updatePaymentTermsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  netDays: z.number().int().min(0).optional(),
  earlyPaymentDiscountDays: z.number().int().min(0).optional(),
  earlyPaymentDiscountPercent: z.number().min(0).max(100).optional(),
  allowedMethods: z.array(z.string()).optional(),
  requiresPurchaseOrder: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// ── Minimum Orders ────────────────────────────────────────────────────────────

export const createMinimumOrderSchema = z.object({
  b2bCompanyId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  minimumOrderCents: z.number().int().min(0).optional(),
  minimumOrderQuantity: z.number().int().min(0).optional(),
  minimumOrderLines: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});

export const updateMinimumOrderSchema = z.object({
  b2bCompanyId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  minimumOrderCents: z.number().int().min(0).optional(),
  minimumOrderQuantity: z.number().int().min(0).optional(),
  minimumOrderLines: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});

// ── Reorder Templates ─────────────────────────────────────────────────────────

const reorderTemplateItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  sku: z.string().optional(),
  name: z.string().optional(),
  quantity: z.number().int().min(1),
});

export const createReorderTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  items: z.array(reorderTemplateItemSchema).min(1),
});

export const updateReorderTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  items: z.array(reorderTemplateItemSchema).min(1).optional(),
});

// ── Credit Events ─────────────────────────────────────────────────────────────

export const addCreditEventSchema = z.object({
  orderId: z.string().uuid().optional(),
  type: z.enum(["invoice_issued", "payment_received", "credit_note", "adjustment"]),
  amountCents: z.number().int(),
  reference: z.string().max(200).optional(),
  notes: z.string().optional(),
});

// ── Query schemas ─────────────────────────────────────────────────────────────

export const companyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "suspended", "rejected"]).optional(),
  search: z.string().optional(),
});

export const priceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  enabled: z.coerce.boolean().optional(),
});
