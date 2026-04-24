import { z } from "zod";

const platformValues = ["shopify", "woocommerce", "prestashop"] as const;
const entityValues = ["products", "customers", "orders"] as const;

// ── Credentials per platform ───────────────────────────────────────────────────

const shopifyCredsSchema = z.object({
  shopUrl: z.string().min(1),
  accessToken: z.string().min(1),
});
const wooCredsSchema = z.object({
  siteUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});
const prestaCredsSchema = z.object({
  shopUrl: z.string().url(),
  apiKey: z.string().min(1),
});
const credentialsSchema = z.union([shopifyCredsSchema, wooCredsSchema, prestaCredsSchema]);

// ── Field mapping ──────────────────────────────────────────────────────────────

const entityMappingSchema = z.record(z.string(), z.string());
const fieldMappingSchema = z.object({
  products: entityMappingSchema.optional(),
  customers: entityMappingSchema.optional(),
  orders: entityMappingSchema.optional(),
});

// ── Profiles ───────────────────────────────────────────────────────────────────

export const createProfileSchema = z.object({
  name: z.string().min(1).max(255),
  platform: z.enum(platformValues),
  credentials: credentialsSchema.optional(),
  defaultFieldMapping: fieldMappingSchema.optional(),
});
export const updateProfileSchema = createProfileSchema.partial();
export const profileIdParamSchema = z.object({ profileId: z.string().uuid() });

// ── Jobs ───────────────────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  platform: z.enum(platformValues),
  profileId: z.string().uuid().optional(),
  credentials: credentialsSchema.optional(),
  isDryRun: z.boolean().default(false).optional(),
});
export const updateEntitiesSchema = z.object({
  selectedEntities: z.array(z.enum(entityValues)).min(1),
});
export const updateMappingSchema = z.object({
  fieldMapping: fieldMappingSchema,
});
export const jobIdParamSchema = z.object({ jobId: z.string().uuid() });

// ── Query ──────────────────────────────────────────────────────────────────────

export const jobQuerySchema = z.object({
  status: z
    .enum([
      "draft",
      "validating",
      "dry_running",
      "pending",
      "running",
      "completed",
      "failed",
      "cancelled",
    ])
    .optional(),
  platform: z.enum(platformValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Import mode ────────────────────────────────────────────────────────────────

export const setModeSchema = z.object({
  mode: z.enum(["create_only", "update_existing", "create_and_update"]),
});

// ── Conflict resolution ────────────────────────────────────────────────────────

export const resolveConflictSchema = z.object({
  resolution: z.enum(["keep_existing", "use_incoming"]),
});

export const bulkResolveSchema = z.object({
  resolution: z.enum(["keep_existing", "use_incoming"]),
  entity: z.enum(["products", "customers", "orders"]).optional(),
});

export const conflictIdParamSchema = z.object({
  jobId: z.string().uuid(),
  conflictId: z.string().uuid(),
});

export const conflictsQuerySchema = z.object({
  entity: z.enum(["products", "customers", "orders"]).optional(),
  resolution: z.enum(["pending", "keep_existing", "use_incoming"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
