import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata, SITE_URL, SITE_NAME } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema-org";

export const revalidate = 3600;

interface CompetitorData {
  slug: string;
  name: string;
  icon: string;
  heroTitle: string;
  heroSubtitle: string;
  quickComparison: {
    metric: string;
    shopman: string;
    competitor: string;
    winner: "shopman" | "competitor" | "tie";
  }[];
  painPoints: {
    title: string;
    problem: string;
    solution: string;
  }[];
  featureComparison: {
    feature: string;
    shopman: "yes" | "no" | "partial" | "n/a";
    competitor: "yes" | "no" | "partial" | "n/a";
  }[];
  migrationSteps: {
    step: number;
    title: string;
    description: string;
  }[];
  performanceClaims: string[];
  pricing: {
    shopmanEntry: string;
    shopmanMid: string;
    competitorEntry: string;
    competitorMid: string;
  };
  testimonial: {
    quote: string;
    author: string;
    company: string;
    previousPlatform: string;
  };
}

const COMPETITORS: Record<string, CompetitorData> = {
  shopify: {
    slug: "shopify",
    name: "Shopify",
    icon: "🛍️",
    heroTitle: "ShopMan — det bästa alternativet till Shopify för svenska handlare",
    heroSubtitle: "Slipp Shopify-avgifter, inbyggt Fortnox-stöd och fullt anpassad för den svenska marknaden.",
    quickComparison: [
      { metric: "Startpris", shopman: "Gratis (Free) · 299 kr/mån (Starter)", competitor: "ca 350 kr/mån (Shopify Basic)", winner: "competitor" },
      { metric: "Transaktionsavgift", shopman: "0%", competitor: "0,5–2% utan Shopify Payments", winner: "shopman" },
      { metric: "Antal produkter (Starter)", shopman: "500", competitor: "Obegränsat", winner: "competitor" },
      { metric: "Fortnox-integration", shopman: "Native, inbyggd", competitor: "Tredjepartapp, extra kostnad", winner: "shopman" },
      { metric: "Multishop", shopman: "Ingår i Growth", competitor: "Kräver Shopify Plus (>32 000 kr/mån)", winner: "shopman" },
    ],
    painPoints: [
      {
        title: "Transaktionsavgifter äter upp marginalen",
        problem: "Shopify tar 0,5–2% transaktionsavgift om du inte använder Shopify Payments — som inte har stöd för Swish, fakturabetalning eller Fortnox.",
        solution: "ShopMan tar noll transaktionsavgifter. Använd Klarna, Swish eller vilken betallösning du vill utan extra kostnad.",
      },
      {
        title: "Fortnox kostar extra och är klurigt",
        problem: "Fortnox-integration till Shopify kräver tredjepartsappar som kostar 300–600 kr/mån extra och har begränsad funktionalitet.",
        solution: "ShopMan har native Fortnox-integration inkluderad i Growth-planen. Inga extra appar, inga extraköp.",
      },
      {
        title: "Multishop kräver Shopify Plus",
        problem: "Vill du driva flera butiker eller marknader i Shopify måste du upp till Shopify Plus för 32 000 kr/mån eller mer.",
        solution: "ShopMans Growth-plan för 1 199 kr/mån inkluderar 5 marknader med delade produktkataloger och separat prissättning.",
      },
      {
        title: "Allt är på engelska",
        problem: "Shopify är byggt för den engelska marknaden. Svensk momshantering, OCR-betalningar och GDPR kräver anpassning och plugins.",
        solution: "ShopMan är byggt i Sverige, för Sverige. Korrekt momshantering, GDPR-compliance och svensk support ingår från dag ett.",
      },
    ],
    featureComparison: [
      { feature: "Webshop", shopman: "yes", competitor: "yes" },
      { feature: "Obegränsat antal produkter (Starter)", shopman: "no", competitor: "yes" },
      { feature: "Klarna-integration", shopman: "yes", competitor: "partial" },
      { feature: "Swish-integration", shopman: "yes", competitor: "no" },
      { feature: "Fortnox-integration (inbyggd)", shopman: "yes", competitor: "no" },
      { feature: "Multishop ingår", shopman: "yes", competitor: "no" },
      { feature: "Transaktionsavgift 0%", shopman: "yes", competitor: "partial" },
      { feature: "Svensk support", shopman: "yes", competitor: "no" },
      { feature: "GDPR-anpassat", shopman: "yes", competitor: "partial" },
      { feature: "B2B-prissättning", shopman: "yes", competitor: "partial" },
      { feature: "Leverantörssynk (FTP/EDI)", shopman: "yes", competitor: "no" },
      { feature: "API-åtkomst", shopman: "yes", competitor: "yes" },
      { feature: "Anpassad domän", shopman: "yes", competitor: "yes" },
      { feature: "Gratis provperiod", shopman: "yes", competitor: "yes" },
      { feature: "Importguide från Shopify", shopman: "yes", competitor: "n/a" },
    ],
    migrationSteps: [
      { step: 1, title: "Anslut din Shopify-butik", description: "Logga in på ShopMan och gå till Importcenter. Ange din Shopify-URL och API-nyckel. Allt verifieras automatiskt på sekunder." },
      { step: 2, title: "Importguiden kör allt", description: "Välj vad du vill ta med: produkter, kunder, ordrar, bilder. ShopMan importerar allting parallellt — en butik med 1 000 produkter tar ca 10 minuter." },
      { step: 3, title: "Koppla domän och aktivera", description: "Peka din domän mot ShopMan, aktivera dina betalningslösningar och gå live. Shopify kan hållas igång parallellt under hela övergången." },
    ],
    performanceClaims: [
      "ShopMans produktsidor laddar i snitt under 1,2 sekunder (Core Web Vitals)",
      "Automatisk bildoptimering och lazy loading utan plugin",
      "Inbyggd strukturerad data (Schema.org) för bättre Google-ranking",
      "Serverside rendering för snabbast möjliga TTFB",
    ],
    pricing: {
      shopmanEntry: "Gratis (Free) eller 299 kr/mån (Starter)",
      shopmanMid: "1 199 kr/mån",
      competitorEntry: "ca 350 kr/mån (Basic)",
      competitorMid: "ca 1 050 kr/mån (Shopify) + transaktionsavgifter",
    },
    testimonial: {
      quote: "Vi sparar 4 500 kr i månaden jämfört med Shopify när vi räknar in alla appar vi behövde. Fortnox fungerar perfekt och supporten är på svenska — äntligen.",
      author: "Karin Eriksson",
      company: "Nordiska Trävaror AB",
      previousPlatform: "Shopify",
    },
  },
  woocommerce: {
    slug: "woocommerce",
    name: "WooCommerce",
    icon: "🟣",
    heroTitle: "ShopMan — det bästa alternativet till WooCommerce",
    heroSubtitle: "Slipp WordPress-komplexiteten. Få en dedikerad e-handelsplattform med inbyggd bokföring och leverantörssynk.",
    quickComparison: [
      { metric: "Startpris", shopman: "Gratis (Free) · 299 kr/mån (allt inkl.)", competitor: "Gratis + hosting ca 200 kr/mån + plugins", winner: "tie" },
      { metric: "Teknisk drift", shopman: "Hanteras av ShopMan", competitor: "Du hanterar server, säkerhet och uppdateringar", winner: "shopman" },
      { metric: "Fortnox-integration", shopman: "Native, inbyggd", competitor: "Plugin, extra kostnad och komplex setup", winner: "shopman" },
      { metric: "Laddningstid", shopman: "Under 1,2 sek i snitt", competitor: "Beror på hosting och plugin-stack", winner: "shopman" },
      { metric: "Skalbarhet", shopman: "Automatisk skalning", competitor: "Kräver manuell serveruppgradering", winner: "shopman" },
    ],
    painPoints: [
      {
        title: "WordPress kräver konstant underhåll",
        problem: "WooCommerce kräver att du hanterar WordPress-uppdateringar, plugin-konflikter, säkerhetspatchar och serverövervakning — en deltidstjänst i sig.",
        solution: "ShopMan är en fullt hanterad plattform. Vi sköter all infrastruktur, säkerhet och uppdateringar. Du fokuserar på att sälja.",
      },
      {
        title: "Plugin-kaos och oförutsedda kostnader",
        problem: "En typisk WooCommerce-butik kräver 15–30 plugins för att matcha ShopMans grundfunktioner. Kostnaden adderas snabbt till 1 000–3 000 kr/mån.",
        solution: "Allt ShopMan erbjuder är inbyggt — ingen plugin-stack, inga plugin-konflikter, inga dolda kostnader.",
      },
      {
        title: "Prestanda är sårbar",
        problem: "WooCommerce-butiker med många plugins och produkter lider ofta av långa laddningstider som direkt påverkar konverteringsgrad och SEO-ranking.",
        solution: "ShopMan är byggt för hastighet med edge-rendering, automatisk bildoptimering och CDN. Snabbt från dag ett, utan optimeringsarbete.",
      },
      {
        title: "Svårt att växa till flera marknader",
        problem: "Att driva WooCommerce-butiker på flera marknader innebär separata WordPress-installationer, databaser och serverinstanser — en logistisk mardröm.",
        solution: "ShopMans Growth-plan ger 5 marknader från en enda adminpanel. Dela produktkatalog, sync lager och ha separat prissättning per marknad.",
      },
    ],
    featureComparison: [
      { feature: "Inget tekniskt underhåll", shopman: "yes", competitor: "no" },
      { feature: "Inbyggd bokföringsintegration", shopman: "yes", competitor: "no" },
      { feature: "Automatisk skalning", shopman: "yes", competitor: "no" },
      { feature: "Klarna & Swish inbyggt", shopman: "yes", competitor: "partial" },
      { feature: "Fortnox native", shopman: "yes", competitor: "no" },
      { feature: "Multishop ingår", shopman: "yes", competitor: "no" },
      { feature: "Leverantörssynk (FTP/EDI)", shopman: "yes", competitor: "no" },
      { feature: "API-åtkomst", shopman: "yes", competitor: "yes" },
      { feature: "Open source", shopman: "no", competitor: "yes" },
      { feature: "Anpassad domän", shopman: "yes", competitor: "yes" },
      { feature: "Fullt anpassningsbart tema", shopman: "partial", competitor: "yes" },
      { feature: "GDPR-anpassat", shopman: "yes", competitor: "partial" },
      { feature: "B2B-prissättning", shopman: "yes", competitor: "partial" },
      { feature: "Gratis provperiod", shopman: "yes", competitor: "yes" },
      { feature: "Importguide från WooCommerce", shopman: "yes", competitor: "n/a" },
    ],
    migrationSteps: [
      { step: 1, title: "Installera ShopMan-plugin", description: "Ladda ner och installera vår gratis WooCommerce-plugin. Den skapar en säker exportendpoint utan att påverka din butik." },
      { step: 2, title: "Exportera med ett klick", description: "Generera en API-nyckel i WordPress och klistra in den i ShopMans Importcenter. Välj vad du vill importera och starta." },
      { step: 3, title: "Gå live utan driftstopp", description: "Kör båda plattformarna parallellt tills du är klar. Peka om DNS när du är redo och ta bort WordPress utan stress." },
    ],
    performanceClaims: [
      "Inga plugin-konflikter — allt är integrerat och testat",
      "Automatisk CDN och edge-caching ingår utan konfiguration",
      "99,9% uptime-garanti med redundant infrastruktur",
      "Automatiska säkerhetsuppdateringar och malware-skydd",
    ],
    pricing: {
      shopmanEntry: "Gratis (Free) eller 299 kr/mån (allt inkluderat)",
      shopmanMid: "1 199 kr/mån",
      competitorEntry: "0 kr (WooCommerce) + 200 kr/mån hosting + plugins",
      competitorMid: "500–2 000 kr/mån beroende på plugins och hosting",
    },
    testimonial: {
      quote: "Vi spenderade halva arbetstiden på att hålla WordPress igång. Nu med ShopMan kan vi fokusera 100% på att växa butiken. Migreringen tog en eftermiddag.",
      author: "Jonas Petersson",
      company: "Heminredning Online AB",
      previousPlatform: "WooCommerce",
    },
  },
  prestashop: {
    slug: "prestashop",
    name: "PrestaShop",
    icon: "🔵",
    heroTitle: "ShopMan — det bästa alternativet till PrestaShop",
    heroSubtitle: "Modern SaaS-plattform utan serverkostnader. Inbyggt stöd för svenska betalningar, bokföring och leverantörer.",
    quickComparison: [
      { metric: "Infrastrukturkostnad", shopman: "Ingår i priset", competitor: "Server + hosting: 300–1 500 kr/mån extra", winner: "shopman" },
      { metric: "Fortnox-integration", shopman: "Native, inbyggd", competitor: "Modul, extra kostnad", winner: "shopman" },
      { metric: "Uppdateringar", shopman: "Automatiska", competitor: "Manuella, ibland breaking changes", winner: "shopman" },
      { metric: "Multishop", shopman: "Ingår i Growth", competitor: "Ingår (men komplex setup)", winner: "tie" },
      { metric: "API", shopman: "Modern REST API", competitor: "Äldre webservice-API", winner: "shopman" },
    ],
    painPoints: [
      {
        title: "Serverkostnader och underhåll",
        problem: "PrestaShop kräver en dedikerad server eller värd som du hanterar. Säkerhetspatchar, PHP-uppdateringar och backup är ditt ansvar.",
        solution: "ShopMan är fullt hanterad. All infrastruktur, säkerhet och backup ingår i priset. Noll serverkostnader, noll underhållsarbete.",
      },
      {
        title: "Modulmarknaden är dyr och opålitlig",
        problem: "PrestaShops officiella moduler kostar 300–2 000 kr styck och är engångslicenser. En fullt utrustad butik kan kosta 10 000+ kr i moduler.",
        solution: "Allt ShopMan erbjuder — betalningar, bokföring, frakt, SEO — är inbyggt utan extra licensköp.",
      },
      {
        title: "PrestaShop v1.7/8 skillnader ger problem",
        problem: "Versionsuppgraderingar i PrestaShop kan bryta teman och moduler. Många butiker fastnar på gamla versioner av säkerhetsskäl.",
        solution: "ShopMan uppdateras kontinuerligt i bakgrunden. Du är alltid på senaste versionen utan risk för kompatibilitetsproblem.",
      },
      {
        title: "Svårt att hitta PrestaShop-kompetens",
        problem: "Antalet PrestaShop-utvecklare och -byråer minskar i Sverige. Det är svårt och dyrt att hitta hjälp för anpassningar.",
        solution: "ShopMans plattform kräver ingen programmeringskompetens för daglig drift. Och vår support är på svenska, dygnet runt.",
      },
    ],
    featureComparison: [
      { feature: "Hanterad infrastruktur", shopman: "yes", competitor: "no" },
      { feature: "Automatiska uppdateringar", shopman: "yes", competitor: "no" },
      { feature: "Fortnox native", shopman: "yes", competitor: "no" },
      { feature: "Klarna & Swish inbyggt", shopman: "yes", competitor: "partial" },
      { feature: "Multishop ingår", shopman: "yes", competitor: "yes" },
      { feature: "Leverantörssynk (FTP/EDI)", shopman: "yes", competitor: "partial" },
      { feature: "Modern REST API", shopman: "yes", competitor: "partial" },
      { feature: "B2B-prissättning", shopman: "yes", competitor: "yes" },
      { feature: "Open source", shopman: "no", competitor: "yes" },
      { feature: "Anpassad domän", shopman: "yes", competitor: "yes" },
      { feature: "GDPR-anpassat", shopman: "yes", competitor: "partial" },
      { feature: "Gratis provperiod", shopman: "yes", competitor: "yes" },
      { feature: "Importguide från PrestaShop", shopman: "yes", competitor: "n/a" },
      { feature: "Modulmarknaden", shopman: "no", competitor: "yes" },
      { feature: "Fullständig temafrihet", shopman: "partial", competitor: "yes" },
    ],
    migrationSteps: [
      { step: 1, title: "Aktivera PrestaShop webservice", description: "I PrestaShop backoffice, aktivera webbtjänster och skapa en API-nyckel med läsrättigheter. Tar under 5 minuter." },
      { step: 2, title: "Starta importen i ShopMan", description: "Ange PrestaShop-URL och API-nyckel i ShopMans Importcenter. Välj moduler att importera och starta — allt körs i bakgrunden." },
      { step: 3, title: "Granska och aktivera", description: "Kontrollera importerade produkter, kunder och ordrar. Koppla din domän och aktivera betalningslösningar. Din nya butik är klar." },
    ],
    performanceClaims: [
      "Ingen serverkonfiguration — gå live på minuter",
      "Inbyggt CDN och bildoptimering utan extra moduler",
      "Skalbar arkitektur klarar trafiktoppar utan extra kostnad",
      "Automatisk säkerhetsövervakning och DDoS-skydd",
    ],
    pricing: {
      shopmanEntry: "Gratis (Free) eller 299 kr/mån (allt inkluderat)",
      shopmanMid: "1 199 kr/mån",
      competitorEntry: "0 kr (PrestaShop) + 300–800 kr/mån hosting",
      competitorMid: "500–3 000 kr/mån med modules och hosting",
    },
    testimonial: {
      quote: "PrestaShop fungerade men varje uppdatering var ett äventyr. Med ShopMan slipper vi serverkostnaderna och Fortnox-integrationen fungerar faktiskt som den ska.",
      author: "Linda Magnusson",
      company: "Sportgrossisten Sverige AB",
      previousPlatform: "PrestaShop",
    },
  },
};

