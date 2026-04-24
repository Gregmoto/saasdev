import { z } from "zod";

// ── Reusable helpers ──────────────────────────────────────────────────────────

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugField = z.string().regex(slugPattern, "Slug must be lowercase-hyphen only (e.g. my-product)");

const productStatusEnum = z.enum(["draft", "published", "archived"]);

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
});

// ── Product schemas ───────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugField,
  priceCents: z.number().int().positive(),
  status: productStatusEnum.default("draft").optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  compareAtPriceCents: z.number().int().positive().optional(),
  taxable: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  weight: z.number().optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  images: z.array(imageSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  publishedAt: z.string().datetime().optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: productStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  // When shopId is provided, the response includes per-shop isPublished status.
  // Use "*" or omit for the master "All shops" view.
  shopId: z.string().uuid().optional(),
  sort: z.enum(["name", "price", "createdAt"]).default("createdAt").optional(),
  order: z.enum(["asc", "desc"]).default("desc").optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ── Variant schemas ───────────────────────────────────────────────────────────

export const createVariantSchema = z.object({
  title: z.string().min(1).max(255),
  priceCents: z.number().int(),
  sortOrder: z.number().int().optional(),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  compareAtPriceCents: z.number().int().positive().optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  options: z.record(z.string(), z.string()).optional(),
});

export const updateVariantSchema = createVariantSchema.partial();

// ── Param schemas ─────────────────────────────────────────────────────────────

export const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid(),
});

export const variantParamsSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
});

// ── Category schemas ──────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugField,
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
