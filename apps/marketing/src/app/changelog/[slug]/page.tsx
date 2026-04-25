import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema-org";

export const revalidate = 3600;

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
// Static fallback (indexed by slug)
// ---------------------------------------------------------------------------
const FALLBACK_LIST: ChangelogEntry[] = [
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

const FALLBACK: Record<string, ChangelogEntry> = Object.fromEntries(
  FALLBACK_LIST.map((e) => [e.slug, e])
);

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetchEntry(slug: string): Promise<ChangelogEntry | null> {
  try {
    const res = await fetch(`${API}/api/cms/changelog/${slug}?lang=sv`, {
      next: { revalidate: 3600 },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok || !ct.includes("application/json")) return null;
    const data = await res.json();
    return data?.data ?? data ?? null;
  } catch {
    return null;
  }
}

async function fetchAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API}/api/cms/changelog?lang=sv&limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const entries: Array<{ slug: string }> = Array.isArray(data)
      ? data
      : (data?.data ?? data?.items ?? []);
    return entries.map((e) => e.slug);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// generateStaticParams / generateMetadata
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  const cmsSlugs = await fetchAllSlugs();
  const staticSlugs = Object.keys(FALLBACK);
  const all = Array.from(new Set([...staticSlugs, ...cmsSlugs]));
  return all.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cmsEntry = await fetchEntry(slug);
  const entry = cmsEntry ?? FALLBACK[slug];

  if (!entry) {
    return buildMetadata({
      title: "Versionsnotering hittades inte",
      description: "Den här versionsanteckningen finns inte.",
      path: `/changelog/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: entry.title ?? `Version ${entry.version ?? slug}`,
    description:
      entry.highlights.length > 0
        ? entry.highlights
            .slice(0, 2)
            .map((h) => h.text)
            .join(". ")
        : `Ändringslogg för ShopMan ${entry.version ?? slug}.`,
    path: `/changelog/${slug}`,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  const style =
    TAG_STYLES[tag] ?? "bg-stone-50 text-stone-600 border border-stone-200";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {TAG_LABELS[tag] ?? tag}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ChangelogEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cmsEntry = await fetchEntry(slug);
  const entry = cmsEntry ?? FALLBACK[slug];

  if (!entry) notFound();

  const entryUrl = `${SITE_URL}/changelog/${slug}`;
  const ldBreadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: "Versionshistorik", url: `${SITE_URL}/changelog` },
    {
      label: entry.title ?? `Version ${entry.version}`,
      url: entryUrl,
    },
  ]);

  // Adjacent navigation from fallback list
  const slugIndex = FALLBACK_LIST.findIndex((e) => e.slug === slug);
  const prevEntry = slugIndex < FALLBACK_LIST.length - 1 ? FALLBACK_LIST[slugIndex + 1] : null;
  const nextEntry = slugIndex > 0 ? FALLBACK_LIST[slugIndex - 1] : null;

  return (
    <>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-stone-400 mb-8 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-stone-700 transition-colors">
            Hem
          </Link>
          <span>/</span>
          <Link
            href="/changelog"
            className="hover:text-stone-700 transition-colors"
          >
            Versionshistorik
          </Link>
          <span>/</span>
          <span className="text-stone-600">
            {entry.version ? `v${entry.version}` : entry.title}
          </span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {entry.version && (
              <span className="text-sm font-mono font-semibold bg-stone-100 text-stone-700 px-3 py-1 rounded-lg">
                v{entry.version}
              </span>
            )}
            {entry.publishedAt && (
              <time dateTime={entry.publishedAt} className="text-sm text-stone-400">
                {formatDate(entry.publishedAt)}
              </time>
            )}
            {entry.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>

          <h1 className="text-4xl font-bold text-stone-950 tracking-tight leading-tight mb-2">
            {entry.title}
          </h1>
          {entry.versionLabel && (
            <p className="text-lg text-stone-500 italic">{entry.versionLabel}</p>
          )}
        </header>

        {/* Highlights */}
        {entry.highlights.length > 0 && (
          <section className="mb-8 bg-green-50 border border-green-100 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-green-800 uppercase tracking-wider mb-4">
              Nyheter
            </h2>
            <ul className="space-y-3">
              {entry.highlights.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
                  <span className="text-green-600 font-bold mt-0.5 flex-shrink-0">+</span>
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
          </section>
        )}

        {/* Fixes */}
        {entry.fixes.length > 0 && (
          <section className="mb-8 bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-4">
              Rättningar
            </h2>
            <ul className="space-y-3">
              {entry.fixes.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
                  <span className="text-amber-600 mt-0.5 flex-shrink-0">·</span>
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
          </section>
        )}

        {/* Body content */}
        {entry.body && (
          <div className="prose prose-stone max-w-none mb-8">
            {entry.body
              .split(/\n\n+/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-stone-600 leading-relaxed mb-5">
                  {para}
                </p>
              ))}
          </div>
        )}

        {/* Links to docs */}
        <div className="mb-10 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-400 hover:text-stone-900 transition-colors"
          >
            Dokumentation →
          </Link>
          <Link
            href="/changelog"
            className="inline-flex items-center gap-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-400 hover:text-stone-900 transition-colors"
          >
            Alla versioner
          </Link>
        </div>

        {/* Navigation between entries */}
        {(prevEntry || nextEntry) && (
          <nav className="border-t border-stone-100 pt-8 flex items-center justify-between gap-4 mb-8">
            <div>
              {prevEntry && (
                <Link
                  href={`/changelog/${prevEntry.slug}`}
                  className="group flex flex-col gap-0.5"
                >
                  <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors">
                    ← Föregående
                  </span>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-blue-600 transition-colors">
                    {prevEntry.version ? `v${prevEntry.version}` : prevEntry.title}
                  </span>
                </Link>
              )}
            </div>
            <div className="text-right">
              {nextEntry && (
                <Link
                  href={`/changelog/${nextEntry.slug}`}
                  className="group flex flex-col gap-0.5 items-end"
                >
                  <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors">
                    Nästa →
                  </span>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-blue-600 transition-colors">
                    {nextEntry.version ? `v${nextEntry.version}` : nextEntry.title}
                  </span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* Back link */}
        <div className="border-t border-stone-100 pt-6">
          <Link
            href="/changelog"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Tillbaka till versionshistorik
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
