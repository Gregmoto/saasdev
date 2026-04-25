export const dynamic = "force-dynamic";

import { SITE_URL, SITE_NAME } from "@/lib/metadata";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ChangelogEntry {
  slug: string;
  version: string | null;
  versionLabel: string | null;
  title: string;
  tags: string[];
  highlights: Array<{ text: string; href?: string }>;
  fixes: Array<{ text: string; href?: string }>;
  body: string;
  publishedAt: string | null;
}

const FALLBACK_CHANGES: ChangelogEntry[] = [
  {
    slug: "1-4-0",
    version: "1.4.0",
    versionLabel: "Free-plan & Onboarding",
    title: "Free-plan, Demo Hub och installationsguide",
    publishedAt: "2026-04-25",
    tags: ["new", "improvement"],
    highlights: [
      { text: "Free-plan med 250 produkter och 100 ordrar/mån", href: "/pricing" },
      { text: "Demo Hub med tre interaktiva demobutiker", href: "/demo" },
      { text: "Installationsguide för nya butiksägare" },
      { text: "Registreringsflöde /start med butiksväljare" },
      { text: "Admin-banner vid gränsnärmande" },
    ],
    fixes: [
      { text: "Rättade UTF-8-kodning i svenska texter" },
      { text: "Standalone-build för marketing-sajten (Railway)" },
    ],
    body: "",
  },
  {
    slug: "1-3-0",
    version: "1.3.0",
    versionLabel: "Portaler & Rollhantering",
    title: "Rollbaserade portaler och plattformsadmin",
    publishedAt: "2026-03-15",
    tags: ["new"],
    highlights: [
      { text: "Plattformsadmin-portal för super-admins" },
      { text: "Butiksadmin-portal med rollkontroll" },
      { text: "Portalkontextrouting baserat på roll" },
    ],
    fixes: [],
    body: "",
  },
  {
    slug: "1-2-0",
    version: "1.2.0",
    versionLabel: null,
    title: "CSV-import, Stripe och varukorg",
    publishedAt: "2024-04-15",
    tags: ["new", "improvement"],
    highlights: [
      { text: "CSV-import för kunder och ordrar" },
      { text: "Betalningsramverk med Stripe-integration" },
      { text: "Varukorg och kassaflödes-API" },
    ],
    fixes: [],
    body: "",
  },
];

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch(`${API}/api/cms/changelog?lang=sv&limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_CHANGES;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return FALLBACK_CHANGES;
    const data = await res.json();
    const entries: ChangelogEntry[] = Array.isArray(data)
      ? data
      : (data?.data ?? data?.items ?? []);
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

function buildDescription(entry: ChangelogEntry): string {
  const lines: string[] = [];

  if (entry.highlights.length > 0) {
    entry.highlights.forEach((h) => {
      lines.push(`<li>✨ ${escapeXml(h.text)}</li>`);
    });
  }

  if (entry.fixes.length > 0) {
    entry.fixes.forEach((f) => {
      lines.push(`<li>🔧 ${escapeXml(f.text)}</li>`);
    });
  }

  if (lines.length === 0 && entry.body) {
    return escapeXml(entry.body.slice(0, 400));
  }

  return `<ul>${lines.join("")}</ul>`;
}

export async function GET() {
  const entries = await fetchChangelog();

  const items = entries
    .map((entry) => {
      const url = `${SITE_URL}/changelog/${entry.slug}`;
      const rawDate = entry.publishedAt ?? new Date().toISOString();
      const pubDate = new Date(rawDate).toUTCString();
      const title = entry.title ?? `Version ${entry.version ?? entry.slug}`;
      const versionSuffix = entry.version ? ` (v${escapeXml(entry.version)})` : "";
      const description = buildDescription(entry);

      return `
    <item>
      <title>${escapeXml(title)}${versionSuffix}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${description}]]></description>
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
