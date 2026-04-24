import { z } from "zod";

const connectorTypeValues = ["ftp", "sftp", "api", "manual_csv"] as const;
const feedFormatValues = ["csv", "xml", "json"] as const;

// ── Supplier CRUD ─────────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Slug must be lowercase alphanumeric with hyphens",
    ),
  notes: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierIdParamSchema = z.object({ supplierId: z.string().uuid() });

// ── Credentials (plaintext – encrypted at service layer) ──────────────────────

const credentialsSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
  apiKey: z.string().optional(),
  bearerToken: z.string().optional(),
});

// ── Mapping config ────────────────────────────────────────────────────────────

const mappingConfigSchema = z.object({
  sku: z.string().optional(),
  ean: z.string().optional(),
  qty: z.string().min(1),
  price: z.string().optional(),
  costPrice: z.string().optional(),
  name: z.string().optional(),
});

// ── Match rules ───────────────────────────────────────────────────────────────

const matchRulesSchema = z.object({
  primary: z.enum(["sku", "ean"]).default("sku"),
  secondary: z.enum(["sku", "ean"]).optional(),
});

// ── Remote config (FTP/SFTP) ──────────────────────────────────────────────────

const remoteConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(21),
  remotePath: z.string().min(1),
  filePattern: z.string().min(1),
  unzip: z.boolean().default(false),
  encoding: z.string().default("utf-8"),
});

// ── API config ────────────────────────────────────────────────────────────────

const apiConfigSchema = z.object({
  url: z.string().url(),
  authType: z.enum(["api_key", "bearer", "basic"]),
  authHeader: z.string().optional(),
  paginationType: z.enum(["none", "page", "cursor", "offset"]).default("none"),
  pageSize: z.number().int().min(1).max(1000).optional(),
  dataField: z.string().min(1),
  totalField: z.string().optional(),
  nextCursorField: z.string().optional(),
  pageParam: z.string().optional(),
  perPageParam: z.string().optional(),
  offsetParam: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

// ── Unknown SKU behavior (declared here so createFeedSchema can reference it) ──

const unknownSkuBehaviorValues = ["ignore", "create_placeholder", "flag_for_review"] as const;

// ── Feed CRUD ─────────────────────────────────────────────────────────────────

export const createFeedSchema = z.object({
  supplierId: z.string().uuid(),
  targetWarehouseId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  connectorType: z.enum(connectorTypeValues),
  format: z.enum(feedFormatValues).default("csv"),
  credentials: credentialsSchema.optional(),
  remoteConfig: remoteConfigSchema.optional(),
  apiConfig: apiConfigSchema.optional(),
  mappingConfig: mappingConfigSchema,
  matchRules: matchRulesSchema.optional(),
  schedule: z.string().max(100).optional(),
  unknownSkuBehavior: z.enum(unknownSkuBehaviorValues).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateFeedSchema = createFeedSchema.partial().omit({ supplierId: true });

export const feedIdParamSchema = z.object({ feedId: z.string().uuid() });

// ── Run params ────────────────────────────────────────────────────────────────

export const runIdParamSchema = z.object({ runId: z.string().uuid() });

export const runQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Manual CSV upload trigger ─────────────────────────────────────────────────

export const triggerManualRunSchema = z.object({
  content: z.string().min(1), // raw CSV/XML/JSON text
  fileName: z.string().optional(),
});

// ── Unknown SKU behavior export ───────────────────────────────────────────────

export const unknownSkuBehaviorSchema = z.enum(unknownSkuBehaviorValues);

// ── Dry-run / preview ─────────────────────────────────────────────────────────

export const triggerDryRunSchema = z.object({
  content: z.string().min(1),
  fileName: z.string().optional(),
  format: z.enum(["csv", "xml", "json"]).optional(),
});

// ── SKU Mappings ──────────────────────────────────────────────────────────────

export const createSkuMappingSchema = z.object({
  supplierSku: z.string().min(1).max(255),
  internalSku: z.string().min(1).max(100),
  notes: z.string().optional(),
});

export const updateSkuMappingSchema = z.object({
  internalSku: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
});

export const skuMappingIdParamSchema = z.object({ mappingId: z.string().uuid() });

// ── Review queue ──────────────────────────────────────────────────────────────

export const reviewQuerySchema = z.object({
  feedId: z.string().uuid().optional(),
  status: z.enum(["pending", "mapped", "ignored"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewItemIdParamSchema = z.object({ itemId: z.string().uuid() });

export const resolveReviewItemSchema = z.object({
  action: z.enum(["map", "ignore"]),
  internalSku: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
});
