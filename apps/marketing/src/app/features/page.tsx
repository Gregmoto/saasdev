import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { FeaturesTabs } from "@/components/features-tabs";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Funktioner — Byggt för modern handel",
  description:
    "Alla funktioner i ShopMan — lagersaldo i realtid, importcenter, multishop, marketplace, B2B och mer. 12+ integrerade betalningslösningar.",
  path: "/features",
});

const FEATURES = [
  {
    id: "webshop",
    icon: "🏪",
    title: "Hantera flera butiker",
    desc: "Hantera flera butiker och varumärken från en och samma dashboard. Växla mellan butiker med ett klick, med full isolering av ordrar, produkter och kunder per butik.",
    details: [
      "Obegränsat antal butiksprofiler",
      "Valuta- och skatteinställningar per butik",
      "Centraliserad admin med rollbaserad åtkomst",
      "Analys och rapportering per butik",
    ],
  },
  {
    id: "lagersaldo-i-realtid",
    icon: "📦",
    title: "Lagersaldo i realtid",
    desc: "Live-lagernivåer i alla lager med automatisk reservation vid kassan. Sälj aldrig mer än du har — lageruppdateringar sprids direkt i alla dina kanaler.",
    details: [
      "Stöd för flera lager",
      "Automatiska lagerreservationer",
      "Larm vid lågt lager och beställningspunkter",
      "Spårning av buntar och varianter",
    ],
  },
  {
    id: "importcenter",
    icon: "📥",
    title: "Importcenter",
    desc: "Migrera från Shopify, WooCommerce, PrestaShop eller valfri CSV-källa på några minuter. AI-driven konflikthantering tar hand om dubbla SKU:er och felanpassad data automatiskt.",
    details: [
      "Shopify-, WooCommerce- och PrestaShop-kopplingar",
      "CSV- och kalkylbladsimport",
      "AI-driven konflikthantering",
      "Återupptagbara importjobb med förloppsvisning",
    ],
  },
  {
    id: "betalningsintegrationer",
    icon: "💳",
    title: "Betalningsintegrationer",
    desc: "Ta betalt via Stripe, Swish, Klarna och fler. Fullt webhook-stöd säkerställer att ditt orderflöde alltid är i synk — även när betalleverantörer är långsamma.",
    details: [
      "Stripe, Swish, Klarna direkt ur lådan",
      "Fullständig hantering av webhook-livscykel",
      "Delvisa uttag och återbetalningar",
      "Stöd för flera valutor",
    ],
  },
  {
    id: "kundinsikter",
    icon: "👤",
    title: "Kundinsikter",
    desc: "Enhetliga kundprofiler som samlar köphistorik, kontaktuppgifter och beteende i alla dina butiker och kanaler. Lär känna dina kunder bättre än någonsin.",
    details: [
      "Kundprofiler över flera butiker",
      "Köphistorik och LTV-spårning",
      "Segmentering och taggning",
      "GDPR-kompatibel dataexport",
    ],
  },
  {
    id: "utvecklar-api",
    icon: "🔗",
    title: "Utvecklar-API",
    desc: "Ett fullständigt dokumenterat REST-API låter ditt team bygga egna integrationer, automatisera arbetsflöden och koppla ShopMan till vilket verktyg som helst i din stack.",
    details: [
      "REST-API med OpenAPI-spec",
      "Webhook-prenumerationer för alla händelser",
      "API-nyckelhantering per butik",
      "Dashboard och loggar för rate-limit",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Nav />
      <main>

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-blue-50 opacity-70 blur-3xl" />
          </div>
          <div className="max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
            <div className="inline-flex items-center gap-2 border border-blue-100 bg-blue-50 text-blue-700 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              12+ integrerade betalningslösningar
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-zinc-950 tracking-tight mb-6 leading-tight">
              Byggt för modern handel
            </h1>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed mb-10">
              Varje funktion i ShopMan är designad för att fungera tillsammans — och ger dig ett komplett handelssystem, inte ett lapptäcke av verktyg.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-blue-200"
              >
                Kom igång på 5 minuter
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 font-medium px-7 py-3.5 rounded-xl border border-zinc-200 transition-all text-sm"
              >
                Se demo
              </Link>
            </div>
          </div>
        </section>

        {/* ── Mode selector + feature cards ─────────────────── */}
        <section id="features-grid" className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Välj ditt läge</div>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight">
              Funktioner efter ditt behov
            </h2>
          </div>
          <FeaturesTabs features={FEATURES} />
        </section>

        {/* ── All features detail cards ─────────────────────── */}
        <section className="bg-zinc-50 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Djupdykning</div>
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-950 tracking-tight">
                Alla funktioner i detalj
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {FEATURES.map((f) => (
                <div
                  key={f.id}
                  id={f.id}
                  className="bg-white p-8 rounded-2xl border border-zinc-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all duration-200 shadow-sm"
                >
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">{f.title}</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-5">{f.desc}</p>
                  <ul className="space-y-2 mb-5">
                    {f.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm text-zinc-700">
                        <span className="text-blue-500 flex-shrink-0">✓</span>{d}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/features/${f.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Läs mer om {f.title} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Lagersaldo highlight (text left, mock right) ──── */}
        <section id="multishop" className="max-w-7xl mx-auto px-6 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">Lagerstyrning</div>
              <h2 className="text-3xl font-bold text-zinc-950 mb-5">
                Realtidslager som alltid stämmer
              </h2>
              <p className="text-zinc-500 leading-relaxed mb-6">
                Sälj aldrig mer än du har. ShopMan reserverar lager i samma sekund en kund lägger en order — och frigör det automatiskt om ordern avbryts.
              </p>
              <ul className="space-y-3">
                {[
                  "Stöd för flera lager och lagerlokationer",
                  "Automatisk reservering i kassan",
                  "Larm vid lågt saldo direkt i dashboarden",
                  "Buntar och varianter spåras separat",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-700">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">✓</span>{b}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/features/lagersaldo-i-realtid" className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  Djupdykning: Lagersaldo →
                </Link>
              </div>
            </div>
            {/* Mock inventory UI */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold text-zinc-700">Lager — Alla platser</span>
              </div>
              <div className="p-5">
                <div className="flex text-xs text-zinc-400 font-medium px-3 mb-2 gap-4">
                  <span className="flex-1">Produkt</span>
                  <span className="w-20 text-right">I lager</span>
                  <span className="w-20 text-right">Reserverat</span>
                  <span className="w-16 text-right">Status</span>
                </div>
                {[
                  { name: "Blå sneakers S", stock: 42, reserved: 3, status: "OK" },
                  { name: "Röd jacka M", stock: 7, reserved: 2, status: "Lågt" },
                  { name: "Grön keps", stock: 0, reserved: 0, status: "Slut" },
                  { name: "Vit t-shirt L", stock: 156, reserved: 12, status: "OK" },
                  { name: "Svart byxa 32", stock: 24, reserved: 4, status: "OK" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm border-b border-zinc-50 last:border-0">
                    <span className="flex-1 text-zinc-800 font-medium">{row.name}</span>
                    <span className="w-20 text-right text-zinc-600">{row.stock}</span>
                    <span className="w-20 text-right text-zinc-400">{row.reserved}</span>
                    <span className={`w-16 text-right text-xs font-semibold ${
                      row.status === "OK" ? "text-green-600" :
                      row.status === "Lågt" ? "text-amber-600" :
                      "text-red-500"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Importcenter highlight ─────────────────────────── */}
        <section id="marketplace" className="bg-zinc-950 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Step list */}
              <div className="order-2 lg:order-1">
                <div className="space-y-4">
                  {[
                    { n: "1", title: "Välj källa", desc: "Shopify, WooCommerce, PrestaShop eller CSV-fil." },
                    { n: "2", title: "Förhandsgranskning", desc: "Se vilka produkter, kunder och ordrar som importeras." },
                    { n: "3", title: "AI-validering", desc: "Konflikter och SKU-dubbletter löses automatiskt." },
                    { n: "4", title: "Import körs", desc: "Återupptagbar import med realtidsstatus och logg." },
                  ].map((step) => (
                    <div key={step.n} className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-zinc-400">{step.n}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                        <div className="text-sm text-zinc-400">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Text */}
              <div className="order-1 lg:order-2">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4">Importcenter</div>
                <h2 className="text-3xl font-bold text-white mb-5">
                  Byt plattform utan att förlora data
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  AI-motorn hanterar datainkonsistenser automatiskt. Du slipper städa i kalkylblad — ShopMan tar hand om det åt dig.
                </p>
                <Link href="/features/importcenter" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                  Läs om importcentret →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── B2B section ───────────────────────────────────── */}
        <section id="b2b" className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">B2B</div>
            <h2 className="text-3xl font-bold text-zinc-950 tracking-tight">
              B2B och grossist — inga kompromisser
            </h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto">
              ShopMan hanterar hela B2B-flödet: från kundspecifika prislistor till kreditgränser och fakturaflöden.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Kundspecifika priser", desc: "Unika prislistor per kund eller kundgrupp." },
              { title: "Kreditgränser", desc: "Sätt kredittak och villkor per B2B-kund." },
              { title: "Fakturaflöden", desc: "Netto 30/60 och andra betalningsvillkor." },
              { title: "Separata portaler", desc: "Dedikerade B2B-inloggningar med eget sortiment." },
            ].map((item) => (
              <div key={item.title} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6">
                <h3 className="font-semibold text-zinc-900 mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA banner ────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 pb-28">
          <div className="bg-blue-600 rounded-3xl px-8 py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Kom igång på 5 minuter
              </h2>
              <p className="text-blue-100 mb-8 max-w-md mx-auto">
                Inga kreditkortsuppgifter krävs. Importera din befintliga butik och börja sälja direkt.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 font-semibold px-8 py-3 rounded-xl transition-colors text-sm shadow-lg"
                >
                  Starta gratis provperiod
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center text-white/80 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm border border-white/20 hover:border-white/40"
                >
                  Se demos →
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
