import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema-org";

export const revalidate = 3600;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ChangelogEntry {
  slug: string;
  version: string;
  date: string;
  title?: string;
  description?: string;
  items: string[];
  body?: string;
}

// Fallback entries indexed by slug
const FALLBACK: Record<string, ChangelogEntry> = {
  "1-2-0": {
    slug: "1-2-0",
    version: "1.2.0",
    date: "2024-04-15",
    title: "CSV-import, Stripe och kassaflöde",
    description:
      "Version 1.2.0 introducerar CSV-import för kunder och ordrar, Stripe-integration och ett nytt kassaflödes-API.",
    items: [
      "Lade till CSV-import för kunder och ordrar",
      "Betalningsramverk med Stripe-integration",
      "Varukorg och kassaflödes-API",
    ],
  },
  "1-1-0": {
    slug: "1-1-0",
    version: "1.1.0",
    date: "2024-03-20",
    title: "WooCommerce, PrestaShop och importkonflikthantering",
    description:
      "Version 1.1.0 lägger till kopplingar mot WooCommerce och PrestaShop samt ett robust system för att hantera importkonflikter.",
    items: [
      "WooCommerce- och PrestaShop-kopplingar",
      "System för importkonflikthantering",
      "Återupptagbara importjobb",
    ],
  },
  "1-0-0": {
    slug: "1-0-0",
    version: "1.0.0",
    date: "2024-03-01",
    title: "Första release av ShopMan",
    description:
      "Den första officiella releasen av ShopMan med Shopify-koppling, multishop-stöd och lagerreservationssystem.",
    items: [
      "Första release",
      "Shopify-koppling",
      "Multishop-stöd",
      "System för lagerreservation",
    ],
  },
};

async function fetchEntry(slug: string): Promise<ChangelogEntry | null> {
  try {
    const res = await fetch(`${API}/api/cms/changelog/${slug}?lang=sv`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? data ?? null;
  } catch {
    return null;
  }
}

async function fetchAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(
      `${API}/api/cms/changelog?lang=sv&limit=100`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entries: Array<{ slug: string }> = Array.isArray(data)
      ? data
      : (data?.data ?? []);
    return entries.map((e) => e.slug);
  } catch {
    return [];
  }
}

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
    title: entry.title ?? `Versionsnotering ${entry.version}`,
    description:
      entry.description ??
      `Ändringslogg för ShopMan ${entry.version}.`,
    path: `/changelog/${slug}`,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ChangelogEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cmsEntry = await fetchEntry(slug);
  const entry = cmsEntry ?? FALLBACK[slug];

  if (!entry) {
    notFound();
  }

  const entryUrl = `${SITE_URL}/changelog/${slug}`;
  const ldBreadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: "Versionshistorik", url: `${SITE_URL}/changelog` },
    {
      label: entry.title ?? `Version ${entry.version}`,
      url: entryUrl,
    },
  ]);

  return (
    <>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-zinc-400 mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-700 transition-colors">
            Hem
          </Link>
          <span>/</span>
          <Link
            href="/changelog"
            className="hover:text-zinc-700 transition-colors"
          >
            Versionshistorik
          </Link>
          <span>/</span>
          <span className="text-zinc-600">{entry.version}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="text-xs font-mono font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Version {entry.version}
          </div>
          <h1 className="text-4xl font-bold text-zinc-950 tracking-tight leading-tight mb-4">
            {entry.title ?? `Version ${entry.version}`}
          </h1>
          <time
            dateTime={entry.date}
            className="text-sm text-zinc-400"
          >
            {formatDate(entry.date)}
          </time>
        </header>

        {/* Description */}
        {entry.description && (
          <p className="text-zinc-600 leading-relaxed mb-8 text-base">
            {entry.description}
          </p>
        )}

        {/* CMS body */}
        {entry.body && (
          <div className="mb-8">
            {entry.body
              .split(/\n\n+/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-zinc-600 leading-relaxed mb-5">
                  {para}
                </p>
              ))}
          </div>
        )}

        {/* Change items */}
        {entry.items.length > 0 && (
          <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Ändringar
            </h2>
            <ul className="space-y-3">
              {entry.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-700"
                >
                  <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">
                    +
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Back */}
        <div className="mt-12 pt-8 border-t border-zinc-100">
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
