/**
 * Marketing CMS — Platform-level content for shopman.dev marketing site.
 * Completely separate from per-store content (content.ts).
 * No storeAccountId — this is ShopMan's own marketing content.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const cmsStatusEnum = pgEnum("cms_status", [
  "draft",
  "published",
  "scheduled",   // publishedAt is in the future
  "archived",
]);

export const cmsLanguageEnum = pgEnum("cms_language", [
  "sv",   // Swedish (primary)
  "en",   // English
  "pl",   // Polish (optional)
]);

export const cmsPostTypeEnum = pgEnum("cms_post_type", [
  "blog",
  "news",
]);

export const cmsChangelogTagEnum = pgEnum("cms_changelog_tag", [
  "new",
  "improvement",
  "fix",
  "breaking",
  "security",
  "deprecation",
]);

export const cmsIntegrationStatusEnum = pgEnum("cms_integration_status", [
  "active",
  "coming_soon",
  "beta",
  "deprecated",
]);

// ── cms_pages ─────────────────────────────────────────────────────────────────
// Generic marketing pages (landing pages, legal, about, etc.)

export const cmsPages = pgTable(
  "cms_pages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    title: varchar("title", { length: 255 }).notNull(),
    status: cmsStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    // Content — flexible block array for section-based pages
    sections: jsonb("sections").$type<Array<{
      type: string;      // hero/features/testimonials/faq/cta/text/image/etc.
      content: Record<string, unknown>;
      sortOrder: number;
    }>>().default(sql`'[]'::jsonb`),
    // Raw markdown/html body for simple pages
    body: text("body"),
    excerpt: text("excerpt"),

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    ogTitle: varchar("og_title", { length: 255 }),
    ogDescription: text("og_description"),
    ogImageUrl: text("og_image_url"),
    // hreflang map: {sv: '/path', en: '/en/path'}
    hreflang: jsonb("hreflang").$type<Record<string, string>>(),

    // Breadcrumb
    breadcrumb: jsonb("breadcrumb").$type<Array<{ label: string; url: string }>>(),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_pages_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_pages_status_idx").on(t.status),
    langIdx: index("cms_pages_lang_idx").on(t.language),
  }),
);

// ── cms_posts ─────────────────────────────────────────────────────────────────
// Blog posts + News articles (same table, differentiated by type)

export const cmsPosts = pgTable(
  "cms_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    type: cmsPostTypeEnum("type").notNull().default("blog"),
    title: varchar("title", { length: 255 }).notNull(),
    status: cmsStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    excerpt: text("excerpt"),
    body: text("body").notNull().default(""),   // markdown
    coverImageUrl: text("cover_image_url"),

    // Author info
    authorName: varchar("author_name", { length: 100 }),
    authorTitle: varchar("author_title", { length: 100 }),
    authorAvatarUrl: text("author_avatar_url"),

    category: varchar("category", { length: 100 }),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    readTimeMinutes: integer("read_time_minutes"),

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    hreflang: jsonb("hreflang").$type<Record<string, string>>(),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangTypeUnique: uniqueIndex("cms_posts_slug_lang_type_unique").on(t.slug, t.language, t.type),
    statusIdx: index("cms_posts_status_idx").on(t.status),
    typeIdx: index("cms_posts_type_idx").on(t.type),
    langIdx: index("cms_posts_lang_idx").on(t.language),
    publishedAtIdx: index("cms_posts_published_at_idx").on(t.publishedAt),
  }),
);

// ── cms_changelog_entries ─────────────────────────────────────────────────────

export const cmsChangelogEntries = pgTable(
  "cms_changelog_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    version: varchar("version", { length: 30 }),       // e.g. "1.4.2" (optional)
    title: varchar("title", { length: 255 }).notNull(),
    status: cmsStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    body: text("body").notNull().default(""),           // markdown
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`), // new/fix/improvement/etc.
    category: varchar("category", { length: 100 }),    // e.g. "Payments", "API"

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_changelog_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_changelog_status_idx").on(t.status),
    publishedAtIdx: index("cms_changelog_published_at_idx").on(t.publishedAt),
  }),
);

// ── cms_cases ─────────────────────────────────────────────────────────────────
// Customer case studies

export const cmsCases = pgTable(
  "cms_cases",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    status: cmsStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),

    companyName: varchar("company_name", { length: 200 }).notNull(),
    industry: varchar("industry", { length: 100 }),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),

    headline: varchar("headline", { length: 255 }).notNull(),
    subheadline: text("subheadline"),
    body: text("body").notNull().default(""),          // markdown

    // Key results [{metric: 'revenue', value: '+47%', label: 'Ökad omsättning'}]
    results: jsonb("results").$type<Array<{
      metric: string;
      value: string;
      label: string;
    }>>().default(sql`'[]'::jsonb`),

    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    ctaText: varchar("cta_text", { length: 100 }),
    ctaUrl: text("cta_url"),

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_cases_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_cases_status_idx").on(t.status),
  }),
);

// ── cms_integrations ──────────────────────────────────────────────────────────
// Integrations directory entries

export const cmsIntegrations = pgTable(
  "cms_integrations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(), // Payments/Shipping/ERP/etc.
    status: cmsIntegrationStatusEnum("status").notNull().default("active"),

    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    description: text("description"),
    longDescription: text("long_description"),  // markdown

    docsUrl: text("docs_url"),
    marketingUrl: text("marketing_url"),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    features: jsonb("features").$type<string[]>().default(sql`'[]'::jsonb`),

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),

    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_integrations_slug_lang_unique").on(t.slug, t.language),
    categoryIdx: index("cms_integrations_category_idx").on(t.category),
    statusIdx: index("cms_integrations_status_idx").on(t.status),
  }),
);

// ── cms_faqs ──────────────────────────────────────────────────────────────────

export const cmsFaqs = pgTable(
  "cms_faqs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    category: varchar("category", { length: 100 }),   // General/Pricing/Technical/etc.
    question: text("question").notNull(),
    answer: text("answer").notNull(),                  // markdown
    status: cmsStatusEnum("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    // Which pages to show this FAQ on (page slugs, empty = all)
    showOnPages: jsonb("show_on_pages").$type<string[]>().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    langIdx: index("cms_faqs_lang_idx").on(t.language),
    categoryIdx: index("cms_faqs_category_idx").on(t.category),
    statusIdx: index("cms_faqs_status_idx").on(t.status),
  }),
);

// ── cms_features ──────────────────────────────────────────────────────────────
// Feature hub entries (CMS-driven feature pages)

export const cmsFeatures = pgTable(
  "cms_features",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    status: cmsStatusEnum("status").notNull().default("draft"),

    // Hub listing
    title: varchar("title", { length: 255 }).notNull(),
    tagline: varchar("tagline", { length: 255 }),
    excerpt: text("excerpt"),
    iconUrl: text("icon_url"),
    coverImageUrl: text("cover_image_url"),
    category: varchar("category", { length: 100 }), // "Inventory" / "Payments" / etc.
    sortOrder: integer("sort_order").notNull().default(0),

    // Feature page body
    body: text("body"),  // markdown

    // Benefits list [{title, description, iconUrl?}]
    benefits: jsonb("benefits").$type<Array<{
      title: string;
      description: string;
      iconUrl?: string;
    }>>().default(sql`'[]'::jsonb`),

    // Screenshots [{url, alt, caption?}]
    screenshots: jsonb("screenshots").$type<Array<{
      url: string;
      alt: string;
      caption?: string;
    }>>().default(sql`'[]'::jsonb`),

    // Related feature slugs (for internal linking)
    relatedFeatureSlugs: jsonb("related_feature_slugs").$type<string[]>().default(sql`'[]'::jsonb`),

    // FAQ items for this feature
    faqItems: jsonb("faq_items").$type<Array<{
      question: string;
      answer: string;
    }>>().default(sql`'[]'::jsonb`),

    // CTA
    ctaText: varchar("cta_text", { length: 100 }),
    ctaUrl: text("cta_url"),

    // SEO
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_features_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_features_status_idx").on(t.status),
    categoryIdx: index("cms_features_category_idx").on(t.category),
  }),
);

// ── cms_homepage_sections ─────────────────────────────────────────────────────
// Editable homepage sections (one row per section per language)

export const cmsHomepageSections = pgTable(
  "cms_homepage_sections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sectionKey: varchar("section_key", { length: 100 }).notNull(),
    // hero / social_proof / features / modes / multishop / seo_speed /
    // integrations / pricing_teaser / testimonials / news / faq / footer_cta
    language: cmsLanguageEnum("language").notNull().default("sv"),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    // Section content — shape depends on sectionKey
    content: jsonb("content").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sectionLangUnique: uniqueIndex("cms_hp_section_lang_unique").on(t.sectionKey, t.language),
    langIdx: index("cms_hp_lang_idx").on(t.language),
  }),
);

// ── cms_roadmap_items ─────────────────────────────────────────────────────────
// Public product roadmap (e.g. Q2 2026 planned features)

export const cmsRoadmapItems = pgTable(
  "cms_roadmap_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    title: varchar("title", { length: 255 }).notNull(),
    status: cmsStatusEnum("status").notNull().default("draft"),
    category: varchar("category", { length: 100 }),
    priority: integer("priority").notNull().default(0),
    quarter: varchar("quarter", { length: 20 }),
    body: text("body"),
    excerpt: text("excerpt"),
    votes: integer("votes").notNull().default(0),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_roadmap_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_roadmap_status_idx").on(t.status),
    categoryIdx: index("cms_roadmap_category_idx").on(t.category),
    quarterIdx: index("cms_roadmap_quarter_idx").on(t.quarter),
  }),
);

// ── cms_docs_articles ─────────────────────────────────────────────────────────
// Documentation hub articles (self-referencing for nested sections)

export const cmsDocsArticles = pgTable(
  "cms_docs_articles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 255 }).notNull(),
    language: cmsLanguageEnum("language").notNull().default("sv"),
    title: varchar("title", { length: 255 }).notNull(),
    status: cmsStatusEnum("status").notNull().default("draft"),
    section: varchar("section", { length: 100 }),
    sortOrder: integer("sort_order").notNull().default(0),
    parentId: uuid("parent_id"),
    body: text("body"),
    excerpt: text("excerpt"),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    canonicalUrl: text("canonical_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugLangUnique: uniqueIndex("cms_docs_slug_lang_unique").on(t.slug, t.language),
    statusIdx: index("cms_docs_status_idx").on(t.status),
    sectionIdx: index("cms_docs_section_idx").on(t.section),
    parentIdIdx: index("cms_docs_parent_id_idx").on(t.parentId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type CmsPage = typeof cmsPages.$inferSelect;
export type CmsPost = typeof cmsPosts.$inferSelect;
export type CmsChangelogEntry = typeof cmsChangelogEntries.$inferSelect;
export type CmsCase = typeof cmsCases.$inferSelect;
export type CmsIntegration = typeof cmsIntegrations.$inferSelect;
export type CmsFaq = typeof cmsFaqs.$inferSelect;
export type CmsFeature = typeof cmsFeatures.$inferSelect;
export type CmsHomepageSection = typeof cmsHomepageSections.$inferSelect;
export type CmsRoadmapItem = typeof cmsRoadmapItems.$inferSelect;
export type CmsDocsArticle = typeof cmsDocsArticles.$inferSelect;
export type CmsStatus = (typeof cmsStatusEnum.enumValues)[number];
export type CmsLanguage = (typeof cmsLanguageEnum.enumValues)[number];
