import { z } from "zod";

export const zoneSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const zoneCountrySchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export const methodSchema = z.object({
  profileId: z.string().uuid(),
  zoneId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["standard", "express", "overnight", "click_collect", "free"]).default("standard"),
  carrier: z.string().optional(),
  estimatedDaysMin: z.number().int().nonnegative().optional(),
  estimatedDaysMax: z.number().int().nonnegative().optional(),
  rateType: z.enum(["flat", "weight_based", "price_based"]).default("flat"),
  flatPriceCents: z.number().int().nonnegative().default(0),
  freeAboveCents: z.number().int().nonnegative().optional(),
  maxWeightGrams: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  requiresAddress: z.boolean().default(true),
  pickupLocationId: z.string().uuid().optional(),
  sortOrder: z.number().int().default(0),
});

export const rateSchema = z.object({
  minWeightGrams: z.number().int().nonnegative().optional(),
  maxWeightGrams: z.number().int().nonnegative().optional(),
  minCartCents: z.number().int().nonnegative().optional(),
  maxCartCents: z.number().int().nonnegative().optional(),
  priceCents: z.number().int().nonnegative(),
});

export const shopProfileSchema = z.object({
  shopId: z.string().uuid(),
  profileId: z.string().uuid(),
});

export const clickCollectSchema = z.object({
  shopId: z.string().uuid().optional(),
  name: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().length(2),
  }),
  openingHours: z.record(z.string()).optional(),
  isActive: z.boolean().default(true),
});

// Rate resolution — what the checkout calls
export const resolveRatesSchema = z.object({
  cartSubtotalCents: z.number().int().nonnegative(),
  totalWeightGrams: z.number().int().nonnegative().optional(),
  destinationCountry: z.string().length(2),
  shopId: z.string().uuid().optional(),
});
