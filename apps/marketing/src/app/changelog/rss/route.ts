export const dynamic = "force-dynamic";

import { SITE_URL, SITE_NAME } from "@/lib/metadata";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ChangelogEntry {
  slug: string;
  version: string;
  date: string;
  title?: string;
  items: string[];
}

const FALLBACK_CHANGES: ChangelogEntry[] = [
  {
    slug: "1-2-0",
    version: "1.2.0",
    date: "2024-04-15",
    title: "CSV-import, Stripe och varukorg",
    items: [
      "Lade till CSV-import för kunder och ordrar",
      "Betalningsramverk med Stripe-integration",
      "Varukorg och kassaflödes-API",
    ],
  },
  {
    slug: "1-1-0",
    version: "1.1.0",
    date: "2024-03-20",
    title: "WooCommerce, PrestaShop och importkonflikthantering",
    items: [
      "WooCommerce- och PrestaShop-kopplingar",
      "System för importkonflikthantering",
      "Återupptagbara importjobb",
    ],
  },
  {
    slug: "1-0-0",
    version: "1.0.0",
    date: "2024-03-01",
    title: "Första release",
    items: [
      "Första release",
      "Shopify-koppling",
      "Multishop-stöd",
      "System för lagerreservation",
    ],
  },
];

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch(`${API}/api/cms/changelog?lang=sv&limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_CHANGES;
    
if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK_CHANGES;
const data = await res.json();
    const entries: ChangelogEntry[] = Array.isArray(data)
      ? data
      : (data?.data ?? []);
    return entries.length > 0 ? entries : FALLBACK_CHANGES;
  } catch {
    return FALLBACK_CHANGES;
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
  const entries = await fetchChangelog();

  const items = entries
    .map(entry => {
      const url = `${SITE_URL}/changelog/${entry.slug}`;
      const pubDate = new Date(entry.date).toUTCString();
      const title = entry.title ?? `Version ${entry.version}`;
      const description = entry.items.map(i => `• ${i}`).join("\n");
      return `
    <item>
      <title>${escapeXml(title)} (v${escapeXml(entry.version)})</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>Versionshistorik</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Versionshistorik</title>
    <link>${SITE_URL}/changelog</link>
    <description>Alla uppdateringar, nya funktioner och förbättringar i ${escapeXml(SITE_NAME)}.</description>
    <language>sv</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/changelog/rss" rel="self" type="application/rss+xml"/>
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
