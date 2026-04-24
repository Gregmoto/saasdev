import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { storeSeoSettings, storeRedirects, redirectTypeEnum } from "../../db/schema/seo.js";
import { products } from "../../db/schema/products.js";
import { productVariants } from "../../db/schema/products.js";

const storePreHandler = [requireAuth, requireStoreAccountContext];

export async function seoRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/seo/settings ─────────────────────────────────────────────────
  app.get(
    "/api/seo/settings",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      let [settings] = await app.db
        .select()
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      if (!settings) {
        const [created] = await app.db
          .insert(storeSeoSettings)
          .values({ storeAccountId: storeId })
          .returning();
        settings = created!;
      }

      return reply.send(settings);
    },
  );

  // ── PUT /api/seo/settings ─────────────────────────────────────────────────
  app.put(
    "/api/seo/settings",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = z.object({
        robotsRules: z.array(z.string()).optional(),
        canonicalBase: z.string().max(500).optional().nullable(),
        hreflangMap: z.record(z.string()).optional(),
        googleMerchantId: z.string().max(100).optional().nullable(),
        merchantFeedIncludeOutOfStock: z.boolean().optional(),
      }).parse(request.body);

      const storeId = request.storeAccount.id;

      // Upsert
      const existing = await app.db
        .select({ id: storeSeoSettings.id })
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      if (existing.length === 0) {
        await app.db.insert(storeSeoSettings).values({
          storeAccountId: storeId,
          ...body,
        });
      } else {
        await app.db
          .update(storeSeoSettings)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(storeSeoSettings.storeAccountId, storeId));
      }

      const [updated] = await app.db
        .select()
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      return reply.send(updated);
    },
  );

  // ── GET /api/seo/redirects ────────────────────────────────────────────────
  app.get(
    "/api/seo/redirects",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = z.object({
        shopId: z.string().uuid().optional(),
        limit: z.coerce.number().min(1).max(500).default(100),
        offset: z.coerce.number().min(0).default(0),
      }).parse(request.query);

      const storeId = request.storeAccount.id;
      const conditions = [eq(storeRedirects.storeAccountId, storeId)];
      if (q.shopId) conditions.push(eq(storeRedirects.shopId, q.shopId));

      const rows = await app.db
        .select()
        .from(storeRedirects)
        .where(and(...conditions))
        .orderBy(desc(storeRedirects.createdAt))
        .limit(q.limit)
        .offset(q.offset);

      return reply.send(rows);
    },
  );

  // ── POST /api/seo/redirects ───────────────────────────────────────────────
  app.post(
    "/api/seo/redirects",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = z.object({
        fromPath: z.string().max(2048),
        toPath: z.string().max(2048),
        type: z.enum(redirectTypeEnum.enumValues),
        shopId: z.string().uuid().optional().nullable(),
        note: z.string().optional().nullable(),
      }).parse(request.body);

      const storeId = request.storeAccount.id;

      const [redirect] = await app.db
        .insert(storeRedirects)
        .values({
          storeAccountId: storeId,
          fromPath: body.fromPath,
          toPath: body.toPath,
          type: body.type,
          shopId: body.shopId ?? null,
          note: body.note ?? null,
        })
        .returning();

      return reply.status(201).send(redirect);
    },
  );

  // ── PATCH /api/seo/redirects/:id ──────────────────────────────────────────
  app.patch(
    "/api/seo/redirects/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({
        toPath: z.string().max(2048).optional(),
        type: z.enum(redirectTypeEnum.enumValues).optional(),
        isActive: z.boolean().optional(),
        note: z.string().optional().nullable(),
      }).parse(request.body);

      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select({ id: storeRedirects.id })
        .from(storeRedirects)
        .where(and(eq(storeRedirects.id, id), eq(storeRedirects.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Redirect not found" });
      }

      const [updated] = await app.db
        .update(storeRedirects)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(storeRedirects.id, id))
        .returning();

      return reply.send(updated);
    },
  );

  // ── DELETE /api/seo/redirects/:id ─────────────────────────────────────────
  app.delete(
    "/api/seo/redirects/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select({ id: storeRedirects.id })
        .from(storeRedirects)
        .where(and(eq(storeRedirects.id, id), eq(storeRedirects.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Redirect not found" });
      }

      await app.db.delete(storeRedirects).where(eq(storeRedirects.id, id));

      return reply.status(204).send();
    },
  );

  // ── GET /api/seo/sitemap.xml ──────────────────────────────────────────────
  app.get(
    "/api/seo/sitemap.xml",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      const [seoSettings] = await app.db
        .select({ canonicalBase: storeSeoSettings.canonicalBase })
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      const base = seoSettings?.canonicalBase ?? "https://example.com";

      const productRows = await app.db
        .select({ id: products.id, slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(and(eq(products.storeAccountId, storeId), eq(products.status, "published")))
        .limit(50000);

      const urls = productRows.map((p) => {
        const lastmod = p.updatedAt ? p.updatedAt.toISOString().split("T")[0] : "";
        return `  <url>\n    <loc>${escapeXml(`${base}/products/${p.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

      return reply
        .header("Content-Type", "application/xml; charset=utf-8")
        .send(xml);
    },
  );

  // ── GET /api/seo/merchant-feed.xml ───────────────────────────────────────
  app.get(
    "/api/seo/merchant-feed.xml",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      const [seoSettings] = await app.db
        .select({
          canonicalBase: storeSeoSettings.canonicalBase,
          merchantFeedIncludeOutOfStock: storeSeoSettings.merchantFeedIncludeOutOfStock,
        })
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      const base = seoSettings?.canonicalBase ?? "https://example.com";
      const includeOutOfStock = seoSettings?.merchantFeedIncludeOutOfStock ?? false;

      const productRows = await app.db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          priceCents: products.priceCents,
          inventoryQuantity: products.inventoryQuantity,
          images: products.images,
          barcode: products.barcode,
        })
        .from(products)
        .where(and(eq(products.storeAccountId, storeId), eq(products.status, "published")))
        .limit(50000);

      const items = productRows
        .filter((p) => includeOutOfStock || p.inventoryQuantity > 0)
        .map((p) => {
          const availability = p.inventoryQuantity > 0 ? "in_stock" : "out_of_stock";
          const price = ((p.priceCents ?? 0) / 100).toFixed(2);
          const images = p.images as Array<{ url: string; alt: string }> | null;
          const imageLink = images?.[0]?.url ?? "https://via.placeholder.com/600";
          const gtin = p.barcode ? `<g:gtin>${escapeXml(p.barcode)}</g:gtin>` : "";
          return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description ?? "")}</g:description>
      <g:link>${escapeXml(`${base}/products/${p.slug}`)}</g:link>
      <g:price>${price} SEK</g:price>
      <g:availability>${availability}</g:availability>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      ${gtin}
    </item>`;
        });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Google Merchant Feed</title>
    <link>${escapeXml(base)}</link>
    <description>Product feed for Google Merchant Center</description>
${items.join("\n")}
  </channel>
</rss>`;

      return reply
        .header("Content-Type", "application/xml; charset=utf-8")
        .send(xml);
    },
  );

  // ── GET /api/seo/robots.txt ───────────────────────────────────────────────
  app.get(
    "/api/seo/robots.txt",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      const [seoSettings] = await app.db
        .select({
          robotsRules: storeSeoSettings.robotsRules,
          canonicalBase: storeSeoSettings.canonicalBase,
        })
        .from(storeSeoSettings)
        .where(eq(storeSeoSettings.storeAccountId, storeId))
        .limit(1);

      const customRules = (seoSettings?.robotsRules as string[] | null) ?? [];
      const base = seoSettings?.canonicalBase ?? "";

      const defaults = [
        "User-agent: *",
        "Disallow: /cart",
        "Disallow: /checkout",
        "Disallow: /account",
        "Disallow: /api/",
        "Allow: /api/public/",
        "",
        ...customRules,
      ];

      if (base) {
        defaults.push("", `Sitemap: ${base}/api/seo/sitemap.xml`);
      }

      const robotsTxt = defaults.join("\n");

      return reply
        .header("Content-Type", "text/plain; charset=utf-8")
        .send(robotsTxt);
    },
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// suppress unused import warning — productVariants is referenced indirectly
void productVariants;
