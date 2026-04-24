export const dynamic = "force-dynamic";

import { SITE_URL, SITE_NAME } from "@/lib/metadata";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface NewsItem {
  slug: string;
  title: string;
  excerpt?: string;
  description?: string;
  date?: string;
  publishedAt?: string;
  author?: string;
  category?: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    slug: "produkt-lansering-2026",
    title: "ShopMan 2.0 lanseras — multishop, B2B och Fortnox i ett",
    excerpt: "Idag lanserar vi ShopMan 2.0 — den mest ambitiösa uppdateringen sedan plattformens start. Med inbyggt multishop-stöd, B2B-prissättning och native Fortnox-integration tar vi steget mot att bli Sveriges ledande e-handelsplattform.",
    date: "2026-04-15",
    author: "Andreas Svensson",
    category: "Produkt",
  },
  {
    slug: "fortnox-partnerskap",
    title: "ShopMan ingår officiellt partnerskap med Fortnox",
    excerpt: "Vi är stolta att meddela att ShopMan nu är ett officiellt Fortnox-partnerföretag. Integrationen ger sömlös bokföring med automatisk fakturahantering och momsredovisning.",
    date: "2026-03-28",
    author: "Maria Lindqvist",
    category: "Partner",
  },
  {
    slug: "postnord-frakt-integration",
    title: "Ny frakt-integration: PostNord och DHL aktiveras med ett klick",
    excerpt: "ShopMans nya fraktmodul integrerar direkt med PostNord, DHL Express och Bring och genererar automatiskt fraktsedlar och spårningslänkar vid orderbekräftelse.",
    date: "2026-03-10",
    author: "Erik Bergström",
    category: "Produkt",
  },
  {
    slug: "e-handel-trender-2026",
    title: "5 e-handelstrender som formar 2026 — och hur du hänger med",
    excerpt: "Från AI-driven produktbeskrivning till headless commerce och social selling — de fem viktigaste trenderna för svenska e-handlare under 2026.",
    date: "2026-02-20",
    author: "Sofia Johansson",
    category: "Bransch",
  },
];

async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API}/api/cms/posts?type=news&lang=sv&limit=50`, {
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_NEWS;
    
if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK_NEWS;
const data = await res.json();
    const items: NewsItem[] = Array.isArray(data) ? data : (data?.data ?? []);
    return items.length > 0 ? items : FALLBACK_NEWS;
  } catch {
    return FALLBACK_NEWS;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const news = await fetchNews();

  const items = news
    .map(item => {
      const url = `${SITE_URL}/news/${item.slug}`;
      const pubDate = new Date(item.date ?? item.publishedAt ?? "").toUTCString();
      const description = item.excerpt ?? item.description ?? "";
      return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      ${item.author ? `<author>${escapeXml(item.author)}</author>` : ""}
      ${item.category ? `<category>${escapeXml(item.category)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Nyheter</title>
    <link>${SITE_URL}/news</link>
    <description>Senaste nyheter och uppdateringar från ${escapeXml(SITE_NAME)}.</description>
    <language>sv</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/news/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
