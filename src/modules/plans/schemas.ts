import { z } from "zod";

export const planLimitsSchema = z.object({
  maxProducts: z.number().int().positive().nullable(),
  maxOrders: z.number().int().positive().nullable(),
  maxUsers: z.number().int().positive().nullable(),
  maxStorefronts: z.number().int().positive().nullable(),
  maxWarehouses: z.number().int().positive().nullable(),
  maxMarkets: z.number().int().positive().nullable(),
  apiRequestsPerDay: z.number().int().positive().nullable(),
  storageGb: z.number().positive().nullable(),
});

export const planFeaturesSchema = z.object({
  multiShop: z.boolean(),
  marketplace: z.boolean(),
  resellerPanel: z.boolean(),
  customDomains: z.boolean(),
  advancedAnalytics: z.boolean(),
  prioritySupport: z.boolean(),
  apiAccess: z.boolean(),
  webhooks: z.boolean(),
  bulkImport: z.boolean(),
});

export const createPlanSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  monthlyPriceCents: z.number().int().nonnegative().optional(),
  limits: planLimitsSchema,
  features: planFeaturesSchema,
  sortOrder: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  monthlyPriceCents: z.number().int().nonnegative().nullable().optional(),
  limits: planLimitsSchema.optional(),
  features: planFeaturesSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const assignPlanSchema = z.object({
  planId: z.string().uuid(),
  limitOverrides: planLimitsSchema.partial().nullable().optional(),
});

export const setFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_.-]+$/, "Key must be lowercase with underscores/dots/hyphens"),
  enabled: z.boolean(),
});
