import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

interface CmsEntry {
  slug: string;
  updatedAt?: string;
  publishedAt?: string;
}

async function fetchSlugs(endpoint: string): Promise<CmsEntry[]> {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = await res.json();
    // Support both { data: [] } and plain [] shapes
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
}

function withAlternates(
  url: string
): { alternates: { languages: Record<string, string> } } {
  // Derive the path from the full URL
  const path = url.replace(SITE_URL, "");
  return {
    alternates: {
      languages: {
        sv: url,
        en: `${SITE_URL}/en${path}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 1.0,
      ...withAlternates(`${SITE_URL}/`),
    },
    {
      url: `${SITE_URL}/features`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/features`),
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/pricing`),
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/blog`),
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/changelog`),
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/about`),
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.6,
      ...withAlternates(`${SITE_URL}/contact`),
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.5,
      ...withAlternates(`${SITE_URL}/privacy`),
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.5,
      ...withAlternates(`${SITE_URL}/terms`),
    },
    {
      url: `${SITE_URL}/roadmap`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/roadmap`),
    },
    {
      url: `${SITE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/docs`),
    },
    {
      url: `${SITE_URL}/start`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/start`),
    },
    {
      url: `${SITE_URL}/demo`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/demo`),
    },
    {
      url: `${SITE_URL}/cases`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/cases`),
    },
    {
      url: `${SITE_URL}/integrations`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/integrations`),
    },
    {
      url: `${SITE_URL}/news`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/news`),
    },
    {
      url: `${SITE_URL}/alternatives/shopify`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/alternatives/shopify`),
    },
    {
      url: `${SITE_URL}/alternatives/woocommerce`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/alternatives/woocommerce`),
    },
    {
      url: `${SITE_URL}/alternatives/prestashop`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/alternatives/prestashop`),
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
      ...withAlternates(`${SITE_URL}/resources`),
    },
    {
      url: `${SITE_URL}/status`,
      lastModified: now,
      changeFrequency: "hourly" as ChangeFrequency,
      priority: 0.6,
      ...withAlternates(`${SITE_URL}/status`),
    },
    {
      url: `${SITE_URL}/book-demo`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/book-demo`),
    },
    {
      url: `${SITE_URL}/trial`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
      ...withAlternates(`${SITE_URL}/trial`),
    },
    {
      url: `${SITE_URL}/demo/webshop`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/demo/webshop`),
    },
    {
      url: `${SITE_URL}/demo/multishop`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/demo/multishop`),
    },
    {
      url: `${SITE_URL}/demo/marketplace`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/demo/marketplace`),
    },
  ];

  const [blogPosts, changelogEntries, featurePages, caseStudies, integrations, newsPosts, docArticles] =
    await Promise.all([
      fetchSlugs("/api/cms/posts?type=blog&lang=sv&limit=100"),
      fetchSlugs("/api/cms/changelog?lang=sv&limit=100"),
      fetchSlugs("/api/cms/features?lang=sv&limit=100"),
      fetchSlugs("/api/cms/cases?lang=sv&limit=100"),
      fetchSlugs("/api/cms/integrations?lang=sv&limit=100"),
      fetchSlugs("/api/cms/posts?type=news&lang=sv&limit=100"),
      fetchSlugs("/api/cms/docs?lang=sv&limit=200"),
    ]);

  const dynamicBlogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.7,
    ...withAlternates(`${SITE_URL}/blog/${post.slug}`),
  }));

  const dynamicChangelogPages: MetadataRoute.Sitemap = changelogEntries.map(
    (entry) => ({
      url: `${SITE_URL}/changelog/${entry.slug}`,
      lastModified: entry.updatedAt ? new Date(entry.updatedAt) : now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.5,
      ...withAlternates(`${SITE_URL}/changelog/${entry.slug}`),
    })
  );

  const dynamicFeaturePages: MetadataRoute.Sitemap = featurePages.map((f) => ({
    url: `${SITE_URL}/features/${f.slug}`,
    lastModified: f.updatedAt ? new Date(f.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.8,
    ...withAlternates(`${SITE_URL}/features/${f.slug}`),
  }));

  const dynamicCasePages: MetadataRoute.Sitemap = caseStudies.map((c) => ({
    url: `${SITE_URL}/cases/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.7,
    ...withAlternates(`${SITE_URL}/cases/${c.slug}`),
  }));

  const dynamicIntegrationPages: MetadataRoute.Sitemap = integrations.map(
    (i) => ({
      url: `${SITE_URL}/integrations/${i.slug}`,
      lastModified: i.updatedAt ? new Date(i.updatedAt) : now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.7,
      ...withAlternates(`${SITE_URL}/integrations/${i.slug}`),
    })
  );

  const dynamicNewsPages: MetadataRoute.Sitemap = newsPosts.map((post) => ({
    url: `${SITE_URL}/news/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.7,
    ...withAlternates(`${SITE_URL}/news/${post.slug}`),
  }));

  const dynamicDocPages: MetadataRoute.Sitemap = docArticles.map((doc) => ({
    url: `${SITE_URL}/docs/${doc.slug}`,
    lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
    changeFrequency: "weekly" as ChangeFrequency,
    priority: 0.7,
    ...withAlternates(`${SITE_URL}/docs/${doc.slug}`),
  }));

  return [
    ...staticPages,
    ...dynamicBlogPages,
    ...dynamicChangelogPages,
    ...dynamicFeaturePages,
    ...dynamicCasePages,
    ...dynamicIntegrationPages,
    ...dynamicNewsPages,
    ...dynamicDocPages,
  ];
}
