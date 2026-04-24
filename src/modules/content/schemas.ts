import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");

const contentStatusSchema = z.enum(["draft", "published", "archived"]);

// ── Pages ─────────────────────────────────────────────────────────────────────

export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: slugSchema,
  body: z.string().optional(),
  excerpt: z.string().optional(),
  status: contentStatusSchema.optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  publishedAt: z.string().datetime().optional(),
});

export const updatePageSchema = createPageSchema.partial();

// ── Blog Posts ────────────────────────────────────────────────────────────────

export const createBlogPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: slugSchema,
  body: z.string().optional(),
  excerpt: z.string().optional(),
  status: contentStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

// ── Query ─────────────────────────────────────────────────────────────────────

export const contentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: contentStatusSchema.optional(),
  sort: z.enum(["createdAt", "title", "publishedAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ── Params ────────────────────────────────────────────────────────────────────

export const pageIdParamSchema = z.object({
  pageId: z.string().uuid(),
});

export const postIdParamSchema = z.object({
  postId: z.string().uuid(),
});
