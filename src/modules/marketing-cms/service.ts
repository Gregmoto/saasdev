import { eq, and, lte, desc, asc, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  cmsPages,
  cmsPosts,
  cmsChangelogEntries,
  cmsCases,
  cmsIntegrations,
  cmsFaqs,
  cmsFeatures,
  cmsHomepageSections,
  cmsRoadmapItems,
  cmsDocsArticles,
  cmsLegalVersions,
  type CmsPage,
  type CmsPost,
  type CmsChangelogEntry,
  type CmsCase,
  type CmsIntegration,
  type CmsFaq,
  type CmsFeature,
  type CmsHomepageSection,
  type CmsRoadmapItem,
  type CmsDocsArticle,
  type CmsLegalVersion,
  type LegalPageType,
} from "../../db/schema/marketing-cms.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

function nowPublishedAt() {
  return new Date();
}

// ── Pages ──────────────────────────────────────────────────────────────────────

export async function listCmsPages(
  db: Db,
  opts: { status?: string; language?: string; page: number; limit: number },
): Promise<{ items: CmsPage[]; total: number }> {
  const conditions = [];
  if (opts.status) conditions.push(eq(cmsPages.status, opts.status as CmsPage["status"]));
  if (opts.language) conditions.push(eq(cmsPages.language, opts.language as CmsPage["language"]));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsPages)
      .where(where)
      .orderBy(desc(cmsPages.publishedAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsPages).where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsPageBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsPage | null> {
  const [row] = await db
    .select()
    .from(cmsPages)
    .where(and(eq(cmsPages.slug, slug), eq(cmsPages.language, language as CmsPage["language"])))
    .limit(1);
  return row ?? null;
}

export async function getCmsPageById(db: Db, id: string): Promise<CmsPage | null> {
  const [row] = await db.select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
  return row ?? null;
}

export async function createCmsPage(
  db: Db,
  data: {
    slug: string;
    title: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    sections?: Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
    body?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    hreflang?: Record<string, string>;
    breadcrumb?: Array<{ label: string; url: string }>;
  },
): Promise<CmsPage> {
  const insert: Parameters<typeof db.insert>[0] extends never
    ? never
    : Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.scheduledAt !== undefined) insert["scheduledAt"] = new Date(data.scheduledAt);
  if (data.sections !== undefined) insert["sections"] = data.sections;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.excerpt !== undefined) insert["excerpt"] = data.excerpt;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.canonicalUrl !== undefined) insert["canonicalUrl"] = data.canonicalUrl;
  if (data.ogTitle !== undefined) insert["ogTitle"] = data.ogTitle;
  if (data.ogDescription !== undefined) insert["ogDescription"] = data.ogDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;
  if (data.hreflang !== undefined) insert["hreflang"] = data.hreflang;
  if (data.breadcrumb !== undefined) insert["breadcrumb"] = data.breadcrumb;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsPages)
    .values(insert as typeof cmsPages.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsPage(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    sections?: Array<{ type: string; content: Record<string, unknown>; sortOrder: number }>;
    body?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
    hreflang?: Record<string, string>;
    breadcrumb?: Array<{ label: string; url: string }>;
  },
): Promise<CmsPage | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.scheduledAt !== undefined) update["scheduledAt"] = new Date(data.scheduledAt);
  if (data.sections !== undefined) update["sections"] = data.sections;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.excerpt !== undefined) update["excerpt"] = data.excerpt;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.canonicalUrl !== undefined) update["canonicalUrl"] = data.canonicalUrl;
  if (data.ogTitle !== undefined) update["ogTitle"] = data.ogTitle;
  if (data.ogDescription !== undefined) update["ogDescription"] = data.ogDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;
  if (data.hreflang !== undefined) update["hreflang"] = data.hreflang;
  if (data.breadcrumb !== undefined) update["breadcrumb"] = data.breadcrumb;

  if (data.status === "published") {
    const existing = await getCmsPageById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsPages)
    .set(update as Partial<typeof cmsPages.$inferInsert>)
    .where(eq(cmsPages.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsPage(db: Db, id: string): Promise<void> {
  await db.delete(cmsPages).where(eq(cmsPages.id, id));
}

// ── Posts ──────────────────────────────────────────────────────────────────────

export async function listCmsPosts(
  db: Db,
  opts: { status?: string; language?: string; type?: string; page: number; limit: number },
): Promise<{ items: CmsPost[]; total: number }> {
  const conditions = [];
  if (opts.status) conditions.push(eq(cmsPosts.status, opts.status as CmsPost["status"]));
  if (opts.language) conditions.push(eq(cmsPosts.language, opts.language as CmsPost["language"]));
  if (opts.type) conditions.push(eq(cmsPosts.type, opts.type as CmsPost["type"]));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsPosts)
      .where(where)
      .orderBy(desc(cmsPosts.publishedAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsPosts).where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsPostBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsPost | null> {
  const [row] = await db
    .select()
    .from(cmsPosts)
    .where(and(eq(cmsPosts.slug, slug), eq(cmsPosts.language, language as CmsPost["language"])))
    .limit(1);
  return row ?? null;
}

export async function getCmsPostById(db: Db, id: string): Promise<CmsPost | null> {
  const [row] = await db.select().from(cmsPosts).where(eq(cmsPosts.id, id)).limit(1);
  return row ?? null;
}

export async function createCmsPost(
  db: Db,
  data: {
    slug: string;
    title: string;
    type: "blog" | "news";
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    excerpt?: string;
    body?: string;
    coverImageUrl?: string;
    authorName?: string;
    authorTitle?: string;
    authorAvatarUrl?: string;
    category?: string;
    tags?: string[];
    readTimeMinutes?: number;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    hreflang?: Record<string, string>;
  },
): Promise<CmsPost> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
    type: data.type,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.scheduledAt !== undefined) insert["scheduledAt"] = new Date(data.scheduledAt);
  if (data.excerpt !== undefined) insert["excerpt"] = data.excerpt;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.coverImageUrl !== undefined) insert["coverImageUrl"] = data.coverImageUrl;
  if (data.authorName !== undefined) insert["authorName"] = data.authorName;
  if (data.authorTitle !== undefined) insert["authorTitle"] = data.authorTitle;
  if (data.authorAvatarUrl !== undefined) insert["authorAvatarUrl"] = data.authorAvatarUrl;
  if (data.category !== undefined) insert["category"] = data.category;
  if (data.tags !== undefined) insert["tags"] = data.tags;
  if (data.readTimeMinutes !== undefined) insert["readTimeMinutes"] = data.readTimeMinutes;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) insert["canonicalUrl"] = data.canonicalUrl;
  if (data.hreflang !== undefined) insert["hreflang"] = data.hreflang;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsPosts)
    .values(insert as typeof cmsPosts.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsPost(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    type?: "blog" | "news";
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    excerpt?: string;
    body?: string;
    coverImageUrl?: string;
    authorName?: string;
    authorTitle?: string;
    authorAvatarUrl?: string;
    category?: string;
    tags?: string[];
    readTimeMinutes?: number;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    hreflang?: Record<string, string>;
  },
): Promise<CmsPost | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.type !== undefined) update["type"] = data.type;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.scheduledAt !== undefined) update["scheduledAt"] = new Date(data.scheduledAt);
  if (data.excerpt !== undefined) update["excerpt"] = data.excerpt;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.coverImageUrl !== undefined) update["coverImageUrl"] = data.coverImageUrl;
  if (data.authorName !== undefined) update["authorName"] = data.authorName;
  if (data.authorTitle !== undefined) update["authorTitle"] = data.authorTitle;
  if (data.authorAvatarUrl !== undefined) update["authorAvatarUrl"] = data.authorAvatarUrl;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.tags !== undefined) update["tags"] = data.tags;
  if (data.readTimeMinutes !== undefined) update["readTimeMinutes"] = data.readTimeMinutes;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) update["canonicalUrl"] = data.canonicalUrl;
  if (data.hreflang !== undefined) update["hreflang"] = data.hreflang;

  if (data.status === "published") {
    const existing = await getCmsPostById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsPosts)
    .set(update as Partial<typeof cmsPosts.$inferInsert>)
    .where(eq(cmsPosts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsPost(db: Db, id: string): Promise<void> {
  await db.delete(cmsPosts).where(eq(cmsPosts.id, id));
}

// ── Changelog ─────────────────────────────────────────────────────────────────

export async function listCmsChangelog(
  db: Db,
  opts: { status?: string; language?: string; page: number; limit: number },
): Promise<{ items: CmsChangelogEntry[]; total: number }> {
  const conditions = [];
  if (opts.status)
    conditions.push(
      eq(cmsChangelogEntries.status, opts.status as CmsChangelogEntry["status"]),
    );
  if (opts.language)
    conditions.push(
      eq(
        cmsChangelogEntries.language,
        opts.language as CmsChangelogEntry["language"],
      ),
    );

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsChangelogEntries)
      .where(where)
      .orderBy(desc(cmsChangelogEntries.publishedAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsChangelogEntries)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsChangelogBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsChangelogEntry | null> {
  const [row] = await db
    .select()
    .from(cmsChangelogEntries)
    .where(
      and(
        eq(cmsChangelogEntries.slug, slug),
        eq(
          cmsChangelogEntries.language,
          language as CmsChangelogEntry["language"],
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsChangelogById(
  db: Db,
  id: string,
): Promise<CmsChangelogEntry | null> {
  const [row] = await db
    .select()
    .from(cmsChangelogEntries)
    .where(eq(cmsChangelogEntries.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsChangelog(
  db: Db,
  data: {
    slug: string;
    title: string;
    version?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    body?: string;
    tags?: string[];
    category?: string;
    versionLabel?: string;
    highlights?: Array<{text: string; href?: string}>;
    fixes?: Array<{text: string; href?: string}>;
    docsLinks?: Array<{text: string; href: string}>;
    seoTitle?: string;
    seoDescription?: string;
  },
): Promise<CmsChangelogEntry> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
  };

  if (data.version !== undefined) insert["version"] = data.version;
  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.scheduledAt !== undefined) insert["scheduledAt"] = new Date(data.scheduledAt);
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.tags !== undefined) insert["tags"] = data.tags;
  if (data.category !== undefined) insert["category"] = data.category;
  if (data.versionLabel !== undefined) insert["versionLabel"] = data.versionLabel;
  if (data.highlights !== undefined) insert["highlights"] = data.highlights;
  if (data.fixes !== undefined) insert["fixes"] = data.fixes;
  if (data.docsLinks !== undefined) insert["docsLinks"] = data.docsLinks;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsChangelogEntries)
    .values(insert as typeof cmsChangelogEntries.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsChangelog(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    version?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    body?: string;
    tags?: string[];
    category?: string;
    versionLabel?: string;
    highlights?: Array<{text: string; href?: string}>;
    fixes?: Array<{text: string; href?: string}>;
    docsLinks?: Array<{text: string; href: string}>;
    seoTitle?: string;
    seoDescription?: string;
  },
): Promise<CmsChangelogEntry | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.version !== undefined) update["version"] = data.version;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.scheduledAt !== undefined) update["scheduledAt"] = new Date(data.scheduledAt);
  if (data.body !== undefined) update["body"] = data.body;
  if (data.tags !== undefined) update["tags"] = data.tags;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.versionLabel !== undefined) update["versionLabel"] = data.versionLabel;
  if (data.highlights !== undefined) update["highlights"] = data.highlights;
  if (data.fixes !== undefined) update["fixes"] = data.fixes;
  if (data.docsLinks !== undefined) update["docsLinks"] = data.docsLinks;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;

  if (data.status === "published") {
    const existing = await getCmsChangelogById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsChangelogEntries)
    .set(update as Partial<typeof cmsChangelogEntries.$inferInsert>)
    .where(eq(cmsChangelogEntries.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsChangelog(db: Db, id: string): Promise<void> {
  await db.delete(cmsChangelogEntries).where(eq(cmsChangelogEntries.id, id));
}

// ── Cases ──────────────────────────────────────────────────────────────────────

export async function listCmsCases(
  db: Db,
  opts: { status?: string; language?: string; page: number; limit: number },
): Promise<{ items: CmsCase[]; total: number }> {
  const conditions = [];
  if (opts.status) conditions.push(eq(cmsCases.status, opts.status as CmsCase["status"]));
  if (opts.language)
    conditions.push(eq(cmsCases.language, opts.language as CmsCase["language"]));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsCases)
      .where(where)
      .orderBy(desc(cmsCases.publishedAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsCases).where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsCaseBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsCase | null> {
  const [row] = await db
    .select()
    .from(cmsCases)
    .where(
      and(eq(cmsCases.slug, slug), eq(cmsCases.language, language as CmsCase["language"])),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsCaseById(db: Db, id: string): Promise<CmsCase | null> {
  const [row] = await db.select().from(cmsCases).where(eq(cmsCases.id, id)).limit(1);
  return row ?? null;
}

export async function createCmsCase(
  db: Db,
  data: {
    slug: string;
    companyName: string;
    headline: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    industry?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    subheadline?: string;
    body?: string;
    results?: Array<{ metric: string; value: string; label: string }>;
    tags?: string[];
    ctaText?: string;
    ctaUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
  },
): Promise<CmsCase> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    companyName: data.companyName,
    headline: data.headline,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.scheduledAt !== undefined) insert["scheduledAt"] = new Date(data.scheduledAt);
  if (data.industry !== undefined) insert["industry"] = data.industry;
  if (data.logoUrl !== undefined) insert["logoUrl"] = data.logoUrl;
  if (data.coverImageUrl !== undefined) insert["coverImageUrl"] = data.coverImageUrl;
  if (data.subheadline !== undefined) insert["subheadline"] = data.subheadline;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.results !== undefined) insert["results"] = data.results;
  if (data.tags !== undefined) insert["tags"] = data.tags;
  if (data.ctaText !== undefined) insert["ctaText"] = data.ctaText;
  if (data.ctaUrl !== undefined) insert["ctaUrl"] = data.ctaUrl;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsCases)
    .values(insert as typeof cmsCases.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsCase(
  db: Db,
  id: string,
  data: {
    slug?: string;
    companyName?: string;
    headline?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    scheduledAt?: string;
    industry?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    subheadline?: string;
    body?: string;
    results?: Array<{ metric: string; value: string; label: string }>;
    tags?: string[];
    ctaText?: string;
    ctaUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
  },
): Promise<CmsCase | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.companyName !== undefined) update["companyName"] = data.companyName;
  if (data.headline !== undefined) update["headline"] = data.headline;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.scheduledAt !== undefined) update["scheduledAt"] = new Date(data.scheduledAt);
  if (data.industry !== undefined) update["industry"] = data.industry;
  if (data.logoUrl !== undefined) update["logoUrl"] = data.logoUrl;
  if (data.coverImageUrl !== undefined) update["coverImageUrl"] = data.coverImageUrl;
  if (data.subheadline !== undefined) update["subheadline"] = data.subheadline;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.results !== undefined) update["results"] = data.results;
  if (data.tags !== undefined) update["tags"] = data.tags;
  if (data.ctaText !== undefined) update["ctaText"] = data.ctaText;
  if (data.ctaUrl !== undefined) update["ctaUrl"] = data.ctaUrl;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;

  if (data.status === "published") {
    const existing = await getCmsCaseById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsCases)
    .set(update as Partial<typeof cmsCases.$inferInsert>)
    .where(eq(cmsCases.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsCase(db: Db, id: string): Promise<void> {
  await db.delete(cmsCases).where(eq(cmsCases.id, id));
}

// ── Integrations ──────────────────────────────────────────────────────────────

export async function listCmsIntegrations(
  db: Db,
  opts: {
    status?: string;
    language?: string;
    category?: string;
    page: number;
    limit: number;
  },
): Promise<{ items: CmsIntegration[]; total: number }> {
  const conditions = [];
  if (opts.status)
    conditions.push(
      eq(cmsIntegrations.status, opts.status as CmsIntegration["status"]),
    );
  if (opts.language)
    conditions.push(
      eq(cmsIntegrations.language, opts.language as CmsIntegration["language"]),
    );
  if (opts.category) conditions.push(eq(cmsIntegrations.category, opts.category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsIntegrations)
      .where(where)
      .orderBy(asc(cmsIntegrations.sortOrder))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsIntegrations)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsIntegrationBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsIntegration | null> {
  const [row] = await db
    .select()
    .from(cmsIntegrations)
    .where(
      and(
        eq(cmsIntegrations.slug, slug),
        eq(cmsIntegrations.language, language as CmsIntegration["language"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsIntegrationById(
  db: Db,
  id: string,
): Promise<CmsIntegration | null> {
  const [row] = await db
    .select()
    .from(cmsIntegrations)
    .where(eq(cmsIntegrations.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsIntegration(
  db: Db,
  data: {
    slug: string;
    name: string;
    category: string;
    status?: "active" | "coming_soon" | "beta" | "deprecated";
    language?: "sv" | "en" | "pl";
    description?: string;
    longDescription?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    docsUrl?: string;
    marketingUrl?: string;
    tags?: string[];
    features?: string[];
    seoTitle?: string;
    seoDescription?: string;
    sortOrder?: number;
  },
): Promise<CmsIntegration> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    name: data.name,
    category: data.category,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.description !== undefined) insert["description"] = data.description;
  if (data.longDescription !== undefined) insert["longDescription"] = data.longDescription;
  if (data.logoUrl !== undefined) insert["logoUrl"] = data.logoUrl;
  if (data.coverImageUrl !== undefined) insert["coverImageUrl"] = data.coverImageUrl;
  if (data.docsUrl !== undefined) insert["docsUrl"] = data.docsUrl;
  if (data.marketingUrl !== undefined) insert["marketingUrl"] = data.marketingUrl;
  if (data.tags !== undefined) insert["tags"] = data.tags;
  if (data.features !== undefined) insert["features"] = data.features;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.sortOrder !== undefined) insert["sortOrder"] = data.sortOrder;

  const [row] = await db
    .insert(cmsIntegrations)
    .values(insert as typeof cmsIntegrations.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsIntegration(
  db: Db,
  id: string,
  data: {
    slug?: string;
    name?: string;
    category?: string;
    status?: "active" | "coming_soon" | "beta" | "deprecated";
    language?: "sv" | "en" | "pl";
    description?: string;
    longDescription?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    docsUrl?: string;
    marketingUrl?: string;
    tags?: string[];
    features?: string[];
    seoTitle?: string;
    seoDescription?: string;
    sortOrder?: number;
  },
): Promise<CmsIntegration | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.name !== undefined) update["name"] = data.name;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.description !== undefined) update["description"] = data.description;
  if (data.longDescription !== undefined) update["longDescription"] = data.longDescription;
  if (data.logoUrl !== undefined) update["logoUrl"] = data.logoUrl;
  if (data.coverImageUrl !== undefined) update["coverImageUrl"] = data.coverImageUrl;
  if (data.docsUrl !== undefined) update["docsUrl"] = data.docsUrl;
  if (data.marketingUrl !== undefined) update["marketingUrl"] = data.marketingUrl;
  if (data.tags !== undefined) update["tags"] = data.tags;
  if (data.features !== undefined) update["features"] = data.features;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.sortOrder !== undefined) update["sortOrder"] = data.sortOrder;

  const [row] = await db
    .update(cmsIntegrations)
    .set(update as Partial<typeof cmsIntegrations.$inferInsert>)
    .where(eq(cmsIntegrations.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsIntegration(db: Db, id: string): Promise<void> {
  await db.delete(cmsIntegrations).where(eq(cmsIntegrations.id, id));
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

export async function listCmsFaqs(
  db: Db,
  opts: {
    status?: string;
    language?: string;
    category?: string;
    page: number;
    limit: number;
  },
): Promise<{ items: CmsFaq[]; total: number }> {
  const conditions = [];
  if (opts.status) conditions.push(eq(cmsFaqs.status, opts.status as CmsFaq["status"]));
  if (opts.language)
    conditions.push(eq(cmsFaqs.language, opts.language as CmsFaq["language"]));
  if (opts.category) conditions.push(eq(cmsFaqs.category, opts.category));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsFaqs)
      .where(where)
      .orderBy(asc(cmsFaqs.sortOrder))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsFaqs).where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsFaqById(db: Db, id: string): Promise<CmsFaq | null> {
  const [row] = await db.select().from(cmsFaqs).where(eq(cmsFaqs.id, id)).limit(1);
  return row ?? null;
}

export async function createCmsFaq(
  db: Db,
  data: {
    question: string;
    answer: string;
    language?: "sv" | "en" | "pl";
    category?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    sortOrder?: number;
    showOnPages?: string[];
  },
): Promise<CmsFaq> {
  const insert: Record<string, unknown> = {
    question: data.question,
    answer: data.answer,
  };

  if (data.language !== undefined) insert["language"] = data.language;
  if (data.category !== undefined) insert["category"] = data.category;
  if (data.status !== undefined) insert["status"] = data.status;
  if (data.sortOrder !== undefined) insert["sortOrder"] = data.sortOrder;
  if (data.showOnPages !== undefined) insert["showOnPages"] = data.showOnPages;

  const [row] = await db
    .insert(cmsFaqs)
    .values(insert as typeof cmsFaqs.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsFaq(
  db: Db,
  id: string,
  data: {
    question?: string;
    answer?: string;
    language?: "sv" | "en" | "pl";
    category?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    sortOrder?: number;
    showOnPages?: string[];
  },
): Promise<CmsFaq | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.question !== undefined) update["question"] = data.question;
  if (data.answer !== undefined) update["answer"] = data.answer;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.sortOrder !== undefined) update["sortOrder"] = data.sortOrder;
  if (data.showOnPages !== undefined) update["showOnPages"] = data.showOnPages;

  const [row] = await db
    .update(cmsFaqs)
    .set(update as Partial<typeof cmsFaqs.$inferInsert>)
    .where(eq(cmsFaqs.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsFaq(db: Db, id: string): Promise<void> {
  await db.delete(cmsFaqs).where(eq(cmsFaqs.id, id));
}

// ── Features ──────────────────────────────────────────────────────────────────

export async function listCmsFeatures(
  db: Db,
  opts: { status?: string; language?: string; page: number; limit: number },
): Promise<{ items: CmsFeature[]; total: number }> {
  const conditions = [];
  if (opts.status)
    conditions.push(eq(cmsFeatures.status, opts.status as CmsFeature["status"]));
  if (opts.language)
    conditions.push(
      eq(cmsFeatures.language, opts.language as CmsFeature["language"]),
    );

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsFeatures)
      .where(where)
      .orderBy(asc(cmsFeatures.sortOrder))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsFeatures)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0 };
}

export async function getCmsFeatureBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsFeature | null> {
  const [row] = await db
    .select()
    .from(cmsFeatures)
    .where(
      and(
        eq(cmsFeatures.slug, slug),
        eq(cmsFeatures.language, language as CmsFeature["language"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsFeatureById(db: Db, id: string): Promise<CmsFeature | null> {
  const [row] = await db
    .select()
    .from(cmsFeatures)
    .where(eq(cmsFeatures.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsFeature(
  db: Db,
  data: {
    slug: string;
    title: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    tagline?: string;
    excerpt?: string;
    iconUrl?: string;
    coverImageUrl?: string;
    category?: string;
    sortOrder?: number;
    body?: string;
    benefits?: Array<{ title: string; description: string; iconUrl?: string }>;
    screenshots?: Array<{ url: string; alt: string; caption?: string }>;
    relatedFeatureSlugs?: string[];
    faqItems?: Array<{ question: string; answer: string }>;
    ctaText?: string;
    ctaUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsFeature> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.tagline !== undefined) insert["tagline"] = data.tagline;
  if (data.excerpt !== undefined) insert["excerpt"] = data.excerpt;
  if (data.iconUrl !== undefined) insert["iconUrl"] = data.iconUrl;
  if (data.coverImageUrl !== undefined) insert["coverImageUrl"] = data.coverImageUrl;
  if (data.category !== undefined) insert["category"] = data.category;
  if (data.sortOrder !== undefined) insert["sortOrder"] = data.sortOrder;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.benefits !== undefined) insert["benefits"] = data.benefits;
  if (data.screenshots !== undefined) insert["screenshots"] = data.screenshots;
  if (data.relatedFeatureSlugs !== undefined)
    insert["relatedFeatureSlugs"] = data.relatedFeatureSlugs;
  if (data.faqItems !== undefined) insert["faqItems"] = data.faqItems;
  if (data.ctaText !== undefined) insert["ctaText"] = data.ctaText;
  if (data.ctaUrl !== undefined) insert["ctaUrl"] = data.ctaUrl;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) insert["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsFeatures)
    .values(insert as typeof cmsFeatures.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsFeature(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    tagline?: string;
    excerpt?: string;
    iconUrl?: string;
    coverImageUrl?: string;
    category?: string;
    sortOrder?: number;
    body?: string;
    benefits?: Array<{ title: string; description: string; iconUrl?: string }>;
    screenshots?: Array<{ url: string; alt: string; caption?: string }>;
    relatedFeatureSlugs?: string[];
    faqItems?: Array<{ question: string; answer: string }>;
    ctaText?: string;
    ctaUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsFeature | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.tagline !== undefined) update["tagline"] = data.tagline;
  if (data.excerpt !== undefined) update["excerpt"] = data.excerpt;
  if (data.iconUrl !== undefined) update["iconUrl"] = data.iconUrl;
  if (data.coverImageUrl !== undefined) update["coverImageUrl"] = data.coverImageUrl;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.sortOrder !== undefined) update["sortOrder"] = data.sortOrder;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.benefits !== undefined) update["benefits"] = data.benefits;
  if (data.screenshots !== undefined) update["screenshots"] = data.screenshots;
  if (data.relatedFeatureSlugs !== undefined)
    update["relatedFeatureSlugs"] = data.relatedFeatureSlugs;
  if (data.faqItems !== undefined) update["faqItems"] = data.faqItems;
  if (data.ctaText !== undefined) update["ctaText"] = data.ctaText;
  if (data.ctaUrl !== undefined) update["ctaUrl"] = data.ctaUrl;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) update["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") {
    const existing = await getCmsFeatureById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsFeatures)
    .set(update as Partial<typeof cmsFeatures.$inferInsert>)
    .where(eq(cmsFeatures.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsFeature(db: Db, id: string): Promise<void> {
  await db.delete(cmsFeatures).where(eq(cmsFeatures.id, id));
}

// ── Homepage sections ──────────────────────────────────────────────────────────

export async function getHomepageSections(
  db: Db,
  language: string,
): Promise<CmsHomepageSection[]> {
  return db
    .select()
    .from(cmsHomepageSections)
    .where(
      and(
        eq(cmsHomepageSections.language, language as CmsHomepageSection["language"]),
        eq(cmsHomepageSections.enabled, true),
      ),
    )
    .orderBy(asc(cmsHomepageSections.sortOrder));
}

export async function getHomepageSection(
  db: Db,
  sectionKey: string,
  language: string,
): Promise<CmsHomepageSection | null> {
  const [row] = await db
    .select()
    .from(cmsHomepageSections)
    .where(
      and(
        eq(cmsHomepageSections.sectionKey, sectionKey),
        eq(
          cmsHomepageSections.language,
          language as CmsHomepageSection["language"],
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertHomepageSection(
  db: Db,
  sectionKey: string,
  language: string,
  data: {
    content: Record<string, unknown>;
    enabled?: boolean;
    sortOrder?: number;
  },
): Promise<CmsHomepageSection> {
  const values: Record<string, unknown> = {
    sectionKey,
    language,
    content: data.content,
  };
  if (data.enabled !== undefined) values["enabled"] = data.enabled;
  if (data.sortOrder !== undefined) values["sortOrder"] = data.sortOrder;

  const onConflictSet: Record<string, unknown> = {
    content: data.content,
    updatedAt: new Date(),
  };
  if (data.enabled !== undefined) onConflictSet["enabled"] = data.enabled;
  if (data.sortOrder !== undefined) onConflictSet["sortOrder"] = data.sortOrder;

  const [row] = await db
    .insert(cmsHomepageSections)
    .values(values as typeof cmsHomepageSections.$inferInsert)
    .onConflictDoUpdate({
      target: [cmsHomepageSections.sectionKey, cmsHomepageSections.language],
      set: onConflictSet as Partial<typeof cmsHomepageSections.$inferInsert>,
    })
    .returning();
  return row!;
}

// ── Scheduling helper ──────────────────────────────────────────────────────────

export async function publishScheduledContent(db: Db): Promise<{
  pages: number;
  posts: number;
  changelog: number;
  cases: number;
  features: number;
}> {
  const now = new Date();

  const [pagesResult, postsResult, changelogResult, casesResult, featuresResult] =
    await Promise.all([
      db
        .update(cmsPages)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(
          and(eq(cmsPages.status, "scheduled"), lte(cmsPages.scheduledAt, now)),
        )
        .returning({ id: cmsPages.id }),

      db
        .update(cmsPosts)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(
          and(eq(cmsPosts.status, "scheduled"), lte(cmsPosts.scheduledAt, now)),
        )
        .returning({ id: cmsPosts.id }),

      db
        .update(cmsChangelogEntries)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(
          and(
            eq(cmsChangelogEntries.status, "scheduled"),
            lte(cmsChangelogEntries.scheduledAt, now),
          ),
        )
        .returning({ id: cmsChangelogEntries.id }),

      db
        .update(cmsCases)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(
          and(eq(cmsCases.status, "scheduled"), lte(cmsCases.scheduledAt, now)),
        )
        .returning({ id: cmsCases.id }),

      db
        .update(cmsFeatures)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(eq(cmsFeatures.status, "scheduled"))
        .returning({ id: cmsFeatures.id }),
    ]);

  return {
    pages: pagesResult.length,
    posts: postsResult.length,
    changelog: changelogResult.length,
    cases: casesResult.length,
    features: featuresResult.length,
  };
}

// ── Sitemap data ──────────────────────────────────────────────────────────────

export async function getSitemapData(db: Db): Promise<{
  pages: Array<{ slug: string; language: string; updatedAt: Date }>;
  posts: Array<{ slug: string; language: string; updatedAt: Date }>;
  cases: Array<{ slug: string; language: string; updatedAt: Date }>;
  features: Array<{ slug: string; language: string; updatedAt: Date }>;
  integrations: Array<{ slug: string; language: string; updatedAt: Date }>;
}> {
  const [pages, posts, cases, features, integrations] = await Promise.all([
    db
      .select({ slug: cmsPages.slug, language: cmsPages.language, updatedAt: cmsPages.updatedAt })
      .from(cmsPages)
      .where(eq(cmsPages.status, "published")),

    db
      .select({ slug: cmsPosts.slug, language: cmsPosts.language, updatedAt: cmsPosts.updatedAt })
      .from(cmsPosts)
      .where(eq(cmsPosts.status, "published")),

    db
      .select({ slug: cmsCases.slug, language: cmsCases.language, updatedAt: cmsCases.updatedAt })
      .from(cmsCases)
      .where(eq(cmsCases.status, "published")),

    db
      .select({
        slug: cmsFeatures.slug,
        language: cmsFeatures.language,
        updatedAt: cmsFeatures.updatedAt,
      })
      .from(cmsFeatures)
      .where(eq(cmsFeatures.status, "published")),

    db
      .select({
        slug: cmsIntegrations.slug,
        language: cmsIntegrations.language,
        updatedAt: cmsIntegrations.updatedAt,
      })
      .from(cmsIntegrations)
      .where(eq(cmsIntegrations.status, "active")),
  ]);

  return { pages, posts, cases, features, integrations };
}

// ── Roadmap items ──────────────────────────────────────────────────────────────

export async function listCmsRoadmapItems(
  db: Db,
  opts: {
    status?: string;
    language?: string;
    category?: string;
    quarter?: string;
    itemStatus?: string;
    tags?: string[];
    page: number;
    limit: number;
  },
): Promise<{ items: CmsRoadmapItem[]; total: number; page: number; limit: number }> {
  const conditions = [];
  if (opts.status)
    conditions.push(eq(cmsRoadmapItems.status, opts.status as CmsRoadmapItem["status"]));
  if (opts.language)
    conditions.push(
      eq(cmsRoadmapItems.language, opts.language as CmsRoadmapItem["language"]),
    );
  if (opts.category) conditions.push(eq(cmsRoadmapItems.category, opts.category));
  if (opts.quarter) conditions.push(eq(cmsRoadmapItems.quarter, opts.quarter));
  if (opts.itemStatus)
    conditions.push(eq(cmsRoadmapItems.itemStatus, opts.itemStatus as CmsRoadmapItem["itemStatus"]));
  if (opts.tags && opts.tags.length > 0)
    conditions.push(sql`${cmsRoadmapItems.tags} ?| array[${sql.join(opts.tags.map(t => sql`${t}`), sql`, `)}]`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsRoadmapItems)
      .where(where)
      .orderBy(asc(cmsRoadmapItems.priority))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsRoadmapItems)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0, page: opts.page, limit: opts.limit };
}

export async function getCmsRoadmapItemBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsRoadmapItem | null> {
  const [row] = await db
    .select()
    .from(cmsRoadmapItems)
    .where(
      and(
        eq(cmsRoadmapItems.slug, slug),
        eq(cmsRoadmapItems.language, language as CmsRoadmapItem["language"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsRoadmapItemById(
  db: Db,
  id: string,
): Promise<CmsRoadmapItem | null> {
  const [row] = await db
    .select()
    .from(cmsRoadmapItems)
    .where(eq(cmsRoadmapItems.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsRoadmapItem(
  db: Db,
  data: {
    slug: string;
    title: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    category?: string;
    priority?: number;
    quarter?: string;
    body?: string;
    excerpt?: string;
    votes?: number;
    itemStatus?: "considering" | "planned" | "in_progress" | "shipped";
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsRoadmapItem> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.category !== undefined) insert["category"] = data.category;
  if (data.priority !== undefined) insert["priority"] = data.priority;
  if (data.quarter !== undefined) insert["quarter"] = data.quarter;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.excerpt !== undefined) insert["excerpt"] = data.excerpt;
  if (data.votes !== undefined) insert["votes"] = data.votes;
  if (data.itemStatus !== undefined) insert["itemStatus"] = data.itemStatus;
  if (data.tags !== undefined) insert["tags"] = data.tags;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) insert["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsRoadmapItems)
    .values(insert as typeof cmsRoadmapItems.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsRoadmapItem(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    category?: string;
    priority?: number;
    quarter?: string;
    body?: string;
    excerpt?: string;
    votes?: number;
    itemStatus?: "considering" | "planned" | "in_progress" | "shipped";
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsRoadmapItem | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.category !== undefined) update["category"] = data.category;
  if (data.priority !== undefined) update["priority"] = data.priority;
  if (data.quarter !== undefined) update["quarter"] = data.quarter;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.excerpt !== undefined) update["excerpt"] = data.excerpt;
  if (data.votes !== undefined) update["votes"] = data.votes;
  if (data.itemStatus !== undefined) update["itemStatus"] = data.itemStatus;
  if (data.tags !== undefined) update["tags"] = data.tags;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) update["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") {
    const existing = await getCmsRoadmapItemById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsRoadmapItems)
    .set(update as Partial<typeof cmsRoadmapItems.$inferInsert>)
    .where(eq(cmsRoadmapItems.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsRoadmapItem(db: Db, id: string): Promise<void> {
  await db.delete(cmsRoadmapItems).where(eq(cmsRoadmapItems.id, id));
}

// ── Docs articles ──────────────────────────────────────────────────────────────

export async function listCmsDocsArticles(
  db: Db,
  opts: {
    status?: string;
    language?: string;
    section?: string;
    page: number;
    limit: number;
  },
): Promise<{ items: CmsDocsArticle[]; total: number; page: number; limit: number }> {
  const conditions = [];
  if (opts.status)
    conditions.push(eq(cmsDocsArticles.status, opts.status as CmsDocsArticle["status"]));
  if (opts.language)
    conditions.push(
      eq(cmsDocsArticles.language, opts.language as CmsDocsArticle["language"]),
    );
  if (opts.section) conditions.push(eq(cmsDocsArticles.section, opts.section));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(cmsDocsArticles)
      .where(where)
      .orderBy(asc(cmsDocsArticles.sortOrder))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(cmsDocsArticles)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0, page: opts.page, limit: opts.limit };
}

export async function getCmsDocsArticleBySlug(
  db: Db,
  slug: string,
  language: string,
): Promise<CmsDocsArticle | null> {
  const [row] = await db
    .select()
    .from(cmsDocsArticles)
    .where(
      and(
        eq(cmsDocsArticles.slug, slug),
        eq(cmsDocsArticles.language, language as CmsDocsArticle["language"]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getCmsDocsArticleById(
  db: Db,
  id: string,
): Promise<CmsDocsArticle | null> {
  const [row] = await db
    .select()
    .from(cmsDocsArticles)
    .where(eq(cmsDocsArticles.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsDocsArticle(
  db: Db,
  data: {
    slug: string;
    title: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    section?: string;
    sortOrder?: number;
    parentId?: string;
    body?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsDocsArticle> {
  const insert: Record<string, unknown> = {
    slug: data.slug,
    title: data.title,
  };

  if (data.status !== undefined) insert["status"] = data.status;
  if (data.language !== undefined) insert["language"] = data.language;
  if (data.section !== undefined) insert["section"] = data.section;
  if (data.sortOrder !== undefined) insert["sortOrder"] = data.sortOrder;
  if (data.parentId !== undefined) insert["parentId"] = data.parentId;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.excerpt !== undefined) insert["excerpt"] = data.excerpt;
  if (data.seoTitle !== undefined) insert["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) insert["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) insert["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) insert["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") insert["publishedAt"] = nowPublishedAt();

  const [row] = await db
    .insert(cmsDocsArticles)
    .values(insert as typeof cmsDocsArticles.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsDocsArticle(
  db: Db,
  id: string,
  data: {
    slug?: string;
    title?: string;
    status?: "draft" | "published" | "scheduled" | "archived";
    language?: "sv" | "en" | "pl";
    section?: string;
    sortOrder?: number;
    parentId?: string;
    body?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
  },
): Promise<CmsDocsArticle | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.slug !== undefined) update["slug"] = data.slug;
  if (data.title !== undefined) update["title"] = data.title;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.section !== undefined) update["section"] = data.section;
  if (data.sortOrder !== undefined) update["sortOrder"] = data.sortOrder;
  if (data.parentId !== undefined) update["parentId"] = data.parentId;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.excerpt !== undefined) update["excerpt"] = data.excerpt;
  if (data.seoTitle !== undefined) update["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) update["seoDescription"] = data.seoDescription;
  if (data.ogImageUrl !== undefined) update["ogImageUrl"] = data.ogImageUrl;
  if (data.canonicalUrl !== undefined) update["canonicalUrl"] = data.canonicalUrl;

  if (data.status === "published") {
    const existing = await getCmsDocsArticleById(db, id);
    if (existing && !existing.publishedAt) {
      update["publishedAt"] = nowPublishedAt();
    }
  }

  const [row] = await db
    .update(cmsDocsArticles)
    .set(update as Partial<typeof cmsDocsArticles.$inferInsert>)
    .where(eq(cmsDocsArticles.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCmsDocsArticle(db: Db, id: string): Promise<void> {
  await db.delete(cmsDocsArticles).where(eq(cmsDocsArticles.id, id));
}

// ── Legal versions ──────────────────────────────────────────────────────────────

export async function listCmsLegalVersions(
  db: Db,
  pageType: LegalPageType,
  language: string,
  includeNonPublished = false,
): Promise<CmsLegalVersion[]> {
  const conditions = [
    eq(cmsLegalVersions.pageType, pageType),
    eq(cmsLegalVersions.language, language as CmsLegalVersion["language"]),
  ];
  if (!includeNonPublished) {
    conditions.push(eq(cmsLegalVersions.status, "published"));
  }

  return db
    .select()
    .from(cmsLegalVersions)
    .where(and(...conditions))
    .orderBy(desc(cmsLegalVersions.effectiveDate));
}

export async function getLatestPublishedLegalVersion(
  db: Db,
  pageType: LegalPageType,
  language: string,
): Promise<CmsLegalVersion | null> {
  const [row] = await db
    .select()
    .from(cmsLegalVersions)
    .where(
      and(
        eq(cmsLegalVersions.pageType, pageType),
        eq(cmsLegalVersions.language, language as CmsLegalVersion["language"]),
        eq(cmsLegalVersions.status, "published"),
      ),
    )
    .orderBy(desc(cmsLegalVersions.effectiveDate))
    .limit(1);
  return row ?? null;
}

export async function getLegalVersionById(
  db: Db,
  id: string,
): Promise<CmsLegalVersion | null> {
  const [row] = await db
    .select()
    .from(cmsLegalVersions)
    .where(eq(cmsLegalVersions.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCmsLegalVersion(
  db: Db,
  data: {
    pageType: LegalPageType;
    language?: "sv" | "en" | "pl";
    versionNumber: string;
    versionLabel?: string;
    effectiveDate: string;
    status?: "draft" | "published" | "archived";
    body?: string;
    summaryOfChanges?: string;
  },
): Promise<CmsLegalVersion> {
  const insert: Record<string, unknown> = {
    pageType: data.pageType,
    versionNumber: data.versionNumber,
    effectiveDate: data.effectiveDate,
  };

  if (data.language !== undefined) insert["language"] = data.language;
  if (data.versionLabel !== undefined) insert["versionLabel"] = data.versionLabel;
  if (data.status !== undefined) insert["status"] = data.status;
  if (data.body !== undefined) insert["body"] = data.body;
  if (data.summaryOfChanges !== undefined) insert["summaryOfChanges"] = data.summaryOfChanges;

  const [row] = await db
    .insert(cmsLegalVersions)
    .values(insert as typeof cmsLegalVersions.$inferInsert)
    .returning();
  return row!;
}

export async function updateCmsLegalVersion(
  db: Db,
  id: string,
  data: {
    pageType?: LegalPageType;
    language?: "sv" | "en" | "pl";
    versionNumber?: string;
    versionLabel?: string;
    effectiveDate?: string;
    status?: "draft" | "published" | "archived";
    body?: string;
    summaryOfChanges?: string;
  },
): Promise<CmsLegalVersion | null> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (data.pageType !== undefined) update["pageType"] = data.pageType;
  if (data.language !== undefined) update["language"] = data.language;
  if (data.versionNumber !== undefined) update["versionNumber"] = data.versionNumber;
  if (data.versionLabel !== undefined) update["versionLabel"] = data.versionLabel;
  if (data.effectiveDate !== undefined) update["effectiveDate"] = data.effectiveDate;
  if (data.status !== undefined) update["status"] = data.status;
  if (data.body !== undefined) update["body"] = data.body;
  if (data.summaryOfChanges !== undefined) update["summaryOfChanges"] = data.summaryOfChanges;

  const [row] = await db
    .update(cmsLegalVersions)
    .set(update as Partial<typeof cmsLegalVersions.$inferInsert>)
    .where(eq(cmsLegalVersions.id, id))
    .returning();
  return row ?? null;
}

export async function publishCmsLegalVersion(
  db: Db,
  id: string,
): Promise<CmsLegalVersion | null> {
  const [row] = await db
    .update(cmsLegalVersions)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(cmsLegalVersions.id, id))
    .returning();
  return row ?? null;
}
