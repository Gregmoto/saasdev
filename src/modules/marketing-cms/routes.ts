import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as CmsService from "./service.js";
import {
  cmsListQuerySchema,
  cmsPageSchema,
  cmsPageUpdateSchema,
  cmsPostSchema,
  cmsPostUpdateSchema,
  cmsChangelogSchema,
  cmsChangelogUpdateSchema,
  cmsCaseSchema,
  cmsCaseUpdateSchema,
  cmsIntegrationSchema,
  cmsIntegrationUpdateSchema,
  cmsFaqSchema,
  cmsFaqUpdateSchema,
  cmsFeatureSchema,
  cmsFeatureUpdateSchema,
  cmsHomepageSectionUpsertSchema,
  cmsRoadmapItemSchema,
  cmsRoadmapItemUpdateSchema,
  cmsDocsArticleSchema,
  cmsDocsArticleUpdateSchema,
} from "./schemas.js";

const idParam = z.object({ id: z.string().uuid() });
const slugParam = z.object({ slug: z.string().min(1) });
const langQuery = z.object({ lang: z.enum(["sv", "en", "pl"]).default("sv") });
const adminPreHandler = [requireAuth, requirePlatformAdmin];

const NOT_FOUND = { statusCode: 404, error: "Not Found" } as const;

