import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/schema-org";

export const revalidate = 3600;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Benefit {
  title: string;
  description: string;
  iconUrl?: string;
}

interface Screenshot {
  url: string;
  alt: string;
  caption?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface CmsFeature {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  category?: string;
  benefits: Benefit[];
  screenshots: Screenshot[];
  relatedFeatureSlugs: string[];
  faqItems: FaqItem[];
  ctaText?: string;
  ctaUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  publishedAt?: string;
  updatedAt: string;
}

// ── Fallback data ─────────────────────────────────────────────────────────────

const FALLBACK_FEATURES: Record<string, Partial<CmsFeature>> = {
  "lagersaldo-i-realtid": {
    slug: "lagersaldo-i-realtid",
    title: "Lagersaldo i realtid",
    tagline: "Sälj aldrig mer än du har",
    excerpt: "Live-lagernivåer i alla lager med automatisk reservation vid kassan. Lageruppdateringar sprids direkt i alla dina kanaler.",
    category: "Lager",
    benefits: [
      { title: "Realtidsuppdateringar", description: "Lagernivåer synkroniseras direkt — inga fördröjningar eller överlappande försäljningar." },
      { title: "Automatiska reservationer", description: "Varor reserveras i kassan och frigörs automatiskt om ordern avbryts." },
      { title: "Stöd för flera lager", description: "Hantera lager på flera platser och dirigera ordrar optimalt." },
      { title: "Larm vid lågt lager", description: "Få notiser när lagernivåer sjunker under dina tröskelvärden." },
    ],
    faqItems: [
      { question: "Hur snabbt uppdateras lagret?", answer: "Lagret uppdateras i realtid — normalt inom 1–2 sekunder efter en bekräftad order." },
      { question: "Kan jag ha flera lager?", answer: "Ja, ShopMan stöder obegränsat antal lagerplatser med individuella lagernivåer per lager." },
    ],
    relatedFeatureSlugs: ["importcenter", "multishop", "betalningsintegrationer"],
    ctaText: "Kom igång gratis",
    ctaUrl: "/contact",
  },
  "importcenter": {
    slug: "importcenter",
    title: "Importcenter",
    tagline: "Migrera på minuter, inte månader",
    excerpt: "Importera från Shopify, WooCommerce, PrestaShop eller CSV på några minuter. AI-driven konflikthantering tar hand om dubbla SKU:er automatiskt.",
    category: "Import",
    benefits: [
      { title: "Direktanslutningar", description: "Shopify, WooCommerce och PrestaShop ansluts med ett klick." },
      { title: "CSV & kalkylblad", description: "Importera produkter, kunder och ordrar från valfri CSV-källa." },
      { title: "AI-konflikthantering", description: "Automatisk hantering av dubbla SKU:er och felanpassad data." },
      { title: "Återupptagbara jobb", description: "Fortsätt en avbruten import utan att börja om från noll." },
    ],
    faqItems: [
      { question: "Hur lång tid tar en import?", answer: "En typisk Shopify-migration med 10 000 produkter tar 5–15 minuter." },
      { question: "Vad händer med mina ordrar?", answer: "Historiska ordrar, kunder och produkter migreras fullständigt — inklusive bilder och varianter." },
    ],
    relatedFeatureSlugs: ["lagersaldo-i-realtid", "multishop"],
    ctaText: "Testa importen gratis",
    ctaUrl: "/contact",
  },
};

const FALLBACK_SLUGS = Object.keys(FALLBACK_FEATURES);

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchFeature(slug: string): Promise<CmsFeature | null> {
  try {
    const res = await fetch(`${API}/api/cms/features/${slug}?lang=sv`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return null;
    return res.json() as Promise<CmsFeature>;
  } catch {
    return null;
  }
}

async function fetchRelatedFeatures(slugs: string[]): Promise<Partial<CmsFeature>[]> {
  const results = await Promise.all(
    slugs.slice(0, 3).map(async (s) => {
      const f = await fetchFeature(s);
      return f ?? FALLBACK_FEATURES[s] ?? null;
    }),
  );
  return results.filter(Boolean) as Partial<CmsFeature>[];
}

// ── generateStaticParams ──────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API}/api/cms/features?lang=sv&limit=100`, {
      cache: "no-store",
    });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("application/json")) {
      const data = (await res.json()) as { items: CmsFeature[] };
      return (data.items ?? []).map((f) => ({ slug: f.slug }));
    }
  } catch {
    // fallback
  }
  return FALLBACK_SLUGS.map((slug) => ({ slug }));
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = await fetchFeature(slug);
  const fallback = FALLBACK_FEATURES[slug];

  const title = feature?.seoTitle ?? feature?.title ?? fallback?.title ?? "Funktion";
  const description =
    feature?.seoDescription ?? feature?.excerpt ?? fallback?.excerpt ?? "ShopMan-funktion";

  return buildMetadata({
    title,
    description,
    path: `/features/${slug}`,
    ogImage: feature?.ogImageUrl ?? feature?.coverImageUrl,
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FeatureSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cmsFeature = await fetchFeature(slug);
  const fallback = FALLBACK_FEATURES[slug];
  const feature = cmsFeature ?? (fallback as Partial<CmsFeature> | undefined);

  // If neither CMS nor fallback exists → show placeholder
  if (!feature) {
    return (
      <>
        <Nav />
        <main className="max-w-3xl mx-auto px-6 py-32 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 mb-4">Funktionen laddas snart</h1>
          <p className="text-zinc-500 mb-8">Vi håller på att dokumentera den här funktionen. Kom tillbaka snart!</p>
          <Link href="/features" className="text-blue-600 hover:underline text-sm">← Tillbaka till alla funktioner</Link>
        </main>
        <Footer />
      </>
    );
  }

  const benefits = feature.benefits ?? [];
  const screenshots = feature.screenshots ?? [];
  const faqItems = feature.faqItems ?? [];
  const relatedSlugs = feature.relatedFeatureSlugs ?? [];
  const relatedFeatures = await fetchRelatedFeatures(relatedSlugs);

  const breadcrumb = [
    { label: "Hem", url: SITE_URL },
    { label: "Funktioner", url: `${SITE_URL}/features` },
    { label: feature.title ?? "", url: `${SITE_URL}/features/${slug}` },
  ];

  return (
    <>
      <Nav />

      {/* JSON-LD */}
      {breadcrumb.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(breadcrumb)) }}
        />
      )}
      {faqItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqItems)) }}
        />
      )}

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-zinc-100">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-50 opacity-50 blur-3xl" />
          </div>
          <div className="max-w-5xl mx-auto px-6 pt-20 pb-16">
            {feature.category && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">
                <Link href="/features" className="hover:underline">Funktioner</Link>
                <span className="text-zinc-300">/</span>
                <span>{feature.category}</span>
              </div>
            )}
            <div className="md:flex md:items-start md:gap-16">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-zinc-950 leading-tight tracking-tight mb-4">
                  {feature.title}
                </h1>
                {feature.tagline && (
                  <p className="text-xl text-blue-600 font-medium mb-4">{feature.tagline}</p>
                )}
                {feature.excerpt && (
                  <p className="text-lg text-zinc-500 leading-relaxed mb-8">{feature.excerpt}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={feature.ctaUrl ?? "/contact"}
                    className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm shadow-md hover:shadow-lg"
                  >
                    {feature.ctaText ?? "Kom igång gratis"}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 font-medium px-6 py-3 rounded-xl border border-zinc-200 text-sm transition-all"
                  >
                    Se demo
                  </Link>
                </div>
              </div>
              {/* Cover image / placeholder */}
              <div className="hidden md:block w-80 flex-shrink-0">
                {feature.coverImageUrl ? (
                  <img src={feature.coverImageUrl} alt={feature.title} className="rounded-2xl border border-zinc-100 shadow-lg w-full" />
                ) : (
                  <div className="rounded-2xl border border-zinc-100 bg-gradient-to-br from-blue-50 to-blue-100 h-56 flex items-center justify-center shadow-sm">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Benefits ──────────────────────────────────────────────────── */}
        {benefits.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Fördelar</div>
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-950 tracking-tight">
                Varför {feature.title}?
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b, i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  {b.iconUrl ? (
                    <img src={b.iconUrl} alt="" className="w-10 h-10 mb-4" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 9l4 4 8-8" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <h3 className="font-semibold text-zinc-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{b.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Body content ──────────────────────────────────────────────── */}
        {feature.body && (
          <section className="max-w-3xl mx-auto px-6 pb-16">
            <div
              className="prose prose-zinc prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: feature.body.replace(/\n\n/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>") }}
            />
          </section>
        )}

        {/* ── Screenshots ───────────────────────────────────────────────── */}
        {screenshots.length > 0 && (
          <section className="bg-zinc-50 py-20">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-950 tracking-tight">Se det i aktion</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {screenshots.map((s, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-white">
                    <img src={s.url} alt={s.alt} className="w-full object-cover" />
                    {s.caption && (
                      <p className="px-4 py-3 text-xs text-zinc-400 border-t border-zinc-100">{s.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        {faqItems.length > 0 && (
          <section className="max-w-3xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-950 tracking-tight">Vanliga frågor</h2>
            </div>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <details key={i} className="group bg-white border border-zinc-100 rounded-2xl shadow-sm">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-medium text-zinc-900 hover:text-blue-600 transition-colors">
                    {item.question}
                    <svg
                      className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                      viewBox="0 0 16 16" fill="none"
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-sm text-zinc-500 leading-relaxed border-t border-zinc-50 pt-3">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ── Related features ──────────────────────────────────────────── */}
        {relatedFeatures.length > 0 && (
          <section className="border-t border-zinc-100 py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-xl font-bold text-zinc-900 mb-8">Relaterade funktioner</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedFeatures.map((f, i) => (
                  <Link
                    key={i}
                    href={`/features/${f.slug}`}
                    className="group block bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    {f.category && (
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{f.category}</span>
                    )}
                    <h3 className="font-semibold text-zinc-900 mt-2 mb-2 group-hover:text-blue-600 transition-colors">
                      {f.title}
                    </h3>
                    {f.excerpt && (
                      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{f.excerpt}</p>
                    )}
                    <span className="mt-4 inline-block text-xs font-medium text-blue-600 group-hover:underline">
                      Läs mer →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="bg-blue-600 rounded-3xl px-8 py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
                Redo att prova {feature.title}?
              </h2>
              <p className="text-blue-100 mb-8 max-w-md mx-auto text-sm">
                Kom igång gratis — 14 dagars provperiod utan kreditkort.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={feature.ctaUrl ?? "/contact"}
                  className="inline-flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 font-semibold px-8 py-3 rounded-xl transition-colors text-sm shadow-lg"
                >
                  {feature.ctaText ?? "Starta din gratis provperiod"}
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center text-white/80 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm border border-white/20 hover:border-white/40"
                >
                  ← Alla funktioner
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
