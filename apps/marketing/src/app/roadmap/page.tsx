import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { RoadmapFilters } from "./roadmap-filters";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Färdplan",
  description:
    "Se vad vi bygger härnäst hos ShopMan — planerade funktioner, pågående arbete och kommande releaser. Rösta på det du vill se.",
  path: "/roadmap",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RoadmapItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  quarter: string | null;
  category: string | null;
  itemStatus: "considering" | "planned" | "in_progress" | "shipped";
  tags: string[];
  votes: number;
  publishedAt: string | null;
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------
const ROADMAP_ITEMS: RoadmapItem[] = [
  // Q2 2026 — Levererat
  { id: "1", slug: "free-plan", title: "Free-plan", excerpt: "Gratis plan med upp till 250 produkter och 100 ordrar per månad.", quarter: "Q2 2026", category: null, itemStatus: "shipped", tags: ["Priser", "Planer"], votes: 42, publishedAt: null },
  { id: "2", slug: "demo-hub", title: "Demo Hub", excerpt: "Interaktiva demobutiker (Demo A/B/C) med läge för prospekts.", quarter: "Q2 2026", category: null, itemStatus: "shipped", tags: ["Demo", "Onboarding"], votes: 31, publishedAt: null },
  { id: "3", slug: "setup-wizard", title: "Installationsguide", excerpt: "Steg-för-steg-guide för nya butiksägare.", quarter: "Q2 2026", category: null, itemStatus: "shipped", tags: ["Onboarding", "Admin"], votes: 28, publishedAt: null },
  { id: "4", slug: "start-flow", title: "Registreringsflöde (/start)", excerpt: "Ny registreringssida med butikskonfiguration och kontoval.", quarter: "Q2 2026", category: null, itemStatus: "shipped", tags: ["Onboarding", "Marketing"], votes: 19, publishedAt: null },

  // Q3 2026 — Pågår / Planerat
  { id: "5", slug: "payment-settings", title: "Betalningsinställningar", excerpt: "Konfigurera Klarna, Swish och kortbetalning direkt från admin.", quarter: "Q3 2026", category: null, itemStatus: "in_progress", tags: ["Betalningar", "Admin"], votes: 87, publishedAt: null },
  { id: "6", slug: "shipping-zones", title: "Frakt & leveranszoner", excerpt: "Skapa fraktzoner med prisnivåer, viktgränser och leveranstider.", quarter: "Q3 2026", category: null, itemStatus: "planned", tags: ["Frakt", "Admin"], votes: 64, publishedAt: null },
  { id: "7", slug: "storefront-themes", title: "Storefront-teman", excerpt: "3 förkonfigurerade teman med färg- och typsnittskontroll.", quarter: "Q3 2026", category: null, itemStatus: "planned", tags: ["Storefront", "Design"], votes: 93, publishedAt: null },
  { id: "8", slug: "advanced-pricing", title: "Avancerad prishantering", excerpt: "Kampanjpriser, volymrabatter, tidsbegränsade erbjudanden.", quarter: "Q3 2026", category: null, itemStatus: "planned", tags: ["Produkter", "Priser"], votes: 71, publishedAt: null },
  { id: "9", slug: "email-templates", title: "E-postmallar", excerpt: "Anpassningsbara transaktionella e-postmallar med visuell editor.", quarter: "Q3 2026", category: null, itemStatus: "planned", tags: ["E-post", "Admin"], votes: 55, publishedAt: null },

  // Q4 2026 — Planerat
  { id: "10", slug: "marketplace-module", title: "Marketplace-modul", excerpt: "Skapa en plattform med flera säljare, provisioner och säljarportal.", quarter: "Q4 2026", category: null, itemStatus: "planned", tags: ["Marketplace", "Enterprise"], votes: 112, publishedAt: null },
  { id: "11", slug: "b2b-panel", title: "B2B-panel", excerpt: "Prissättning per kund, inköpsordrar och fakturabetalning.", quarter: "Q4 2026", category: null, itemStatus: "planned", tags: ["B2B", "Enterprise"], votes: 89, publishedAt: null },
  { id: "12", slug: "fortnox-connect", title: "Fortnox Connect", excerpt: "Automatisk synk av ordrar, fakturor och kunder med Fortnox.", quarter: "Q4 2026", category: null, itemStatus: "planned", tags: ["Integrationer", "Bokföring"], votes: 134, publishedAt: null },
  { id: "13", slug: "mobile-app", title: "iOS & Android-app", excerpt: "Inbyggd mobilapp för orderhantering och produktuppdateringar.", quarter: "Q4 2026", category: null, itemStatus: "considering", tags: ["Mobil", "Admin"], votes: 67, publishedAt: null },

  // 2027
  { id: "14", slug: "ai-descriptions", title: "AI-produktbeskrivningar", excerpt: "Generera produktbeskrivningar automatiskt med AI.", quarter: "2027", category: null, itemStatus: "considering", tags: ["AI", "Produkter"], votes: 156, publishedAt: null },
  { id: "15", slug: "multi-currency", title: "Multi-currency", excerpt: "Sätt priser och ta betalt i flera valutor.", quarter: "2027", category: null, itemStatus: "considering", tags: ["Internationellt", "Betalningar"], votes: 98, publishedAt: null },
  { id: "16", slug: "white-label", title: "White-label", excerpt: "Fullt vit-märkt plattform för återförsäljare.", quarter: "2027", category: null, itemStatus: "considering", tags: ["Enterprise", "Återförsäljare"], votes: 44, publishedAt: null },
];

