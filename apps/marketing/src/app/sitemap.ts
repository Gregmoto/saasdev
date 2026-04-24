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
    const res = await fetch(`${API}${endpoint}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    // Support both { data: [] } and plain [] shapes
    return Array.isArray(data) ? data : (data?.data ?? []);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/features`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: now,
      changeFrequency: "weekly" as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/demo`,
      lastModified: now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/cases`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/integrations`,
      lastModified: now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.8,
    },
  ];

  const [blogPosts, changelogEntries, featurePages, caseStudies, integrations] =
    await Promise.all([
      fetchSlugs("/api/cms/posts?type=blog&lang=sv&limit=100"),
      fetchSlugs("/api/cms/changelog?lang=sv&limit=100"),
      fetchSlugs("/api/cms/features?lang=sv&limit=100"),
      fetchSlugs("/api/cms/cases?lang=sv&limit=100"),
      fetchSlugs("/api/cms/integrations?lang=sv&limit=100"),
    ]);

  const dynamicBlogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.7,
  }));

  const dynamicChangelogPages: MetadataRoute.Sitemap = changelogEntries.map(
    (entry) => ({
      url: `${SITE_URL}/changelog/${entry.slug}`,
      lastModified: entry.updatedAt ? new Date(entry.updatedAt) : now,
      changeFrequency: "yearly" as ChangeFrequency,
      priority: 0.5,
    })
  );

  const dynamicFeaturePages: MetadataRoute.Sitemap = featurePages.map((f) => ({
    url: `${SITE_URL}/features/${f.slug}`,
    lastModified: f.updatedAt ? new Date(f.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.8,
  }));

  const dynamicCasePages: MetadataRoute.Sitemap = caseStudies.map((c) => ({
    url: `${SITE_URL}/cases/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: "monthly" as ChangeFrequency,
    priority: 0.7,
  }));

  const dynamicIntegrationPages: MetadataRoute.Sitemap = integrations.map(
    (i) => ({
      url: `${SITE_URL}/integrations/${i.slug}`,
      lastModified: i.updatedAt ? new Date(i.updatedAt) : now,
      changeFrequency: "monthly" as ChangeFrequency,
      priority: 0.7,
    })
  );

  return [
    ...staticPages,
    ...dynamicBlogPages,
    ...dynamicChangelogPages,
    ...dynamicFeaturePages,
    ...dynamicCasePages,
    ...dynamicIntegrationPages,
  ];
}
