import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Versionshistorik — Alla uppdateringar i ShopMan",
  description:
    "Se alla viktiga ändringar, nya funktioner och förbättringar i ShopMan. Uppdateras löpande med varje release.",
  path: "/changelog",
});

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
      next: { revalidate: 3600 },
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ChangelogPage() {
  const changes = await fetchChangelog();

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-zinc-950 tracking-tight mb-2">
          Versionshistorik
        </h1>
        <p className="text-zinc-500 mb-12">Alla viktiga ändringar i ShopMan.</p>

        <div className="space-y-12">
          {changes.map((c) => (
            <div key={c.slug ?? c.version} className="flex gap-6">
              <div className="text-right min-w-[100px] pt-1 flex-shrink-0">
                <div className="text-sm font-mono font-semibold text-blue-600">
                  {c.version}
                </div>
                <time
                  dateTime={c.date}
                  className="text-xs text-zinc-400 mt-0.5 block"
                >
                  {formatDate(c.date)}
                </time>
              </div>
              <div className="flex-1 border-l border-zinc-200 pl-6">
                {c.title && (
                  <Link
                    href={`/changelog/${c.slug}`}
                    className="text-base font-semibold text-zinc-900 hover:text-blue-600 transition-colors block mb-2"
                  >
                    {c.title}
                  </Link>
                )}
                <ul className="space-y-2">
                  {c.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        +
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
