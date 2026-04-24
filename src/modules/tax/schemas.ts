import { z } from "zod";

export const taxRateSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  category: z.enum(["standard", "reduced", "super_reduced", "zero", "exempt"]).default("standard"),
  ratePercent: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "Must be a decimal like 25.00"),
  name: z.string().min(1),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
});

export const taxConfigSchema = z.object({
  defaultCountryCode: z.string().length(2).toUpperCase().default("SE"),
  pricesIncludeTax: z.boolean().default(true),
  defaultTaxCategory: z.enum(["standard", "reduced", "super_reduced", "zero", "exempt"]).default("standard"),
  b2bTaxExemptByDefault: z.boolean().default(false),
});

export const productTaxCategorySchema = z.object({
  productId: z.string().uuid(),
  taxCategory: z.enum(["standard", "reduced", "super_reduced", "zero", "exempt"]),
});

// Tax calculation input
export const calculateTaxSchema = z.object({
  countryCode: z.string().length(2),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    amountCents: z.number().int().nonnegative(),   // subtotal for this line
    taxCategory: z.enum(["standard", "reduced", "super_reduced", "zero", "exempt"]).optional(),
  })),
  shippingCents: z.number().int().nonnegative().default(0),
  pricesIncludeTax: z.boolean().default(true),
});

export const taxRateIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});
