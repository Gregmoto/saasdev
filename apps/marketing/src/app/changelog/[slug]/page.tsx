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
    title:
      entry.title ??
      `Version ${entry.version ?? slug}`,
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
    year: "numeric",
    month: "long",
    day: "numeric",
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
              ✨ Nyheter
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
              🔧 Rättningar
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
