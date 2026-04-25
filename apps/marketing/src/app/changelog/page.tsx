import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { HistoryToggle } from "./history-toggle";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Versionshistorik — Alla uppdateringar i ShopMan",
  description:
    "Se alla viktiga ändringar, nya funktioner och förbättringar i ShopMan. Uppdateras löpande med varje release.",
  path: "/changelog",
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChangelogEntry {
  id?: string;
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

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------
const FALLBACK_CHANGES: ChangelogEntry[] = [
  // ---- 2026 ----
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

  // ---- 2025 ----
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
];

// Entries from 2024 — shown behind the "Tidig historia" toggle
const EARLY_HISTORY: ChangelogEntry[] = [
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

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetchChangelog(): Promise<{ recent: ChangelogEntry[]; early: ChangelogEntry[] }> {
  try {
    const res = await fetch(`${API}/api/cms/changelog?lang=sv&limit=50`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { recent: FALLBACK_CHANGES, early: EARLY_HISTORY };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return { recent: FALLBACK_CHANGES, early: EARLY_HISTORY };
    const data = await res.json();
    const all: ChangelogEntry[] = Array.isArray(data)
      ? data
      : (data?.data ?? data?.items ?? []);
    if (all.length === 0) return { recent: FALLBACK_CHANGES, early: EARLY_HISTORY };
    const recent = all.filter(
      (e) => e.publishedAt && new Date(e.publishedAt).getFullYear() >= 2025
    );
    const early = all.filter(
      (e) => e.publishedAt && new Date(e.publishedAt).getFullYear() < 2025
    );
    return { recent, early };
  } catch {
    return { recent: FALLBACK_CHANGES, early: EARLY_HISTORY };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MONTH_NAMES_SV = [
  "Januari","Februari","Mars","April","Maj","Juni",
  "Juli","Augusti","September","Oktober","November","December",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(entries: ChangelogEntry[]) {
  const map = new Map<string, { label: string; entries: ChangelogEntry[] }>();
  for (const entry of entries) {
    if (!entry.publishedAt) continue;
    const d = new Date(entry.publishedAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        label: `${MONTH_NAMES_SV[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        entries: [],
      });
    }
    map.get(key)!.entries.push(entry);
  }
  // Sort newest first
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);
}

const TAG_STYLES: Record<string, string> = {
  new: "bg-green-50 text-green-700 border border-green-200",
  improvement: "bg-blue-50 text-blue-700 border border-blue-200",
  fix: "bg-amber-50 text-amber-700 border border-amber-200",
  breaking: "bg-red-50 text-red-700 border border-red-200",
};

const TAG_LABELS: Record<string, string> = {
  new: "Nytt",
  improvement: "Förbättring",
  fix: "Rättning",
  breaking: "Brytande förändring",
};

function TagPill({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag] ?? "bg-stone-50 text-stone-600 border border-stone-200";
  const label = TAG_LABELS[tag] ?? tag;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {label}
    </span>
  );
}

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="border border-stone-100 rounded-2xl bg-white p-6 hover:border-stone-200 hover:shadow-sm transition-all">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {entry.publishedAt && (
          <time dateTime={entry.publishedAt} className="text-sm text-stone-400">
            {formatDate(entry.publishedAt)}
          </time>
        )}
        {entry.version && (
          <span className="text-xs font-mono font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
            v{entry.version}
          </span>
        )}
        {entry.versionLabel && (
          <span className="text-xs text-stone-500 italic">{entry.versionLabel}</span>
        )}
        {entry.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-stone-900 mb-4 leading-snug">
        {entry.title}
      </h2>

      {/* Highlights */}
      {entry.highlights.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Nyheter
          </div>
          <ul className="space-y-1.5">
            {entry.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-blue-600 hover:underline transition-colors"
                  >
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fixes */}
      {entry.fixes.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Rättningar
          </div>
          <ul className="space-y-1.5">
            {entry.fixes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-blue-600 hover:underline transition-colors"
                  >
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Body */}
      {entry.body && (
        <p className="text-sm text-stone-600 leading-relaxed mb-4">{entry.body}</p>
      )}

      {/* Read more */}
      <div className="pt-2">
        <Link
          href={`/changelog/${entry.slug}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Läs mer →
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ChangelogPage() {
  const { recent, early } = await fetchChangelog();
  const months = groupByMonth(recent);

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-stone-950 tracking-tight mb-2">
              Versionshistorik
            </h1>
            <p className="text-stone-500">
              Alla uppdateringar och nyheter i ShopMan.
            </p>
          </div>
          <a
            href="/changelog/rss"
            title="RSS-flöde för versionshistorik"
            className="flex-shrink-0 mt-1.5 text-stone-400 hover:text-orange-500 transition-colors"
            aria-label="RSS-flöde"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3 4a1 1 0 000 2 11 11 0 0111 11 1 1 0 002 0A13 13 0 003 4z" />
              <path d="M3 9a1 1 0 000 2 6 6 0 016 6 1 1 0 002 0A8 8 0 003 9z" />
              <circle cx="4" cy="16" r="1.5" />
            </svg>
          </a>
        </div>

        {/* "Senaste 12 månader" breadcrumb note */}
        <div className="mb-10 flex items-center gap-2 text-sm text-stone-400">
          <span>Visar: Senaste 12 månader</span>
          <span>•</span>
          <a
            href="#tidig-historia"
            className="text-blue-600 hover:underline transition-colors"
          >
            Visa all historik ↓
          </a>
        </div>

        {/* Monthly grouped entries */}
        <div className="space-y-12">
          {months.map((group) => (
            <section key={group.label}>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-5 flex items-center gap-3">
                {group.label}
                <span className="h-px flex-1 bg-stone-100" />
              </h2>
              <div className="space-y-6">
                {group.entries.map((entry) => (
                  <EntryCard key={entry.slug} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Early history toggle (client component) */}
        {early.length > 0 && <HistoryToggle entries={early} />}
      </main>
      <Footer />
    </>
  );
}
