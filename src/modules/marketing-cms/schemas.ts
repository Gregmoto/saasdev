import { z } from "zod";

// ── Common ─────────────────────────────────────────────────────────────────────

const statusEnum = z.enum(["draft", "published", "scheduled", "archived"]);
const languageEnum = z.enum(["sv", "en", "pl"]);

export const cmsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  type: z.enum(["blog", "news"]).optional(),
});

// ── Pages ──────────────────────────────────────────────────────────────────────

export const cmsPageSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  scheduledAt: z.string().datetime().optional(),
  sections: z
    .array(
      z.object({
        type: z.string(),
        content: z.record(z.unknown()),
        sortOrder: z.number().int(),
      }),
    )
    .optional(),
  body: z.string().optional(),
  excerpt: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().max(255).optional(),
  ogDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  hreflang: z.record(z.string()).optional(),
  breadcrumb: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .optional(),
});

export const cmsPageUpdateSchema = cmsPageSchema.partial().omit({ slug: true }).extend({
  slug: z.string().min(1).max(255).optional(),
});

// ── Posts ──────────────────────────────────────────────────────────────────────

export const cmsPostSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  type: z.enum(["blog", "news"]),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  scheduledAt: z.string().datetime().optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  coverImageUrl: z.string().optional(),
  authorName: z.string().max(100).optional(),
  authorTitle: z.string().max(100).optional(),
  authorAvatarUrl: z.string().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  readTimeMinutes: z.number().int().positive().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
  hreflang: z.record(z.string()).optional(),
});

export const cmsPostUpdateSchema = cmsPostSchema.partial();

// ── Changelog ─────────────────────────────────────────────────────────────────

export const cmsChangelogSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  version: z.string().max(30).optional(),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  scheduledAt: z.string().datetime().optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
});

export const cmsChangelogUpdateSchema = cmsChangelogSchema.partial();

// ── Cases ──────────────────────────────────────────────────────────────────────

export const cmsCaseSchema = z.object({
  slug: z.string().min(1).max(255),
  companyName: z.string().min(1).max(200),
  headline: z.string().min(1).max(255),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  scheduledAt: z.string().datetime().optional(),
  industry: z.string().max(100).optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  subheadline: z.string().optional(),
  body: z.string().optional(),
  results: z
    .array(
      z.object({
        metric: z.string(),
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  ctaText: z.string().max(100).optional(),
  ctaUrl: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

export const cmsCaseUpdateSchema = cmsCaseSchema.partial();

// ── Integrations ──────────────────────────────────────────────────────────────

export const cmsIntegrationSchema = z.object({
  slug: z.string().min(1).max(255),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  status: z.enum(["active", "coming_soon", "beta", "deprecated"]).optional(),
  language: languageEnum.optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  docsUrl: z.string().optional(),
  marketingUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const cmsIntegrationUpdateSchema = cmsIntegrationSchema.partial();

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const cmsFaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  language: languageEnum.optional(),
  category: z.string().max(100).optional(),
  status: statusEnum.optional(),
  sortOrder: z.number().int().optional(),
  showOnPages: z.array(z.string()).optional(),
});

export const cmsFaqUpdateSchema = cmsFaqSchema.partial();

// ── Features ──────────────────────────────────────────────────────────────────

export const cmsFeatureSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  tagline: z.string().max(255).optional(),
  excerpt: z.string().optional(),
  iconUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().optional(),
  body: z.string().optional(),
  benefits: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        iconUrl: z.string().optional(),
      }),
    )
    .optional(),
  screenshots: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    )
    .optional(),
  relatedFeatureSlugs: z.array(z.string()).optional(),
  faqItems: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
  ctaText: z.string().max(100).optional(),
  ctaUrl: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
});

export const cmsFeatureUpdateSchema = cmsFeatureSchema.partial();

// ── Homepage sections ──────────────────────────────────────────────────────────

export const cmsHomepageSectionSchema = z.object({
  sectionKey: z.string().min(1).max(100),
  language: languageEnum.optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  content: z.record(z.unknown()),
});

export const cmsHomepageSectionUpsertSchema = z.object({
  language: languageEnum.optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  content: z.record(z.unknown()),
});

// ── Roadmap items ──────────────────────────────────────────────────────────────

export const cmsRoadmapItemSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  category: z.string().max(100).optional(),
  priority: z.number().int().optional(),
  quarter: z.string().max(20).optional(),
  body: z.string().optional(),
  excerpt: z.string().optional(),
  votes: z.number().int().min(0).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
});

export const cmsRoadmapItemUpdateSchema = cmsRoadmapItemSchema.partial();

// ── Docs articles ──────────────────────────────────────────────────────────────

export const cmsDocsArticleSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  status: statusEnum.optional(),
  language: languageEnum.optional(),
  section: z.string().max(100).optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().uuid().optional(),
  body: z.string().optional(),
  excerpt: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
});

export const cmsDocsArticleUpdateSchema = cmsDocsArticleSchema.partial();
