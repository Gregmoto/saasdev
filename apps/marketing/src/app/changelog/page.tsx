import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { buildMetadata, SITE_URL } from "@/lib/metadata";

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

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch(`${API}/api/cms/changelog?lang=sv&limit=50`, {
      next: { revalidate: 3600 },
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
  const style = TAG_STYLES[tag] ?? "bg-stone-50 text-stone-600 border border-stone-200";
  const label = TAG_LABELS[tag] ?? tag;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ChangelogPage() {
  const changes = await fetchChangelog();

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-12">
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

        {/* Entries */}
        <div className="space-y-10">
          {changes.map((entry) => (
            <article
              key={entry.slug}
              className="border border-stone-100 rounded-2xl bg-white p-6 hover:border-stone-200 hover:shadow-sm transition-all"
            >
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {entry.publishedAt && (
                  <time
                    dateTime={entry.publishedAt}
                    className="text-sm text-stone-400"
                  >
                    {formatDate(entry.publishedAt)}
                  </time>
                )}
                {entry.version && (
                  <span className="text-xs font-mono font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                    v{entry.version}
                  </span>
                )}
                {entry.versionLabel && (
                  <span className="text-xs text-stone-500 italic">
                    {entry.versionLabel}
                  </span>
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
                    ✨ Nyheter
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
                    🔧 Rättningar
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
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  {entry.body}
                </p>
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
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