export async function marketingCmsRoutes(app: FastifyInstance): Promise<void> {
  // ── Public: Pages ─────────────────────────────────────────────────────────────

  app.get("/api/cms/pages/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const page = await CmsService.getCmsPageBySlug(app.db, slug, lang);
    if (!page || page.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Page not found" });
    }
    return reply.send(page);
  });

  // ── Public: Posts ─────────────────────────────────────────────────────────────

  app.get("/api/cms/posts", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
      type: raw["type"],
    });
    const opts: { status: string; language?: string; type?: string; page: number; limit: number } =
      { status: "published", page: query.page, limit: query.limit };
    if (query.language !== undefined) opts.language = query.language;
    if (query.type !== undefined) opts.type = query.type;
    const result = await CmsService.listCmsPosts(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/posts/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const post = await CmsService.getCmsPostBySlug(app.db, slug, lang);
    if (!post || post.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Post not found" });
    }
    return reply.send(post);
  });

  // ── Public: Changelog ─────────────────────────────────────────────────────────

  app.get("/api/cms/changelog", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: { status: string; language?: string; page: number; limit: number } = {
      status: "published",
      page: query.page,
      limit: query.limit,
    };
    if (query.language !== undefined) opts.language = query.language;
    const result = await CmsService.listCmsChangelog(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/changelog/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const entry = await CmsService.getCmsChangelogBySlug(app.db, slug, lang);
    if (!entry || entry.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Changelog entry not found" });
    }
    return reply.send(entry);
  });

  // ── Public: Cases ─────────────────────────────────────────────────────────────

  app.get("/api/cms/cases", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: { status: string; language?: string; page: number; limit: number } = {
      status: "published",
      page: query.page,
      limit: query.limit,
    };
    if (query.language !== undefined) opts.language = query.language;
    const result = await CmsService.listCmsCases(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/cases/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const item = await CmsService.getCmsCaseBySlug(app.db, slug, lang);
    if (!item || item.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Case not found" });
    }
    return reply.send(item);
  });

  // ── Public: Integrations ──────────────────────────────────────────────────────

  app.get("/api/cms/integrations", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: {
      status: string;
      language?: string;
      category?: string;
      page: number;
      limit: number;
    } = { status: "active", page: query.page, limit: query.limit };
    if (query.language !== undefined) opts.language = query.language;
    const categoryRaw = raw["category"];
    if (typeof categoryRaw === "string" && categoryRaw) opts.category = categoryRaw;
    const result = await CmsService.listCmsIntegrations(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/integrations/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const item = await CmsService.getCmsIntegrationBySlug(app.db, slug, lang);
    if (!item) {
      return reply.status(404).send({ ...NOT_FOUND, message: "Integration not found" });
    }
    return reply.send(item);
  });

  // ── Public: FAQs ──────────────────────────────────────────────────────────────

  app.get("/api/cms/faqs", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: {
      status: string;
      language?: string;
      category?: string;
      page: number;
      limit: number;
    } = { status: "published", page: query.page, limit: query.limit };
    if (query.language !== undefined) opts.language = query.language;
    const categoryRaw = raw["category"];
    if (typeof categoryRaw === "string" && categoryRaw) opts.category = categoryRaw;
    const result = await CmsService.listCmsFaqs(app.db, opts);
    return reply.send(result);
  });

  // ── Public: Features ──────────────────────────────────────────────────────────

  app.get("/api/cms/features", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: { status: string; language?: string; page: number; limit: number } = {
      status: "published",
      page: query.page,
      limit: query.limit,
    };
    if (query.language !== undefined) opts.language = query.language;
    const result = await CmsService.listCmsFeatures(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/features/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const item = await CmsService.getCmsFeatureBySlug(app.db, slug, lang);
    if (!item || item.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Feature not found" });
    }
    return reply.send(item);
  });

  // ── Public: Homepage sections ─────────────────────────────────────────────────

  app.get("/api/cms/homepage", async (request, reply) => {
    const { lang } = langQuery.parse(request.query);
    const sections = await CmsService.getHomepageSections(app.db, lang);
    return reply.send(sections);
  });

  app.get("/api/cms/homepage/:sectionKey", async (request, reply) => {
    const { sectionKey } = z.object({ sectionKey: z.string().min(1) }).parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const section = await CmsService.getHomepageSection(app.db, sectionKey, lang);
    if (!section) {
      return reply.status(404).send({ ...NOT_FOUND, message: "Section not found" });
    }
    return reply.send(section);
  });

  // ── Public: Sitemap ───────────────────────────────────────────────────────────

  app.get("/api/cms/sitemap", async (_request, reply) => {
    const data = await CmsService.getSitemapData(app.db);
    return reply.send(data);
  });

  // ── Admin: Pages ──────────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/pages",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsPageSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsPage>[1] = {
        slug: body.slug,
        title: body.title,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.sections !== undefined) data.sections = body.sections;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      if (body.ogTitle !== undefined) data.ogTitle = body.ogTitle;
      if (body.ogDescription !== undefined) data.ogDescription = body.ogDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.hreflang !== undefined) data.hreflang = body.hreflang;
      if (body.breadcrumb !== undefined) data.breadcrumb = body.breadcrumb;
      const result = await CmsService.createCmsPage(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/pages/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsPageUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsPage>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.sections !== undefined) data.sections = body.sections;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      if (body.ogTitle !== undefined) data.ogTitle = body.ogTitle;
      if (body.ogDescription !== undefined) data.ogDescription = body.ogDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.hreflang !== undefined) data.hreflang = body.hreflang;
      if (body.breadcrumb !== undefined) data.breadcrumb = body.breadcrumb;
      const result = await CmsService.updateCmsPage(app.db, id, data);
      if (!result) return reply.status(404).send({ ...NOT_FOUND, message: "Page not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/pages/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsPage(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Posts ──────────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/posts",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsPostSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsPost>[1] = {
        slug: body.slug,
        title: body.title,
        type: body.type,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.body !== undefined) data.body = body.body;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.authorName !== undefined) data.authorName = body.authorName;
      if (body.authorTitle !== undefined) data.authorTitle = body.authorTitle;
      if (body.authorAvatarUrl !== undefined) data.authorAvatarUrl = body.authorAvatarUrl;
      if (body.category !== undefined) data.category = body.category;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.readTimeMinutes !== undefined) data.readTimeMinutes = body.readTimeMinutes;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      if (body.hreflang !== undefined) data.hreflang = body.hreflang;
      const result = await CmsService.createCmsPost(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/posts/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsPostUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsPost>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.type !== undefined) data.type = body.type;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.body !== undefined) data.body = body.body;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.authorName !== undefined) data.authorName = body.authorName;
      if (body.authorTitle !== undefined) data.authorTitle = body.authorTitle;
      if (body.authorAvatarUrl !== undefined) data.authorAvatarUrl = body.authorAvatarUrl;
      if (body.category !== undefined) data.category = body.category;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.readTimeMinutes !== undefined) data.readTimeMinutes = body.readTimeMinutes;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      if (body.hreflang !== undefined) data.hreflang = body.hreflang;
      const result = await CmsService.updateCmsPost(app.db, id, data);
      if (!result) return reply.status(404).send({ ...NOT_FOUND, message: "Post not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/posts/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsPost(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Changelog ──────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/changelog",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsChangelogSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsChangelog>[1] = {
        slug: body.slug,
        title: body.title,
      };
      if (body.version !== undefined) data.version = body.version;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.body !== undefined) data.body = body.body;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.category !== undefined) data.category = body.category;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      const result = await CmsService.createCmsChangelog(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/changelog/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsChangelogUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsChangelog>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.version !== undefined) data.version = body.version;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.body !== undefined) data.body = body.body;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.category !== undefined) data.category = body.category;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      const result = await CmsService.updateCmsChangelog(app.db, id, data);
      if (!result)
        return reply.status(404).send({ ...NOT_FOUND, message: "Changelog entry not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/changelog/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsChangelog(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Cases ──────────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/cases",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsCaseSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsCase>[1] = {
        slug: body.slug,
        companyName: body.companyName,
        headline: body.headline,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.industry !== undefined) data.industry = body.industry;
      if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.subheadline !== undefined) data.subheadline = body.subheadline;
      if (body.body !== undefined) data.body = body.body;
      if (body.results !== undefined) data.results = body.results;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.ctaText !== undefined) data.ctaText = body.ctaText;
      if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      const result = await CmsService.createCmsCase(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/cases/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsCaseUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsCase>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.companyName !== undefined) data.companyName = body.companyName;
      if (body.headline !== undefined) data.headline = body.headline;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;
      if (body.industry !== undefined) data.industry = body.industry;
      if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.subheadline !== undefined) data.subheadline = body.subheadline;
      if (body.body !== undefined) data.body = body.body;
      if (body.results !== undefined) data.results = body.results;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.ctaText !== undefined) data.ctaText = body.ctaText;
      if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      const result = await CmsService.updateCmsCase(app.db, id, data);
      if (!result) return reply.status(404).send({ ...NOT_FOUND, message: "Case not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/cases/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsCase(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Integrations ───────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/integrations",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsIntegrationSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsIntegration>[1] = {
        slug: body.slug,
        name: body.name,
        category: body.category,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.description !== undefined) data.description = body.description;
      if (body.longDescription !== undefined) data.longDescription = body.longDescription;
      if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.docsUrl !== undefined) data.docsUrl = body.docsUrl;
      if (body.marketingUrl !== undefined) data.marketingUrl = body.marketingUrl;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.features !== undefined) data.features = body.features;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      const result = await CmsService.createCmsIntegration(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/integrations/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsIntegrationUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsIntegration>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.name !== undefined) data.name = body.name;
      if (body.category !== undefined) data.category = body.category;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.description !== undefined) data.description = body.description;
      if (body.longDescription !== undefined) data.longDescription = body.longDescription;
      if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.docsUrl !== undefined) data.docsUrl = body.docsUrl;
      if (body.marketingUrl !== undefined) data.marketingUrl = body.marketingUrl;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.features !== undefined) data.features = body.features;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      const result = await CmsService.updateCmsIntegration(app.db, id, data);
      if (!result)
        return reply.status(404).send({ ...NOT_FOUND, message: "Integration not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/integrations/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsIntegration(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: FAQs ───────────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/faqs",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsFaqSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsFaq>[1] = {
        question: body.question,
        answer: body.answer,
      };
      if (body.language !== undefined) data.language = body.language;
      if (body.category !== undefined) data.category = body.category;
      if (body.status !== undefined) data.status = body.status;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.showOnPages !== undefined) data.showOnPages = body.showOnPages;
      const result = await CmsService.createCmsFaq(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/faqs/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsFaqUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsFaq>[2] = {};
      if (body.question !== undefined) data.question = body.question;
      if (body.answer !== undefined) data.answer = body.answer;
      if (body.language !== undefined) data.language = body.language;
      if (body.category !== undefined) data.category = body.category;
      if (body.status !== undefined) data.status = body.status;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.showOnPages !== undefined) data.showOnPages = body.showOnPages;
      const result = await CmsService.updateCmsFaq(app.db, id, data);
      if (!result) return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/faqs/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsFaq(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Features ───────────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/features",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = cmsFeatureSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsFeature>[1] = {
        slug: body.slug,
        title: body.title,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.tagline !== undefined) data.tagline = body.tagline;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.iconUrl !== undefined) data.iconUrl = body.iconUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.category !== undefined) data.category = body.category;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.body !== undefined) data.body = body.body;
      if (body.benefits !== undefined)
        data.benefits = body.benefits as Array<{ title: string; description: string; iconUrl?: string }>;
      if (body.screenshots !== undefined)
        data.screenshots = body.screenshots as Array<{ url: string; alt: string; caption?: string }>;
      if (body.relatedFeatureSlugs !== undefined)
        data.relatedFeatureSlugs = body.relatedFeatureSlugs;
      if (body.faqItems !== undefined) data.faqItems = body.faqItems;
      if (body.ctaText !== undefined) data.ctaText = body.ctaText;
      if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.createCmsFeature(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/features/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsFeatureUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsFeature>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.tagline !== undefined) data.tagline = body.tagline;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.iconUrl !== undefined) data.iconUrl = body.iconUrl;
      if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
      if (body.category !== undefined) data.category = body.category;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.body !== undefined) data.body = body.body;
      if (body.benefits !== undefined)
        data.benefits = body.benefits as Array<{ title: string; description: string; iconUrl?: string }>;
      if (body.screenshots !== undefined)
        data.screenshots = body.screenshots as Array<{ url: string; alt: string; caption?: string }>;
      if (body.relatedFeatureSlugs !== undefined)
        data.relatedFeatureSlugs = body.relatedFeatureSlugs;
      if (body.faqItems !== undefined) data.faqItems = body.faqItems;
      if (body.ctaText !== undefined) data.ctaText = body.ctaText;
      if (body.ctaUrl !== undefined) data.ctaUrl = body.ctaUrl;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.updateCmsFeature(app.db, id, data);
      if (!result) return reply.status(404).send({ ...NOT_FOUND, message: "Feature not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/features/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsFeature(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Homepage sections ──────────────────────────────────────────────────

  app.put(
    "/api/platform/cms/homepage/:sectionKey",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { sectionKey } = z.object({ sectionKey: z.string().min(1) }).parse(request.params);
      const body = cmsHomepageSectionUpsertSchema.parse(request.body);
      const lang = body.language ?? "sv";
      const data: Parameters<typeof CmsService.upsertHomepageSection>[3] = {
        content: body.content,
      };
      if (body.enabled !== undefined) data.enabled = body.enabled;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      const result = await CmsService.upsertHomepageSection(app.db, sectionKey, lang, data);
      return reply.send(result);
    },
  );

  // ── Admin: Publish scheduled ──────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/publish-scheduled",
    { preHandler: [...adminPreHandler] },
    async (_request, reply) => {
      const counts = await CmsService.publishScheduledContent(app.db);
      return reply.send({ published: counts });
    },
  );

  // ── Public: Roadmap ───────────────────────────────────────────────────────────

  app.get("/api/cms/roadmap", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: {
      status: string;
      language?: string;
      category?: string;
      quarter?: string;
      page: number;
      limit: number;
    } = { status: "published", page: query.page, limit: query.limit };
    if (query.language !== undefined) opts.language = query.language;
    const categoryRaw = raw["category"];
    if (typeof categoryRaw === "string" && categoryRaw) opts.category = categoryRaw;
    const quarterRaw = raw["quarter"];
    if (typeof quarterRaw === "string" && quarterRaw) opts.quarter = quarterRaw;
    const result = await CmsService.listCmsRoadmapItems(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/roadmap/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const item = await CmsService.getCmsRoadmapItemBySlug(app.db, slug, lang);
    if (!item || item.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Roadmap item not found" });
    }
    return reply.send(item);
  });

  // ── Public: Docs ──────────────────────────────────────────────────────────────

  app.get("/api/cms/docs", async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    const query = cmsListQuerySchema.parse({
      page: raw["page"],
      limit: raw["limit"],
      language: raw["lang"],
    });
    const opts: {
      status: string;
      language?: string;
      section?: string;
      page: number;
      limit: number;
    } = { status: "published", page: query.page, limit: query.limit };
    if (query.language !== undefined) opts.language = query.language;
    const sectionRaw = raw["section"];
    if (typeof sectionRaw === "string" && sectionRaw) opts.section = sectionRaw;
    const result = await CmsService.listCmsDocsArticles(app.db, opts);
    return reply.send(result);
  });

  app.get("/api/cms/docs/:slug", async (request, reply) => {
    const { slug } = slugParam.parse(request.params);
    const { lang } = langQuery.parse(request.query);
    const item = await CmsService.getCmsDocsArticleBySlug(app.db, slug, lang);
    if (!item || item.status !== "published") {
      return reply.status(404).send({ ...NOT_FOUND, message: "Docs article not found" });
    }
    return reply.send(item);
  });

  // ── Admin: Roadmap items ──────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/roadmap",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const body = cmsRoadmapItemSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsRoadmapItem>[1] = {
        slug: body.slug,
        title: body.title,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.category !== undefined) data.category = body.category;
      if (body.priority !== undefined) data.priority = body.priority;
      if (body.quarter !== undefined) data.quarter = body.quarter;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.votes !== undefined) data.votes = body.votes;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.createCmsRoadmapItem(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/roadmap/:id",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsRoadmapItemUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsRoadmapItem>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.category !== undefined) data.category = body.category;
      if (body.priority !== undefined) data.priority = body.priority;
      if (body.quarter !== undefined) data.quarter = body.quarter;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.votes !== undefined) data.votes = body.votes;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.updateCmsRoadmapItem(app.db, id, data);
      if (!result)
        return reply.status(404).send({ ...NOT_FOUND, message: "Roadmap item not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/roadmap/:id",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsRoadmapItem(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Docs articles ──────────────────────────────────────────────────────

  app.post(
    "/api/platform/cms/docs",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const body = cmsDocsArticleSchema.parse(request.body);
      const data: Parameters<typeof CmsService.createCmsDocsArticle>[1] = {
        slug: body.slug,
        title: body.title,
      };
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.section !== undefined) data.section = body.section;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.parentId !== undefined) data.parentId = body.parentId;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.createCmsDocsArticle(app.db, data);
      return reply.status(201).send(result);
    },
  );

  app.patch(
    "/api/platform/cms/docs/:id",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = cmsDocsArticleUpdateSchema.parse(request.body);
      const data: Parameters<typeof CmsService.updateCmsDocsArticle>[2] = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.title !== undefined) data.title = body.title;
      if (body.status !== undefined) data.status = body.status;
      if (body.language !== undefined) data.language = body.language;
      if (body.section !== undefined) data.section = body.section;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.parentId !== undefined) data.parentId = body.parentId;
      if (body.body !== undefined) data.body = body.body;
      if (body.excerpt !== undefined) data.excerpt = body.excerpt;
      if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle;
      if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription;
      if (body.ogImageUrl !== undefined) data.ogImageUrl = body.ogImageUrl;
      if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl;
      const result = await CmsService.updateCmsDocsArticle(app.db, id, data);
      if (!result)
        return reply.status(404).send({ ...NOT_FOUND, message: "Docs article not found" });
      return reply.send(result);
    },
  );

  app.delete(
    "/api/platform/cms/docs/:id",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      await CmsService.deleteCmsDocsArticle(app.db, id);
      return reply.status(204).send();
    },
  );
}
