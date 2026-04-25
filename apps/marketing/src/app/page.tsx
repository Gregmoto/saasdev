import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { FaqAccordion } from "@/components/faq-accordion";
import { ModeTabs } from "@/components/mode-tabs";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "E-handelsinfrastruktur byggd för att växa",
  description:
    "Den samlade plattformen för moderna handlare — webshop, multishop, marketplace och B2B i en enda dashboard.",
  path: "/",
});

const FEATURES = [
  {
    title: "Hantera flera butiker",
    desc: "Hantera flera butiker och varumärken från en och samma dashboard.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    title: "Lagersaldo i realtid",
    desc: "Live-lagernivåer i alla lager med automatisk reservation.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ),
  },
  {
    title: "Importcenter",
    desc: "Importera från Shopify, WooCommerce, PrestaShop eller CSV på några minuter.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    title: "Betalningsintegrationer",
    desc: "Stripe, Swish, Klarna och fler — med fullt webhook-stöd.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    title: "Kundinsikter",
    desc: "Enhetliga kundprofiler över alla dina kanaler och butiker.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    title: "Utvecklar-API",
    desc: "REST-API med fullständig dokumentation. Bygg egna integrationer.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", title: "Anslut din butik", desc: "Länka din befintliga Shopify-, WooCommerce- eller PrestaShop-butik med ett klick." },
  { n: "02", title: "Importera din data", desc: "Produkter, kunder och ordrar migreras automatiskt. Inget manuellt arbete krävs." },
  { n: "03", title: "Väx med trygghet", desc: "Lager i realtid, samlade ordrar och användbara insikter från dag ett." },
];

const BRANDS = [
  "Acme AB", "NordShop", "Fjord Retail", "Baltic Store",
  "Viking Commerce", "Scandic Goods", "Polar Trade", "Norrland E-handel",
];

const INTEGRATIONS = [
  "Stripe", "Klarna", "Swish", "Shopify", "PostNord",
  "DHL", "Fortnox", "Mailchimp", "WooCommerce", "Visma",
];

const PLANS = [
  {
    name: "Starter",
    price: "299 kr",
    period: "/månad",
    desc: "Perfekt för enskilda butiker.",
    features: ["1 butik", "Obegränsat antal produkter", "3 användare", "Importcenter", "E-postsupport"],
    cta: "Kom igång",
    highlight: false,
  },
  {
    name: "Growth",
    price: "1 199 kr",
    period: "/månad",
    desc: "För växande handlare med flera kanaler.",
    features: ["MultiShop (flera butiker)", "Obegränsat antal produkter", "API-åtkomst", "Avancerad analys", "Prioriterad support"],
    cta: "Kom igång",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Offert",
    period: "",
    desc: "För stora aktörer och marknadsplatser.",
    features: ["Obegränsat antal butiker", "Dedikerad infrastruktur", "SLA-garanti", "Anpassade integrationer"],
    cta: "Kontakta sälj",
    highlight: false,
  },
];

const FALLBACK_POSTS = [
  {
    id: 1,
    title: "Så sätter du upp en multishop på under en timme",
    excerpt: "Steg-för-steg-guide för att konfigurera flera butiker med delat lager och gemensam kunddata.",
    category: "Guide",
    date: "15 april 2026",
    gradient: "from-blue-400 to-blue-600",
  },
  {
    id: 2,
    title: "AI-driven konflikthantering — så fungerar det",
    excerpt: "Vi förklarar hur vår importmotor använder AI för att lösa SKU-konflikter och dataavvikelser automatiskt.",
    category: "Produkt",
    date: "8 april 2026",
    gradient: "from-violet-400 to-violet-600",
  },
  {
    id: 3,
    title: "5 sätt att öka din konverteringsgrad med bättre SEO",
    excerpt: "Praktiska råd om Schema.org, hreflang och sitemaps som hjälper din butik att ranka högre.",
    category: "SEO",
    date: "1 april 2026",
    gradient: "from-emerald-400 to-emerald-600",
  },
];