// ---------------------------------------------------------------------------
// CMS fetch
// ---------------------------------------------------------------------------
async function fetchRoadmap(): Promise<RoadmapItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    const res = await fetch(`${apiUrl}/api/cms/roadmap?lang=sv&limit=100`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return [];
    const data = await res.json();
    const items: RoadmapItem[] = Array.isArray(data)
      ? data
      : (data?.items ?? []);
    return items;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
function computeStats(items: RoadmapItem[]) {
  return {
    shipped: items.filter((i) => i.itemStatus === "shipped").length,
    in_progress: items.filter((i) => i.itemStatus === "in_progress").length,
    planned: items.filter((i) => i.itemStatus === "planned").length,
    considering: items.filter((i) => i.itemStatus === "considering").length,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function RoadmapPage() {
  const cmsItems = await fetchRoadmap();
  const items = cmsItems.length > 0 ? cmsItems : ROADMAP_ITEMS;
  const stats = computeStats(items);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-stone-900 mb-3 tracking-tight">
            Färdplan
          </h1>
          <p className="text-stone-500 leading-relaxed max-w-2xl">
            Se vad vi bygger härnäst. Rösta på funktioner du vill se — de med
            flest röster prioriteras. Har du ett önskemål?{" "}
            <a href="/contact" className="text-blue-700 hover:underline">
              Hör av dig
            </a>
            .
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl border border-stone-100 bg-white px-4 py-3">
            <div className="text-2xl font-bold text-green-700 tabular-nums">
              {stats.shipped}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Levererat</div>
          </div>
          <div className="rounded-xl border border-stone-100 bg-white px-4 py-3">
            <div className="text-2xl font-bold text-blue-700 tabular-nums">
              {stats.in_progress}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Pågår nu</div>
          </div>
          <div className="rounded-xl border border-stone-100 bg-white px-4 py-3">
            <div className="text-2xl font-bold text-stone-700 tabular-nums">
              {stats.planned}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Planerat</div>
          </div>
          <div className="rounded-xl border border-stone-100 bg-white px-4 py-3">
            <div className="text-2xl font-bold text-amber-700 tabular-nums">
              {stats.considering}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Utvärderas</div>
          </div>
        </div>

        {/* Filters + Timeline (client component) */}
        <RoadmapFilters items={items} />
      </main>
      <Footer />
    </>
  );
}
