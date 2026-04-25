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
  // 2025 Q4 — Levererat
  { id: "1",  slug: "multishop",          title: "MultiShop (ett konto, flera butiker)",    excerpt: "Hantera flera butiker under ett och samma konto med isolerade lager och ordrar.", quarter: "2025 Q4", category: null, itemStatus: "shipped", tags: ["MultiShop"],              votes: 88,  publishedAt: "2026-02-28" },
  { id: "2",  slug: "lagerplatser",        title: "Lagerplatser med reservationer",          excerpt: "Definiera lagerplatser och reservera lagersaldo per plats vid orderläggning.",    quarter: "2025 Q4", category: null, itemStatus: "shipped", tags: ["Lager"],                  votes: 61,  publishedAt: "2026-02-28" },
  { id: "3",  slug: "fortnox-connect",    title: "Fortnox Connect",                          excerpt: "Automatisk synk av ordrar och fakturor till Fortnox.",                            quarter: "2025 Q4", category: null, itemStatus: "shipped", tags: ["Integrationer", "ERP"],   votes: 134, publishedAt: "2025-06-05" },

  // 2026 Q1 — Levererat
  { id: "4",  slug: "klarna-checkout",    title: "Klarna Checkout",                          excerpt: "Klarna Checkout-integration direkt i kassan.",                                    quarter: "2026 Q1", category: null, itemStatus: "shipped", tags: ["Betalningar"],            votes: 102, publishedAt: "2026-01-31" },
  { id: "5",  slug: "swish",              title: "Swish-betalningar",                        excerpt: "Ta emot Swish-betalningar för svenska kunder.",                                   quarter: "2026 Q1", category: null, itemStatus: "shipped", tags: ["Betalningar"],            votes: 79,  publishedAt: "2026-01-31" },
  { id: "6",  slug: "import-center",      title: "Import Center (Shopify/WooCommerce/PrestaShop)", excerpt: "Importera produkter och ordrar från ledande e-handelsplattformar.",       quarter: "2026 Q1", category: null, itemStatus: "shipped", tags: ["Import"],                 votes: 95,  publishedAt: "2025-12-15" },
  { id: "7",  slug: "rollbaserade-portaler", title: "Rollbaserade portaler",                excerpt: "Store Admin- och Platform Admin-portaler med rollbaserad kontextrouting.",        quarter: "2026 Q1", category: null, itemStatus: "shipped", tags: ["Admin", "Plattform"],    votes: 47,  publishedAt: "2026-03-20" },
  { id: "8",  slug: "free-plan",          title: "Free-plan med gränsövervakning",           excerpt: "Gratis plan med upp till 250 produkter och 100 ordrar per månad.",                quarter: "2026 Q1", category: null, itemStatus: "shipped", tags: ["Priser", "Plattform"],   votes: 58,  publishedAt: "2026-04-25" },

  // 2026 Q2 — Pågår (current quarter)
  { id: "9",  slug: "onboarding",         title: "Installationsguide & Onboarding",          excerpt: "Steg-för-steg-guide för nya butiksägare.",                                        quarter: "2026 Q2", category: null, itemStatus: "shipped",     tags: ["UX"],                    votes: 43,  publishedAt: "2026-04-25" },
  { id: "10", slug: "docs-hub",           title: "Dokumentationshubb med sökning",           excerpt: "Sökbar dokumentation med versionsfilter och snabbnavigation.",                    quarter: "2026 Q2", category: null, itemStatus: "shipped",     tags: ["Docs"],                  votes: 36,  publishedAt: "2026-04-10" },
  { id: "11", slug: "roadmap-changelog",  title: "Färdplan & Versionshistorik",              excerpt: "Offentlig roadmap med kvartalstidslinje och månadsgrupperad changelog.",          quarter: "2026 Q2", category: null, itemStatus: "shipped",     tags: ["Marketing"],             votes: 28,  publishedAt: "2026-04-10" },
  { id: "12", slug: "payment-settings",   title: "Betalningsinställningar (Stripe, faktura)", excerpt: "Konfigurera Stripe, Klarna och fakturabelatning direkt från admin.",             quarter: "2026 Q2", category: null, itemStatus: "in_progress", tags: ["Betalningar"],           votes: 87,  publishedAt: null },
  { id: "13", slug: "shipping-zones",     title: "Frakt & fraktzoner",                       excerpt: "Skapa fraktzoner med prisnivåer, viktgränser och leveranstider.",                 quarter: "2026 Q2", category: null, itemStatus: "in_progress", tags: ["Leverans"],              votes: 64,  publishedAt: null },

  // 2026 Q3 — Planerat
  { id: "14", slug: "storefront-themes",  title: "Storefront-teman (3 startpaket)",          excerpt: "3 förkonfigurerade teman med färg- och typsnittskontroll.",                       quarter: "2026 Q3", category: null, itemStatus: "planned", tags: ["Design", "Frontend"],    votes: 93,  publishedAt: null },
  { id: "15", slug: "advanced-pricing",   title: "Avancerad prishantering (kampanjer, rabattkoder)", excerpt: "Kampanjpriser, volymrabatter och tidsbegränsade erbjudanden.",           quarter: "2026 Q3", category: null, itemStatus: "planned", tags: ["Priser"],                 votes: 71,  publishedAt: null },
  { id: "16", slug: "affiliate",          title: "Affiliate-program",                        excerpt: "Skapa affiliate-länkar och spåra konverteringar med provisionssystem.",           quarter: "2026 Q3", category: null, itemStatus: "planned", tags: ["Marketing"],             votes: 49,  publishedAt: null },
  { id: "17", slug: "marketplace-full",   title: "Marketplace-modul (fullständig)",          excerpt: "Skapa en plattform med flera säljare, provisioner och säljarportal.",             quarter: "2026 Q3", category: null, itemStatus: "planned", tags: ["Marketplace"],           votes: 112, publishedAt: null },

  // 2026 Q4 — Planerat
  { id: "18", slug: "b2b-panel",          title: "B2B-panel (portalgränssnitt)",             excerpt: "Prissättning per kund, inköpsordrar och fakturabetalning i en dedikerad portal.", quarter: "2026 Q4", category: null, itemStatus: "planned", tags: ["B2B"],                   votes: 89,  publishedAt: null },
  { id: "19", slug: "mobile-app",         title: "iOS/Android-app för orderhantering",       excerpt: "Inbyggd mobilapp för orderhantering och produktuppdateringar.",                   quarter: "2026 Q4", category: null, itemStatus: "planned", tags: ["Mobile"],                votes: 67,  publishedAt: null },
  { id: "20", slug: "ai-descriptions",    title: "AI-produktbeskrivningar",                  excerpt: "Generera produktbeskrivningar automatiskt med AI.",                               quarter: "2026 Q4", category: null, itemStatus: "planned", tags: ["AI"],                    votes: 156, publishedAt: null },

  // 2027 — Planerat
  { id: "21", slug: "multi-currency",     title: "Multi-currency (EUR, USD, GBP)",           excerpt: "Sätt priser och ta betalt i EUR, USD och GBP.",                                   quarter: "2027",    category: null, itemStatus: "planned", tags: ["Internationalisering"],  votes: 98,  publishedAt: null },
  { id: "22", slug: "white-label",        title: "White-label platform",                     excerpt: "Fullt vit-märkt plattform för återförsäljare och byråer.",                        quarter: "2027",    category: null, itemStatus: "planned", tags: ["Plattform"],             votes: 44,  publishedAt: null },
  { id: "23", slug: "headless-api-v2",    title: "Headless Commerce API v2",                 excerpt: "Nästa generation av Headless API med GraphQL och webhook-prenumerationer.",       quarter: "2027",    category: null, itemStatus: "planned", tags: ["API"],                   votes: 73,  publishedAt: null },
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
