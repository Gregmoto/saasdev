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
  // 2026
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
      { text: "Admin-uppgraderingsbanner vid gränsnärmande" },
    ],
    fixes: [
      { text: "Rättade UTF-8-kodning i svenska texter" },
      { text: "Standalone-build för marketing-sajten (Railway)" },
      { text: "Prisvisning på marketing-sajten" },
    ],
    body: "",
  },
  {
    slug: "1-3-2",
    version: "1.3.2",
    versionLabel: "Docs & CMS",
    title: "Dokumentationshubb, juridik och kontaktformulär",
    publishedAt: "2026-04-10",
    tags: ["new", "improvement"],
    highlights: [
      { text: "Dokumentationshubb med sökfunktion" },
      { text: "Versionshantering för juridiska sidor (Privacy/Terms)" },
      { text: "Roadmap-sida med kvartalstidslinje" },
      { text: "Kontaktformulär med ämnesväljare" },
      { text: "Changelog med höjdpunkter och rättningar" },
    ],
    fixes: [
      { text: "Nav-uppdatering med Om oss och Docs" },
      { text: "Footer med Företag-kolumn" },
    ],
    body: "",
  },
  {
    slug: "1-3-1",
    version: "1.3.1",
    versionLabel: "Plattformsportaler",
    title: "Rollbaserade portaler för butiks- och plattformsadmin",
    publishedAt: "2026-03-20",
    tags: ["new"],
    highlights: [
      { text: "Rollbaserade portaler (Store Admin / Platform Admin)" },
      { text: "Portalkontextrouting baserat på roll" },
      { text: "UI-kompletteringschecklista för plattformsadmin" },
    ],
    fixes: [
      { text: "Prehandler as-const-typfel i Fastify-routes" },
      { text: "Portalomdirigering för marknadsplatssäljare" },
    ],
    body: "",
  },
  {
    slug: "1-3-0",
    version: "1.3.0",
    versionLabel: "MultiShop & Lager",
    title: "MultiShop, lagerplatser och inköpsordrar",
    publishedAt: "2026-02-28",
    tags: ["new"],
    highlights: [
      { text: "MultiShop — ett konto, flera butiker" },
      { text: "Lagerplatser med reservationer" },
      { text: "Inköpsordrar mot leverantör" },
      { text: "Lagerinventering" },
    ],
    fixes: [
      { text: "Orderräkning per kalendermd (UTC)" },
      { text: "Plan-gräns enforcement i API" },
    ],
    body: "",
  },
  {
    slug: "1-2-2",
    version: "1.2.2",
    versionLabel: "Betalningar & Klarna",
    title: "Klarna Checkout, Swish och refunds",
    publishedAt: "2026-01-31",
    tags: ["new", "improvement"],
    highlights: [
      { text: "Klarna Checkout-integration" },
      { text: "Swish-betalningar" },
      { text: "Refunds-modul med delåterbetalning" },
      { text: "Betalningshändelser i auditlogg" },
    ],
    fixes: [
      { text: "Webhook-signaturvalidering" },
      { text: "Dubbla betalningshändelser vid retry" },
    ],
    body: "",
  },
  {
    slug: "1-2-1",
    version: "1.2.1",
    versionLabel: "SEO & Prestanda",
    title: "Automatiska sitemaps, Open Graph och Core Web Vitals",
    publishedAt: "2026-01-15",
    tags: ["improvement"],
    highlights: [
      { text: "Automatiska sitemaps (XML)" },
      { text: "Open Graph-taggar" },
      { text: "Produkt-JSON-LD (schema.org)" },
      { text: "Canonical-taggar" },
      { text: "Core Web Vitals-rapport" },
    ],
    fixes: [
      { text: "Meta-description saknade på kategorisidor" },
      { text: "RSS-feed för nyheter" },
    ],
    body: "",
  },
  // 2025
  {
    slug: "1-2-0",
    version: "1.2.0",
    versionLabel: "Import Center",
    title: "Import Center — Shopify, WooCommerce och PrestaShop",
    publishedAt: "2025-12-15",
    tags: ["new"],
    highlights: [
      { text: "Shopify CSV-import" },
      { text: "WooCommerce REST API-import" },
      { text: "PrestaShop-import" },
      { text: "Konfliktstrategi (hoppa/ersätt/ny)" },
      { text: "Schemalagda importjobb" },
    ],
    fixes: [
      { text: "Importjobb fastnade vid stora filer" },
      { text: "Variantmappning vid Shopify-import" },
    ],
    body: "",
  },
  {
    slug: "1-1-3",
    version: "1.1.3",
    versionLabel: "Marketplace-grund",
    title: "Marketplace-läge med säljarportal och provisioner",
    publishedAt: "2025-11-20",
    tags: ["new"],
    highlights: [
      { text: "Marketplace-läge (multi-säljare)" },
      { text: "Säljarportal" },
      { text: "Provisionshantering" },
      { text: "Utbetalningsschema" },
    ],
    fixes: [
      { text: "Orderattribuering i marketplace" },
      { text: "Lagersaldokonflikt vid delad produkt" },
    ],
    body: "",
  },
  {
    slug: "1-1-2",
    version: "1.1.2",
    versionLabel: "B2B & Priser",
    title: "B2B-kundpanel, prislistor och fakturabetalning",
    publishedAt: "2025-10-10",
    tags: ["new"],
    highlights: [
      { text: "B2B-kundpanel" },
      { text: "Prislistor per kund" },
      { text: "Kreditgränser" },
      { text: "Fakturabetalning" },
    ],
    fixes: [
      { text: "Momsberäkning på B2B-order" },
      { text: "Rabattstackning vid kampanjer" },
    ],
    body: "",
  },
  {
    slug: "1-1-1",
    version: "1.1.1",
    versionLabel: "Tickets & Chat",
    title: "Support-ticketsystem, Live Chat och RMA-returflöde",
    publishedAt: "2025-09-01",
    tags: ["new"],
    highlights: [
      { text: "Support-ticketsystem" },
      { text: "Live Chat-widget" },
      { text: "Offlineformulär" },
      { text: "Automatiska svar" },
      { text: "RMA-returflöde" },
    ],
    fixes: [
      { text: "Chatkonversationer stängdes inte korrekt" },
      { text: "Dubbelnotifiering vid eskalering" },
    ],
    body: "",
  },
  {
    slug: "1-1-0",
    version: "1.1.0",
    versionLabel: "Analys & Rapporter",
    title: "Försäljningsrapporter, kundanalys och CSV-export",
    publishedAt: "2025-07-20",
    tags: ["new"],
    highlights: [
      { text: "Försäljningsrapporter" },
      { text: "Produktprestanda" },
      { text: "Kundanalys" },
      { text: "Export till CSV/Excel" },
      { text: "Konverteringsfrekvens per kanal" },
    ],
    fixes: [
      { text: "Datumsegmentering ignorerade timezone" },
      { text: "Rapporter tömdes vid filter" },
    ],
    body: "",
  },
  {
    slug: "1-0-2",
    version: "1.0.2",
    versionLabel: "Fortnox & Integrationer",
    title: "Fortnox Connect, leverantörssynk och EDI",
    publishedAt: "2025-06-05",
    tags: ["new"],
    highlights: [
      { text: "Fortnox Connect (order → faktura)" },
      { text: "Leverantörssynk via FTP/API/CSV" },
      { text: "Automatisk prisregel vid synk" },
      { text: "EDI-stöd" },
    ],
    fixes: [
      { text: "Fortnox-synk failade tyst vid nätverksfel" },
      { text: "Leverantörssynk ignorerade pausade produkter" },
    ],
    body: "",
  },
  {
    slug: "1-0-1",
    version: "1.0.1",
    versionLabel: "Varumärken & SEO",
    title: "Varumärkeshantering med SEO-fält och brand-sidor",
    publishedAt: "2025-05-01",
    tags: ["improvement"],
    highlights: [
      { text: "Varumärkeshantering med SEO-fält" },
      { text: "Slug-auto-generering" },
      { text: "OG-bild per varumärke" },
      { text: "Brand-sidor i storefront" },
    ],
    fixes: [
      { text: "Kanonisk URL saknade trailing slash" },
      { text: "Brand-slugs tilläts ha versaler" },
    ],
    body: "",
  },
  {
    slug: "1-0-0",
    version: "1.0.0",
    versionLabel: "Första release",
    title: "ShopMan 1.0 — Första officiella release",
    publishedAt: "2025-03-01",
    tags: ["new"],
    highlights: [
      { text: "Produkthantering med varianter" },
      { text: "Ordersystem" },
      { text: "Lagerreservation" },
      { text: "Kundregister" },
      { text: "Rollbaserade användare" },
      { text: "Shopify-koppling" },
      { text: "Multishop-stöd" },
    ],
    fixes: [],
    body: "",
  },
  // 2024
  {
    slug: "0-9-0",
    version: "0.9.0",
    versionLabel: "Beta",
    title: "Privat beta-release",
    publishedAt: "2024-12-01",
    tags: ["new"],
    highlights: [
      { text: "Privat beta-release" },
      { text: "Grundläggande produkter och ordrar" },
      { text: "Enkel storefront" },
    ],
    fixes: [],
    body: "",
  },
  {
    slug: "0-8-0",
    version: "0.8.0",
    versionLabel: "Alpha",
    title: "Initial alpha för interna tester",
    publishedAt: "2024-09-15",
    tags: [],
    highlights: [
      { text: "Initial alpha för interna tester" },
      { text: "Databaskoppling" },
      { text: "Auth-system" },
    ],
    fixes: [],
    body: "",
  },
  {
    slug: "0-5-0",
    version: "0.5.0",
    versionLabel: "Proof of Concept",
    title: "Proof of Concept med PostgreSQL och Fastify",
    publishedAt: "2024-06-01",
    tags: [],
    highlights: [
      { text: "Proof of concept med PostgreSQL + Fastify" },
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