const FALLBACK_FAQS = [
  { question: "Hur lång är provperioden?", answer: "Du får 14 dagars gratis provperiod utan kreditkort. Uppgradera när du är redo." },
  { question: "Kan jag importera min befintliga butik?", answer: "Ja. ShopMan stödjer direktimport från Shopify, WooCommerce och PrestaShop, samt CSV-import för övriga plattformar. AI-motorn hanterar datakonflikter automatiskt." },
  { question: "Hur fungerar MultiShop?", answer: "Med MultiShop hanterar du flera butiker från en enda admin. Lager, kunder och ordrar kan delas eller isoleras per butik — du bestämmer." },
  { question: "Vilka betalningsmetoder stöds?", answer: "Stripe, Klarna, Swish och fler finns inbyggda. Via API kan du koppla vilken betalleverantör som helst." },
  { question: "Finns det stöd för B2B och grossist?", answer: "Ja. B2B-läget inkluderar kundspecifika prislistor, kreditgränser, fakturaflöden och separata B2B-portaler." },
  { question: "Hur säker är plattformen?", answer: "ShopMan körs på ISO-certifierad infrastruktur med krypterad data i vila och transit, tvåfaktorsautentisering och fullständiga revisionsloggar." },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface CmsPost {
  id: number | string;
  title: string;
  excerpt: string;
  category?: string;
  publishedAt?: string;
  slug?: string;
}

interface CmsFaq {
  question: string;
  answer: string;
}

async function fetchPosts(): Promise<typeof FALLBACK_POSTS> {
  try {
    const res = await fetch(`${API}/api/cms/posts?type=blog&lang=sv&limit=3`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_POSTS;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK_POSTS;
    const data: CmsPost[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_POSTS;
    return data.map((p, i) => ({
      id: typeof p.id === "number" ? p.id : i,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category ?? "Artikel",
      date: p.publishedAt
        ? new Date(p.publishedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
        : "",
      gradient: ["from-blue-400 to-blue-600", "from-violet-400 to-violet-600", "from-emerald-400 to-emerald-600"][i % 3],
    }));
  } catch {
    return FALLBACK_POSTS;
  }
}

async function fetchFaqs(): Promise<{ question: string; answer: string }[]> {
  try {
    const res = await fetch(`${API}/api/cms/faqs?lang=sv&limit=6`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_FAQS;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK_FAQS;
    const data: CmsFaq[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_FAQS;
    return data;
  } catch {
    return FALLBACK_FAQS;
  }
}

export default async function HomePage() {
  const [posts, faqs] = await Promise.all([fetchPosts(), fetchFaqs()]);
  return (
    <>
      <Nav />
      <main className="bg-stone-50">

        {/* ── Section 1: Hero ───────────────────────────────── */}
        <section className="bg-white">
          <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
            <div className="inline-flex items-center gap-2 border border-stone-200 bg-stone-100 text-stone-700 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              Nu med AI-driven konflikthantering vid import
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-stone-900 leading-[1.1] tracking-tight mb-6">
              E-handelsinfrastruktur<br />
              byggd för att växa
            </h1>

            <p className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed mb-10">
              Den samlade plattformen för moderna handlare — webshop, multishop, marketplace och B2B i en enda dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
              >
                Kom igång gratis
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 text-stone-600 font-medium px-7 py-3.5 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors text-sm"
              >
                Se demo
              </Link>
            </div>

            {/* Mock dashboard */}
            <div className="mt-16 mx-auto max-w-4xl">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="mx-auto text-xs text-stone-400 font-mono">admin.shopman.dev/dashboard</div>
                </div>
                <div className="flex bg-stone-50 min-h-[300px]">
                  {/* Sidebar */}
                  <div className="w-40 flex-shrink-0 border-r border-stone-200 bg-white p-4 space-y-1 hidden sm:block">
                    {[
                      { label: "Översikt", active: true },
                      { label: "Ordrar", active: false },
                      { label: "Produkter", active: false },
                      { label: "Kunder", active: false },
                      { label: "Lager", active: false },
                      { label: "Integrationer", active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          item.active ? "bg-blue-50 text-blue-700" : "text-stone-400"
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                    <div className="pt-4 mt-4 border-t border-stone-100">
                      <div className="px-3 py-1 text-[10px] text-stone-300 font-medium uppercase tracking-wider mb-1">Butiker</div>
                      {["NordShop", "Acme AB", "Fjord Retail"].map((s) => (
                        <div key={s} className="px-3 py-1 text-xs text-stone-400">{s}</div>
                      ))}
                    </div>
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {(["Ordrar", "Intäkter", "Kunder", "Produkter"] as const).map((label, i) => (
                        <div key={label} className="bg-white rounded-xl border border-stone-100 p-3.5 shadow-sm">
                          <div className="text-xs text-stone-400 mb-1.5">{label}</div>
                          <div className="text-lg font-bold text-stone-900">{["142", "48 200 kr", "891", "1 204"][i]}</div>
                          <div className="text-xs text-green-600 mt-0.5">↑ {["12%", "8%", "23%", "4%"][i]}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 bg-white rounded-xl border border-stone-100 p-4 shadow-sm h-28 flex flex-col justify-between">
                        <div className="text-xs text-stone-400 mb-2">Orderöversikt — senaste 30 dagarna</div>
                        <div className="flex items-end gap-1 h-14">
                          {[40, 55, 35, 70, 60, 80, 65, 90, 75, 100, 85, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue-100 rounded-t" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border border-stone-100 p-3.5 shadow-sm h-28">
                        <div className="text-xs text-stone-400 mb-2">Senaste ordrar</div>
                        {[["#1042", "Betald", "green"], ["#1041", "Packad", "blue"], ["#1040", "Levererad", "stone"]].map(([n, status, color]) => (
                          <div key={n} className="flex justify-between items-center py-0.5">
                            <span className="text-[10px] font-mono text-stone-600">{n}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              color === "green" ? "text-green-600 bg-green-50" :
                              color === "blue" ? "text-blue-600 bg-blue-50" :
                              "text-stone-500 bg-stone-100"
                            }`}>{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-b border-stone-100" />
        </section>

        {/* ── Section 2: Social proof ───────────────────────── */}
        <section className="bg-stone-50 border-y border-stone-100 py-14">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-xs text-stone-400 uppercase tracking-widest mb-8 font-medium">
              Används av handlare i hela Skandinavien
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {BRANDS.map((name) => (
                <span
                  key={name}
                  className="text-xs font-semibold text-stone-400 tracking-wide border border-stone-200 px-4 py-2 rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Features grid ──────────────────────── */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-6 py-28">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Plattform</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4">
                Allt du behöver för att driva din butik
              </h2>
              <p className="text-stone-500 leading-relaxed">
                Verktyg byggda för e-handel som samverkar sömlöst, så att du kan fokusera på att växa.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group bg-stone-50 rounded-2xl p-6 border border-stone-100 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center mb-5 text-blue-600 group-hover:border-blue-100 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-stone-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Mode cards ─────────────────────────── */}
        <section className="bg-stone-50">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="text-center mb-12">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Flexibilitet</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                En plattform, fyra sätt att växa
              </h2>
            </div>
            <ModeTabs />
          </div>
        </section>

        {/* ── Section 5: MultiShop highlight ───────────────── */}
        <section className="bg-stone-900 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">MultiShop</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Alla dina butiker på ett ställe
              </h2>
              <p className="text-stone-400 mt-4 max-w-xl mx-auto leading-relaxed">
                Växla mellan butiker utan att logga ut. Dela lager, kunder och kampanjer — eller håll allt isolerat.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Butiker", value: "Obegränsat" },
                  { label: "Produkter", value: "10M+" },
                  { label: "Ordrar/mån", value: "500K+" },
                  { label: "Lager", value: "Globalt" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-stone-800 rounded-2xl border border-stone-700 p-6">
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-stone-400">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[
                  "Shoppa mellan butiker utan att logga in igen",
                  "Dela kundprofiler och köphistorik",
                  "Gemensam inventariepool med per-butik-allokering",
                  "En faktura, ett konto — oavsett antal butiker",
                  "Rollbaserad åtkomst per butik och team",
                  "Centraliserad analys och rapportering",
                ].map((b) => (
                  <div key={b} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-stone-300 text-sm leading-relaxed">{b}</span>
                  </div>
                ))}
                <div className="pt-4">
                  <Link href="/features#multishop" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                    Utforska MultiShop →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 6: SEO & Speed ────────────────────────── */}
        <section className="bg-white py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">SEO & Hastighet</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Bygg för sökmotorer och hastighet
              </h2>
              <p className="text-stone-500 mt-4 max-w-xl mx-auto leading-relaxed">
                ShopMan genererar teknisk SEO-data automatiskt — du fokuserar på innehållet.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Schema.org-utdata",
                  desc: "Automatisk generering av strukturerad data för produkter, recensioner och brödsmulor — ger rich results i Google.",
                  icon: (
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  ),
                },
                {
                  title: "Sitemap & robots.txt",
                  desc: "Automatiskt genererade och uppdaterade sitemaps. robots.txt med finkornig kontroll per butik och katalog.",
                  icon: (
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  ),
                },
                {
                  title: "Hreflang & flerspråkig SEO",
                  desc: "Korrekt hreflang-implementering för alla dina språk och regioner. Inga dubbletter, ingen kannibalisering.",
                  icon: (
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"/>
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
                  <div className="mb-5">{item.icon}</div>
                  <h3 className="font-semibold text-stone-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 7: Integrations ───────────────────────── */}
        <section className="bg-stone-50 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Integrationer</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Koppla ihop hela din stack
              </h2>
              <p className="text-stone-500 mt-4 max-w-xl mx-auto leading-relaxed">
                Färdiga kopplingar till de verktyg du redan använder. Eller bygg din egen via API.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
              {INTEGRATIONS.map((name) => (
                <div key={name} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center text-stone-300">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="12" height="12" rx="2"/>
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-stone-600 text-center">{name}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href="/integrations" className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors">
                Se alla integrationer →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 8: Pricing teaser ─────────────────────── */}
        <section className="bg-white py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Priser</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Transparenta priser för alla storlekar
              </h2>
              <p className="text-stone-500 mt-4">14 dagars gratis provperiod. Inget kreditkort krävs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-7 border transition-all shadow-sm ${
                    plan.highlight
                      ? "ring-2 ring-blue-600 bg-blue-50 border-blue-200"
                      : "bg-white border-stone-200"
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${plan.highlight ? "text-blue-600" : "text-blue-600"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-stone-900">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-stone-400">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm mb-5 text-stone-500">{plan.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-stone-700">
                        <span className="text-green-500">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      plan.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/pricing" className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors">
                Se fullständiga priser →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 9: Testimonial ────────────────────────── */}
        <section className="bg-stone-50">
          <div className="max-w-4xl mx-auto px-6 py-28 text-center">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-12">
              <div className="text-5xl text-stone-200 mb-6 font-serif leading-none">&ldquo;</div>
              <blockquote className="text-2xl md:text-3xl font-medium text-stone-900 leading-snug tracking-tight mb-10">
                ShopMan har förändrat hur vi hanterar vår e-handel. Allt på ett ställe, inget manuellt.
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-stone-900">Anna Lindqvist</div>
                  <div className="text-xs text-stone-400">E-handelschef, NordShop AB</div>
                </div>
                <div className="ml-4 w-24 h-8 rounded bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-semibold">
                  NordShop
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 10: How it works ──────────────────────── */}
        <section className="bg-white py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Kom igång</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Igång på några minuter
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-full h-px bg-stone-200" />
                  )}
                  <div className="mb-4">
                    <span className="text-6xl font-bold text-stone-200 leading-none">{s.n}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 11: Blog / latest ─────────────────────── */}
        <section className="bg-stone-50 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-14">
              <div>
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Blogg</div>
                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                  Senaste nytt
                </h2>
              </div>
              <Link href="/blog" className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors hidden sm:block">
                Se alla artiklar →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article key={post.id} className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`h-40 bg-gradient-to-br ${post.gradient}`} />
                  <div className="p-6">
                    <div className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-3">
                      {post.category}
                    </div>
                    <h3 className="font-semibold text-stone-900 mb-2 leading-snug group-hover:text-blue-700 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">{post.date}</span>
                      <Link href="/blog" className="text-xs text-blue-700 font-medium hover:text-blue-800 transition-colors">
                        Läs mer →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link href="/blog" className="text-sm text-blue-700 font-medium">Se alla artiklar →</Link>
            </div>
          </div>
        </section>

        {/* ── Section 12: FAQ ───────────────────────────────── */}
        <section className="bg-white py-28">
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Support</div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Vanliga frågor
              </h2>
            </div>
            <FaqAccordion items={faqs} />
            <div className="text-center mt-10">
              <p className="text-sm text-stone-500">
                Hittar du inte svaret?{" "}
                <Link href="/contact" className="text-blue-700 hover:text-blue-800 font-medium transition-colors">
                  Kontakta oss
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 13: Footer CTA ────────────────────────── */}
        <section className="bg-stone-900 py-32">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Redo att sätta igång?
            </h2>
            <p className="text-stone-400 mb-10 max-w-md mx-auto leading-relaxed">
              Anslut dig till hundratals handlare som driver sin e-handel med ShopMan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center bg-white hover:bg-stone-100 text-stone-900 font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
              >
                Starta din gratis provperiod
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center text-stone-400 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm border border-stone-700 hover:border-stone-500"
              >
                Se demo →
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