export async function generateStaticParams() {
  return Object.keys(COMPETITORS).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const competitor = COMPETITORS[slug];
  if (!competitor) return {};

  return buildMetadata({
    title: `${SITE_NAME} vs ${competitor.name} — Bästa alternativet 2026`,
    description: `Jämför ${SITE_NAME} och ${competitor.name}. Se varför svenska handlare väljer ShopMan för bättre bokföringsintegration, lägre kostnader och inbyggt stöd för Klarna, Swish och Fortnox.`,
    path: `/alternatives/${slug}`,
  });
}

function FeatureMark({ value }: { value: "yes" | "no" | "partial" | "n/a" }) {
  if (value === "yes") return <span className="text-green-500 font-bold">✓</span>;
  if (value === "no") return <span className="text-zinc-300">✗</span>;
  if (value === "n/a") return <span className="text-zinc-300 text-xs">—</span>;
  return <span className="text-amber-500 text-sm">Delvis</span>;
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const competitor = COMPETITORS[slug];
  if (!competitor) notFound();

  const breadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: `Alternativ till ${competitor.name}`, url: `${SITE_URL}/alternatives/${slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">S</div>
              <span className="text-zinc-400 text-lg font-semibold">vs</span>
              <span className="text-3xl">{competitor.icon}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 text-center mb-4 max-w-3xl mx-auto">
              {competitor.heroTitle}
            </h1>
            <p className="text-lg text-zinc-600 text-center max-w-2xl mx-auto mb-8">
              {competitor.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://admin-production-42ec.up.railway.app/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors text-center"
              >
                Starta gratis idag — migrera på 15 minuter
              </Link>
              <Link
                href={`/integrations/${slug}`}
                className="bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 px-6 py-3 rounded-xl font-semibold transition-colors text-center"
              >
                Se importguiden för {competitor.name}
              </Link>
            </div>
          </div>
        </section>

        {/* Quick comparison table */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Snabb jämförelse</h2>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm max-w-3xl mx-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-zinc-900">Mätvärde</th>
                    <th className="px-6 py-4 text-center font-semibold text-blue-600">ShopMan</th>
                    <th className="px-6 py-4 text-center font-semibold text-zinc-500">{competitor.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {competitor.quickComparison.map((row, i) => (
                    <tr key={row.metric} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                      <td className="px-6 py-3 text-zinc-700 font-medium">{row.metric}</td>
                      <td className={`px-6 py-3 text-center text-sm ${row.winner === "shopman" ? "text-green-700 font-semibold" : "text-zinc-700"}`}>
                        {row.shopman}
                        {row.winner === "shopman" && <span className="ml-1 text-xs text-green-500">✓</span>}
                      </td>
                      <td className={`px-6 py-3 text-center text-sm ${row.winner === "competitor" ? "text-zinc-900 font-semibold" : "text-zinc-500"}`}>
                        {row.competitor}
                        {row.winner === "competitor" && <span className="ml-1 text-xs text-zinc-400">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pain points */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-10 text-center">
              Varför handlare byter från {competitor.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {competitor.painPoints.map((point, i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-6">
                  <h3 className="font-bold text-zinc-900 mb-3 text-base">{point.title}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                      <p className="text-sm text-zinc-500">{point.problem}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      <p className="text-sm text-zinc-700 font-medium">{point.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full feature comparison */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Fullständig funktionsjämförelse</h2>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm max-w-3xl mx-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-zinc-900">Funktion</th>
                    <th className="px-6 py-4 text-center font-semibold text-blue-600">ShopMan</th>
                    <th className="px-6 py-4 text-center font-semibold text-zinc-500">{competitor.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {competitor.featureComparison.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                      <td className="px-6 py-3 text-zinc-700">{row.feature}</td>
                      <td className="px-6 py-3 text-center"><FeatureMark value={row.shopman} /></td>
                      <td className="px-6 py-3 text-center"><FeatureMark value={row.competitor} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Migration steps */}
        <section className="bg-blue-50 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4 text-center">
              Migrera från {competitor.name} på 15 minuter
            </h2>
            <p className="text-zinc-600 text-center mb-10 max-w-xl mx-auto">
              Vår importguide hanterar hela flytten automatiskt. Du behöver noll teknisk kompetens.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {competitor.migrationSteps.map(step => (
                <div key={step.step} className="bg-white rounded-2xl border border-blue-100 p-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                    {step.step}
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Prestanda & SEO</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {competitor.performanceClaims.map((claim, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-2xl border border-zinc-200 p-5">
                  <span className="text-green-500 font-bold text-lg mt-0.5">⚡</span>
                  <p className="text-zinc-700 text-sm">{claim}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing comparison */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Priser jämfört</h2>
            <div className="max-w-2xl mx-auto grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 text-center">
                <div className="font-bold text-blue-600 mb-3">ShopMan</div>
                <div className="text-2xl font-bold text-zinc-900 mb-1">{competitor.pricing.shopmanEntry}</div>
                <div className="text-sm text-zinc-500 mb-4">Starter — allt inkluderat</div>
                <div className="text-xl font-bold text-zinc-900 mb-1">{competitor.pricing.shopmanMid}</div>
                <div className="text-sm text-zinc-500">Growth — 5 marknader + Fortnox</div>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
                <div className="font-bold text-zinc-500 mb-3">{competitor.name}</div>
                <div className="text-2xl font-bold text-zinc-700 mb-1">{competitor.pricing.competitorEntry}</div>
                <div className="text-sm text-zinc-400 mb-4">Entry-level</div>
                <div className="text-xl font-bold text-zinc-700 mb-1">{competitor.pricing.competitorMid}</div>
                <div className="text-sm text-zinc-400">Mid-tier (beroende på setup)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-10">
              <div className="text-5xl mb-6 text-zinc-200">"</div>
              <blockquote className="text-lg text-zinc-700 leading-relaxed mb-6 italic">
                {competitor.testimonial.quote}
              </blockquote>
              <div className="flex items-center gap-3 justify-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                  {competitor.testimonial.author.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-zinc-900 text-sm">{competitor.testimonial.author}</div>
                  <div className="text-xs text-zinc-500">{competitor.testimonial.company} · Tidigare på {competitor.testimonial.previousPlatform}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-blue-600 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Redo att byta från {competitor.name}?
            </h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Starta gratis idag och migrera din butik på 15 minuter. Inget kreditkort, ingen bindningstid.
            </p>
            <Link
              href="https://admin-production-42ec.up.railway.app/login"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
            >
              Starta gratis idag — migrera på 15 minuter
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
