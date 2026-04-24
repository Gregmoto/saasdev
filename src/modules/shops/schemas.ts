import { z } from "zod";

// ── Shop CRUD ─────────────────────────────────────────────────────────────────

export const createShopSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens"),
  defaultLanguage: z.string().optional().default("en"),
  defaultCurrency: z.string().length(3).optional().default("SEK"),
  themeId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateShopSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  defaultLanguage: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  themeId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const shopIdParamSchema = z.object({
  shopId: z.string().uuid(),
});

// ── Shop Domains ──────────────────────────────────────────────────────────────

export const addShopDomainSchema = z.object({
  hostname: z.string().min(4).max(253),
});

export const domainIdParamSchema = z.object({
  shopId: z.string().uuid(),
  domainId: z.string().uuid(),
});

// ── Product Visibility ────────────────────────────────────────────────────────

export const shopProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isPublished: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === "true" || v === true)
    .optional(),
  sort: z.enum(["name", "createdAt", "publishedAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const setVisibilitySchema = z.object({
  isPublished: z.boolean(),
});

export const bulkVisibilitySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(200),
  isPublished: z.boolean(),
});

// ── Shop Prices ───────────────────────────────────────────────────────────────

export const setShopPriceSchema = z.object({
  priceCents: z.number().int().min(0),
  compareAtPriceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).default("SEK"),
});

export const bulkShopPriceSchema = z.object({
  prices: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        priceCents: z.number().int().min(0),
        compareAtPriceCents: z.number().int().min(0).optional(),
        currency: z.string().length(3).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const variantPriceParamSchema = z.object({
  shopId: z.string().uuid(),
  variantId: z.string().uuid(),
});

// ── Shop Warehouses ────────────────────────────────────────────────────────────

export const addShopWarehouseSchema = z.object({
  warehouseId: z.string().uuid(),
  priority: z.number().int().min(0).default(0).optional(),
});

export const updateShopWarehouseSchema = z.object({
  priority: z.number().int().min(0),
});

export const shopWarehouseParamSchema = z.object({
  shopId: z.string().uuid(),
  warehouseId: z.string().uuid(),
});

export const shopStockQuerySchema = z.object({
  sku: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
