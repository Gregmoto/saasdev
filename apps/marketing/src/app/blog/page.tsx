import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";
import BlogClient, { type BlogPost } from "./blog-client";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Blogg — Nyheter & insikter",
  description:
    "Guider, nyheter och insikter från ShopMan-teamet. Lär dig mer om e-handel, lagerhantering och hur du växer din butik med ShopMan.",
  path: "/blog",
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const FALLBACK_POSTS: BlogPost[] = [
  {
    slug: "launch",
    title: "ShopMan 1.0 lanseras",
    date: "2024-04-01",
    dateFormatted: "1 april 2024",
    category: "Nyheter",
    categoryColor: "bg-blue-50 text-blue-700",
    excerpt:
      "Vi är glada att kunna presentera ShopMan — den samlade handelsplattformen för moderna handlare. Läs om vad som ingår och vad som kommer härnäst.",
    readTime: "3 min",
    featured: true,
  },
  {
    slug: "import-guide",
    title: "Importera från Shopify på 5 minuter",
    date: "2024-03-20",
    dateFormatted: "20 mars 2024",
    category: "Guide",
    categoryColor: "bg-violet-50 text-violet-700",
    excerpt:
      "Steg-för-steg-guide för att migrera din Shopify-butik till ShopMan med vårt Importcenter.",
    readTime: "5 min",
    featured: false,
  },
  {
    slug: "inventory-tips",
    title: "Bästa praxis för lagerhantering i realtid",
    date: "2024-03-10",
    dateFormatted: "10 mars 2024",
    category: "Tips",
    categoryColor: "bg-emerald-50 text-emerald-700",
    excerpt:
      "Hur du ställer in lagerroutning, reservationer och automatiserade beställningspunkter.",
    readTime: "7 min",
    featured: false,
  },
];

async function fetchPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(
      `${API}/api/cms/posts?type=blog&lang=sv`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return FALLBACK_POSTS;
    
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK_POSTS;
    const data = await res.json();
    const raw: BlogPost[] = Array.isArray(data) ? data : (data?.data ?? []);
    return raw.length > 0 ? raw : FALLBACK_POSTS;
  } catch {
    return FALLBACK_POSTS;
  }
}

export default async function BlogPage() {
  const posts = await fetchPosts();
  return <BlogClient posts={posts} />;
}
