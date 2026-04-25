import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Färdplan",
  description:
    "Se vad som är på gång hos ShopMan — planerade funktioner, pågående arbete och kommande releaser.",
  path: "/roadmap",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StatusKey = "done" | "in_progress" | "planned";

interface RoadmapItem {
  title: string;
  status: StatusKey;
  description?: string;
}

interface RoadmapQuarter {
  label: string;
  items: RoadmapItem[];
}

// ---------------------------------------------------------------------------
// CMS fetch
// ---------------------------------------------------------------------------
async function fetchRoadmap(): Promise<RoadmapQuarter[] | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/cms/roadmap?lang=sv&limit=50`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { quarters?: RoadmapQuarter[] };
    if (!data.quarters?.length) return null;
    return data.quarters;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------
const STATIC_QUARTERS: RoadmapQuarter[] = [
  {
    label: "Q2 2026",
    items: [
      { title: "Setup wizard", status: "done", description: "Guidad onboarding för nya butiker." },
      { title: "Gratis plan", status: "done", description: "Starta utan kostnad, uppgradera när du vill." },
      { title: "Demo hub", status: "done", description: "Interaktiv demo av plattformens funktioner." },
    ],
  },
  {
    label: "Q3 2026",
    items: [
      { title: "Betalningsinställningar", status: "in_progress", description: "Hantera Klarna, Swish och Stripe direkt i plattformen." },
      { title: "Frakt & zoner", status: "in_progress", description: "Konfigurera fraktregler per zon och leverantör." },
      { title: "Avancerad prishantering", status: "planned", description: "Kampanjpriser, kundgruppsrabatter och tidsbegränsade erbjudanden." },
      { title: "Storefront themes", status: "planned", description: "Välj och anpassa butikstema utan kod." },
    ],
  },
  {
    label: "Q4 2026",
    items: [
      { title: "Marketplace-modul", status: "planned", description: "Sälj via externa marknadsplatser direkt från ShopMan." },
      { title: "B2B-panel", status: "planned", description: "Prislister, kundkrediter och orderhantering för grossisters kunder." },
      { title: "Fortnox-integration", status: "planned", description: "Automatisk bokföring och fakturasynk med Fortnox." },
      { title: "iOS & Android app", status: "planned", description: "Hantera ordrar och lager direkt från mobilen." },
    ],
  },
  {
    label: "2027",
    items: [
      { title: "AI-produktbeskrivningar", status: "planned", description: "Generera SEO-optimerade produkttexter med ett klick." },
      { title: "Multi-currency", status: "planned", description: "Sälj i flera valutor med automatisk valutaomräkning." },
      { title: "White-label", status: "planned", description: "Erbjud ShopMan under ditt eget varumärke till dina kunder." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<StatusKey, { label: string; className: string }> = {
  done: {
    label: "Klart",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  in_progress: {
    label: "Pagar",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  planned: {
    label: "Planerat",
    className: "bg-stone-50 text-stone-600 border border-stone-200",
  },
};

function StatusBadge({ status }: { status: StatusKey }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.planned;
  const icons: Record<StatusKey, string> = {
    done: "✓",
    in_progress: "→",
    planned: "·",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      <span>{icons[status]}</span>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function RoadmapPage() {
  const quarters = (await fetchRoadmap()) ?? STATIC_QUARTERS;

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-stone-900 mb-3">Färdplan</h1>
          <p className="text-stone-500 leading-relaxed max-w-2xl">
            Här ser du vad vi jobbar med och vad som är på gång. Har du ett önskemål?{" "}
            <a href="/contact" className="text-blue-700 hover:underline">
              Hör av dig
            </a>
            .
          </p>
        </div>

        <div className="space-y-12">
          {quarters.map((quarter) => (
            <section key={quarter.label}>
              <h2 className="text-lg font-semibold text-stone-900 mb-5 flex items-center gap-3">
                {quarter.label}
                <span className="h-px flex-1 bg-stone-100" />
              </h2>
              <ul className="space-y-3">
                {quarter.items.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-start gap-4 p-4 rounded-xl border border-stone-100 bg-white hover:border-stone-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-stone-900 text-sm">{item.title}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.description && (
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
