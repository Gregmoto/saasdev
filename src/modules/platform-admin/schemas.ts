import { z } from "zod";

export const planLimitsSchema = z.object({
  maxProducts: z.number().int().positive().nullable(),
  maxOrders: z.number().int().positive().nullable(),
  maxUsers: z.number().int().positive().nullable(),
  maxStorefronts: z.number().int().positive().nullable(),
  storageGb: z.number().positive().nullable(),
});

export const createStoreAccountSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(2).max(255),
  mode: z.enum(["WEBSHOP", "MULTISHOP", "MARKETPLACE", "RESELLER_PANEL"]),
  plan: z.string().min(1).max(50).default("starter"),
  status: z.enum(["pending", "active"]).default("active"),
  planLimits: planLimitsSchema.optional(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12),
});

export const updateStoreAccountSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  mode: z.enum(["WEBSHOP", "MULTISHOP", "MARKETPLACE", "RESELLER_PANEL"]).optional(),
  plan: z.string().min(1).max(50).optional(),
  planLimits: planLimitsSchema.nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const storeStatusActionSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const listStoreAccountsSchema = z.object({
  status: z.enum(["pending", "active", "suspended", "closed"]).optional(),
  mode: z.enum(["WEBSHOP", "MULTISHOP", "MARKETPLACE", "RESELLER_PANEL"]).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const listLogsSchema = z.object({
  storeAccountId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  eventType: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
