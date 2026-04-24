import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { breadcrumbSchema, faqSchema } from "@/lib/schema-org";

export const revalidate = 3600;

interface Integration {
  slug: string;
  name: string;
  icon: string;
  category: string;
  tagline: string;
  description: string;
  whatItDoes: string[];
  howItWorks: { step: number; title: string; description: string }[];
  limitations: string[];
  faq: { question: string; answer: string }[];
  related: string[];
}

const INTEGRATIONS: Record<string, Integration> = {
  shopify: {
    slug: "shopify",
    name: "Shopify",
    icon: "🛍️",
    category: "Import & Migration",
    tagline: "Migrera din Shopify-butik på under 15 minuter",
    description: "Flytta hela din Shopify-butik till ShopMan utan teknisk kompetens. Vår importguide hanterar produkter, kunder, ordrar och bilder automatiskt.",
    whatItDoes: [
      "Importerar alla produkter inklusive varianter, bilder och metafält",
      "Migrerar kundregister med adresser och köphistorik",
      "Kopierar orderhistorik med status, noteringar och spårningsnummer",
      "Bevarar produktkategorier, taggar och SEO-metadata",
    ],
    howItWorks: [
      { step: 1, title: "Anslut din Shopify-butik", description: "Logga in på ShopMan, gå till Importcenter och ange din Shopify-butiks URL. Du behöver en privat API-nyckel från Shopify Admin." },
      { step: 2, title: "Välj vad du vill importera", description: "Välj vilka datamängder du vill ta med: produkter, kunder, ordrar, bilder. Du kan köra en testimport med 10 poster innan du importerar allt." },
      { step: 3, title: "Starta och följ importen", description: "Importen körs i bakgrunden och du får ett e-postmeddelande när den är klar. Eventuella konflikter hanteras automatiskt med smarta standardvärden." },
    ],
    limitations: [
      "Shopify Plus-specifika funktioner som skriptbaserade rabatter stöds inte",
      "Betalningsgatewayhistorik importeras som referens, ej aktiva token",
      "Apps och tredjepartstillägg från Shopify importeras ej",
    ],
    faq: [
      { question: "Kan jag importera utan att stänga min Shopify-butik?", answer: "Ja, importen läser data utan att påverka din Shopify-butik. Du kan driva båda parallellt och stänga Shopify när du är redo." },
      { question: "Hur lång tid tar en typisk import?", answer: "En butik med 1 000 produkter och 5 000 kunder tar vanligtvis 5–15 minuter. Stora kataloger med 50 000+ produkter kan ta upp till en timme." },
      { question: "Vad händer om importen avbryts?", answer: "ShopMan sparar framsteg kontinuerligt. Du kan återuppta en avbruten import exakt där den stannade utan att börja om." },
    ],
    related: ["woocommerce", "prestashop", "csv-excel"],
  },
  woocommerce: {
    slug: "woocommerce",
    name: "WooCommerce",
    icon: "🟣",
    category: "Import & Migration",
    tagline: "Migrera din WooCommerce-butik sömlöst",
    description: "Importera din WordPress/WooCommerce-butik till ShopMan med alla produktvarianter, kategorier och orderhistorik intakta.",
    whatItDoes: [
      "Importerar alla produkttyper — enkla, variabla, grupperade och externa",
      "Migrerar produktkategorier, taggar och anpassade attribut",
      "Kopierar kundkonton med inköpshistorik och adressböcker",
      "Bevarar ordernoteringar, fakturaadresser och leveransstatus",
    ],
    howItWorks: [
      { step: 1, title: "Installera ShopMan-plugin i WordPress", description: "Ladda ner och installera vår gratis WooCommerce-plugin från ShopMan Admin. Plugin skapar en säker REST-endpoint för exporten." },
      { step: 2, title: "Generera exportnyckel", description: "I WordPress admin, aktivera plugin och kopiera den genererade API-nyckeln. Klistra in nyckeln i ShopMans Importcenter." },
      { step: 3, title: "Kör mappning och import", description: "Granska den automatiska fältmappningen, justera vid behov och starta importen. Du ser realtidsframsteg direkt i ShopMan." },
    ],
    limitations: [
      "Kundlösenord kan ej migreras av säkerhetsskäl — kunder behöver sätta nytt lösenord",
      "Anpassade WooCommerce-utökningar och widgets importeras ej",
      "Betalgatewaytoken (Stripe, Klarna) kan ej överföras av PCI-skäl",
    ],
    faq: [
      { question: "Fungerar importen med alla WooCommerce-versioner?", answer: "Vi stöder WooCommerce 5.0 och senare. Äldre versioner kan fungera men rekommenderas ej. Kontakta support om du kör en äldre version." },
      { question: "Kan jag importera anpassade produktfält (ACF/meta)?", answer: "Ja, anpassade meta-fält importeras som ShopMan-metafält och kan kopplas till produktspecifikationer i ditt tema." },
      { question: "Vad händer med befintliga WordPress-sidor och innehåll?", answer: "ShopMan importerar endast e-handelsdata. Ditt WordPress-innehåll (sidor, inlägg, media) berörs ej och stannar kvar i WordPress." },
    ],
    related: ["shopify", "prestashop", "fortnox"],
  },
  prestashop: {
    slug: "prestashop",
    name: "PrestaShop",
    icon: "🔵",
    category: "Import & Migration",
    tagline: "Migrera från PrestaShop 1.7 och 8.x",
    description: "Flytta din PrestaShop-butik till ShopMan utan teknisk kompetens. Stöd för PrestaShop 1.7 och 8.x med full produktkatalog, kunder och ordrar.",
    whatItDoes: [
      "Importerar hela produktkatalogen inklusive kombinationer och attribut",
      "Migrerar kundgrupper och B2B-prissättning",
      "Kopierar orderhistorik med fakturaunderlag",
      "Bevarar kategorihierarki och URL-alias för SEO",
    ],
    howItWorks: [
      { step: 1, title: "Generera PrestaShop API-nyckel", description: "I PrestaShop backoffice, aktivera webbtjänster och skapa en ny nyckel med läsrättigheter för products, customers, orders och categories." },
      { step: 2, title: "Anslut i ShopMan Importcenter", description: "Ange din PrestaShop-butiks URL och API-nyckel i ShopMans Importcenter. Systemet verifierar anslutningen automatiskt." },
      { step: 3, title: "Kör stegvis import", description: "Välj vilka moduler du vill importera i prioritetsordning. Importen körs sekventiellt och du kan pausa och återuppta när som helst." },
    ],
    limitations: [
      "PrestaShop-moduler och teman migreras ej till ShopMan",
      "Anpassad PHP-kod i hooks och overrides kan ej konverteras",
      "PrestaShop-specifika attributtyper kan kräva manuell mappning",
    ],
    faq: [
      { question: "Fungerar importen med PrestaShop Cloud?", answer: "Ja, PrestaShop Cloud använder samma API som lokala installationer. Aktivera webbtjänster i inställningar och följ samma steg." },
      { question: "Kan jag importera flera PrestaShop-butiker?", answer: "Ja, om du kör MultiShop i PrestaShop kan du importera varje butik separat som en ShopMan-multishop-marknad." },
      { question: "Hur hanteras flerspråkiga produktkataloger?", answer: "ShopMan importerar alla språkversioner och mappar dem till ShopMans marknads- och lokaliseringssystem." },
    ],
    related: ["shopify", "woocommerce", "csv-excel"],
  },
  fortnox: {
    slug: "fortnox",
    name: "Fortnox",
    icon: "📒",
    category: "Bokföring & ERP",
    tagline: "Automatisk bokföring av varje order i realtid",
    description: "Synkronisera ordrar, fakturor och kunder direkt med Fortnox. Varje transaktion bokförs automatiskt med korrekta konton och momskoder.",
    whatItDoes: [
      "Skapar fakturor i Fortnox automatiskt vid orderbekräftelse",
      "Synkroniserar kundregister tvåvägs med deduplicering",
      "Bokför betalningar med rätt konto och kostnadsbärare",
      "Hanterar kreditnotor och returer automatiskt",
    ],
    howItWorks: [
      { step: 1, title: "Anslut Fortnox-konto via OAuth", description: "Gå till ShopMan Integrationer, välj Fortnox och klicka 'Anslut'. Du omdirigeras till Fortnox för säker OAuth-auktorisering utan att dela lösenord." },
      { step: 2, title: "Konfigurera kontomappning", description: "Ange vilka Fortnox-konton som ska användas för försäljning, moms och rabatter. ShopMan föreslår standardkonton baserat på BAS-kontoplanen." },
      { step: 3, title: "Aktivera automatisk synk", description: "Välj om ordrar ska skapa faktura direkt eller som kundorder. Sätt synkroniseringsintervall — vi rekommenderar realtid för bästa bokföringskvalitet." },
    ],
    limitations: [
      "Kräver Fortnox Fakturering- eller Bokföring-paket — Fortnox Start räcker ej",
      "Historiska ordrar måste synkroniseras manuellt via bulk-export",
      "Lagerredovisning kräver tillägget Fortnox Lager",
    ],
    faq: [
      { question: "Kan integrationen hantera EU-moms och OSS?", answer: "Ja, ShopMan skickar korrekt momskod och landsinformation till Fortnox. OSS-rapportering stöds via Fortnox EU-moms-modul." },
      { question: "Vad händer om en order ändras efter bokning?", answer: "ShopMan skickar automatiskt en korrigering till Fortnox. Delsummor, rabatter och fraktkostnader uppdateras i realtid." },
      { question: "Stöds Fortnox Lön-integration?", answer: "Inte direkt, men ShopMan kan exportera provisionsunderlag och försäljningsstatistik som CSV för import till Fortnox Lön." },
    ],
    related: ["visma", "bjorn-lunden", "klarna"],
  },
  "ftp-sync": {
    slug: "ftp-sync",
    name: "FTP-sync",
    icon: "📁",
    category: "Leverantörssynk",
    tagline: "Automatisk produktsynk mot leverantörers FTP-servrar",
    description: "Håll produktkatalogen uppdaterad automatiskt via leverantörers FTP-servrar. Stöd för XML, CSV och PRICAT-format med schemalagd synkronisering.",
    whatItDoes: [
      "Hämtar produktfiler från FTP/SFTP automatiskt enligt schema",
      "Tolkar XML, CSV, Excel och PRICAT-format från leverantörer",
      "Uppdaterar priser, lagersaldo och produktinfo utan manuellt arbete",
      "Flaggar konflikter och nyheter för manuell granskning vid behov",
    ],
    howItWorks: [
      { step: 1, title: "Lägg till FTP-anslutning", description: "Ange FTP-host, port, användarnamn och lösenord i ShopMan Leverantörssynk. Vi stöder FTP, FTPS och SFTP för maximal säkerhet." },
      { step: 2, title: "Konfigurera filformat och mappning", description: "Välj filformat och mappa leverantörens kolumner till ShopMans produktfält. Spara profilen och återanvänd den för framtida filer." },
      { step: 3, title: "Schemalägg automatisk synk", description: "Välj hur ofta ShopMan ska kolla FTP-servern — varje timme, dagligen eller vid specifika tider. Alla ändringar loggas för revision." },
    ],
    limitations: [
      "Kräver att leverantören har en FTP-server — e-postleveranser stöds ej",
      "Maximal filstorlek per synkronisering är 500 MB",
      "Bildimport via FTP kräver att bilderna är publikt tillgängliga via URL",
    ],
    faq: [
      { question: "Kan jag ha flera FTP-kopplingar mot olika leverantörer?", answer: "Ja, du kan lägga till obegränsat antal FTP-anslutningar. Varje leverantör får sin egen profil med unika inställningar för format och schemaläggning." },
      { question: "Hur hanteras produkter som tas bort av leverantören?", answer: "Du väljer beteende: automatisk avpublicering, flagga för granskning, eller ignorera. Vi rekommenderar 'flagga' för att undvika oavsiktliga borttagningar." },
      { question: "Stöds delta-filer (only changes)?", answer: "Ja, om leverantören skickar delta-filer kan ShopMan identifiera och tillämpa enbart ändringarna för snabbare synkronisering." },
    ],
    related: ["api-sync", "edi-peppol", "csv-excel"],
  },
  klarna: {
    slug: "klarna",
    name: "Klarna",
    icon: "🟢",
    category: "Betalningar",
    tagline: "Sveriges populäraste betallösning med ett klick",
    description: "Erbjud Klarna Checkout med delbetalning, faktura och direktbetalning. Aktivera Klarnas hela produktsvit direkt i ShopMan utan teknisk integration.",
    whatItDoes: [
      "Erbjuder Klarna Checkout med faktura, delbetalning och kortbetalning",
      "Hanterar Klarna Pay Later och Pay Over Time automatiskt",
      "Synkroniserar orderuppdateringar och returer med Klarna i realtid",
      "Stöder Klarna On-site Messaging för konverteringsoptimering",
    ],
    howItWorks: [
      { step: 1, title: "Ansök om Klarna Merchant-konto", description: "Om du inte redan har ett Klarna-konto hjälper vi dig ansöka direkt i ShopMan. Godkännande tar vanligtvis 1–3 bankdagar." },
      { step: 2, title: "Ange API-nycklar", description: "Kopiera dina Klarna API-nycklar (merchant ID + lösenord) från Klarna Merchant Portal och klistra in dem i ShopMan Betalningar." },
      { step: 3, title: "Aktivera i kassan", description: "Välj vilka Klarna-betalningsmetoder du vill visa i kassan. ShopMan aktiverar automatisk orderhantering, captures och återbetalningar." },
    ],
    limitations: [
      "Klarna kräver att din butik har ett organisationsnummer — privatpersoner kan ej ansöka",
      "Klarna Pay Later är ej tillgängligt för ordrar under 150 kr",
      "Klarnas kreditbedömning är extern — ShopMan kan ej påverka godkännandebeslutet",
    ],
    faq: [
      { question: "Kostar det extra att erbjuda Klarna i ShopMan?", answer: "ShopMan tar ingen extra avgift för Klarna-integrationen. Du betalar Klarnas egna transaktionsavgifter direkt till Klarna baserat på ditt avtal med dem." },
      { question: "Kan jag erbjuda Klarna på flera marknader?", answer: "Ja, Klarna är tillgängligt i 20+ länder. Konfigurera marknadsinställningar per ShopMan-marknad och ShopMan väljer rätt Klarna-konfiguration automatiskt." },
      { question: "Hur hanteras delreturer med Klarna?", answer: "ShopMan skickar automatisk delretur till Klarna när en artikel returneras. Kunden krediteras av Klarna och du betalar tillbaka mellanskillnaden." },
    ],
    related: ["stripe", "swish", "nets-easy"],
  },
};

// All slugs from the full integrations list (including those without full detail pages)
const ALL_SLUGS = [
  "shopify", "woocommerce", "prestashop", "magento", "csv-excel",
  "fortnox", "visma", "bjorn-lunden",
  "ftp-sync", "api-sync", "edi-peppol",
  "klarna", "stripe", "swish", "nets-easy",
  "postnord", "dhl", "bring",
  "google-analytics", "meta-pixel",
];

const ALL_INTEGRATIONS_BASIC: Record<string, { name: string; icon: string; category: string; slug: string }> = {
  shopify: { slug: "shopify", name: "Shopify", icon: "🛍️", category: "Import & Migration" },
  woocommerce: { slug: "woocommerce", name: "WooCommerce", icon: "🟣", category: "Import & Migration" },
  prestashop: { slug: "prestashop", name: "PrestaShop", icon: "🔵", category: "Import & Migration" },
  magento: { slug: "magento", name: "Magento", icon: "🔶", category: "Import & Migration" },
  "csv-excel": { slug: "csv-excel", name: "CSV / Excel", icon: "📊", category: "Import & Migration" },
  fortnox: { slug: "fortnox", name: "Fortnox", icon: "📒", category: "Bokföring & ERP" },
  visma: { slug: "visma", name: "Visma", icon: "📊", category: "Bokföring & ERP" },
  "bjorn-lunden": { slug: "bjorn-lunden", name: "Björn Lundén", icon: "📋", category: "Bokföring & ERP" },
  "ftp-sync": { slug: "ftp-sync", name: "FTP-sync", icon: "📁", category: "Leverantörssynk" },
  "api-sync": { slug: "api-sync", name: "API-sync", icon: "🔌", category: "Leverantörssynk" },
  "edi-peppol": { slug: "edi-peppol", name: "EDI / PEPPOL", icon: "📄", category: "Leverantörssynk" },
  klarna: { slug: "klarna", name: "Klarna", icon: "🟢", category: "Betalningar" },
  stripe: { slug: "stripe", name: "Stripe", icon: "💳", category: "Betalningar" },
  swish: { slug: "swish", name: "Swish", icon: "🔵", category: "Betalningar" },
  "nets-easy": { slug: "nets-easy", name: "Nets Easy", icon: "💰", category: "Betalningar" },
  postnord: { slug: "postnord", name: "PostNord", icon: "📦", category: "Frakt & Logistik" },
  dhl: { slug: "dhl", name: "DHL Express", icon: "🟡", category: "Frakt & Logistik" },
  bring: { slug: "bring", name: "Bring", icon: "🟠", category: "Frakt & Logistik" },
  "google-analytics": { slug: "google-analytics", name: "Google Analytics 4", icon: "📈", category: "Analytics" },
  "meta-pixel": { slug: "meta-pixel", name: "Meta Pixel", icon: "📘", category: "Analytics" },
};

export async function generateStaticParams() {
  return ALL_SLUGS.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const full = INTEGRATIONS[slug];
  const basic = ALL_INTEGRATIONS_BASIC[slug];
  if (!full && !basic) return {};

  const name = full?.name ?? basic?.name ?? slug;
  const description = full?.description
    ?? `Koppla ${name} till ShopMan för smidig e-handel. Enkel integration utan teknisk kompetens.`;

  return buildMetadata({
    title: `${name} integration — Koppla ${name} till ShopMan`,
    description,
    path: `/integrations/${slug}`,
  });
}

export default async function IntegrationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const integration = INTEGRATIONS[slug];

  if (!integration) {
    const basic = ALL_INTEGRATIONS_BASIC[slug];
    if (!basic) notFound();

    // Simple fallback page for integrations without full data
    return (
      <>
        <Nav />
        <main>
          <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
            <div className="max-w-6xl mx-auto px-4">
              <div className="mb-4">
                <Link href="/integrations" className="text-sm text-blue-600 hover:text-blue-700">← Alla integrationer</Link>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{basic.icon}</span>
                <div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">{basic.category}</span>
                  <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 mt-2">{basic.name}</h1>
                </div>
              </div>
              <p className="text-lg text-zinc-600 max-w-2xl">
                Koppla {basic.name} till ShopMan för smidig e-handel. Kontakta oss för mer information om denna integration.
              </p>
              <div className="mt-8">
                <Link href="/contact" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
                  Kontakta oss
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const breadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: "Integrationer", url: `${SITE_URL}/integrations` },
    { label: integration.name, url: `${SITE_URL}/integrations/${slug}` },
  ]);
  const faq = faqSchema(integration.faq);

  const relatedIntegrations = integration.related
    .map(r => ALL_INTEGRATIONS_BASIC[r])
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-4">
              <Link href="/integrations" className="text-sm text-blue-600 hover:text-blue-700">← Alla integrationer</Link>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl">{integration.icon}</span>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">{integration.category}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-3">{integration.name}</h1>
                <p className="text-lg text-zinc-600 mb-6 max-w-2xl">{integration.tagline}</p>
                <p className="text-base text-zinc-500 max-w-2xl mb-8">{integration.description}</p>
                <Link
                  href="https://admin-production-42ec.up.railway.app/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-block"
                >
                  Kom igång gratis
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What it does */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8">Vad gör integrationen?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integration.whatItDoes.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-2xl border border-zinc-200 p-5">
                  <span className="text-green-500 font-bold text-lg mt-0.5">✓</span>
                  <p className="text-zinc-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-10">Hur fungerar det?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {integration.howItWorks.map(step => (
                <div key={step.step} className="bg-white rounded-2xl border border-zinc-200 p-6">
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

        {/* Limitations */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-6">Begränsningar & krav</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <ul className="space-y-3">
                {integration.limitations.map((limit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-amber-500 font-bold mt-0.5">⚠</span>
                    <p className="text-zinc-700 text-sm">{limit}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8">Vanliga frågor</h2>
            <div className="space-y-4">
              {integration.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-6">
                  <h3 className="font-semibold text-zinc-900 mb-2">{item.question}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related integrations */}
        {relatedIntegrations.length > 0 && (
          <section className="py-16 md:py-20">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8">Relaterade integrationer</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedIntegrations.map(rel => rel && (
                  <Link
                    key={rel.slug}
                    href={`/integrations/${rel.slug}`}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 hover:shadow-md hover:border-zinc-300 transition-all flex items-center gap-4"
                  >
                    <span className="text-3xl">{rel.icon}</span>
                    <div>
                      <div className="font-semibold text-zinc-900">{rel.name}</div>
                      <div className="text-xs text-zinc-500">{rel.category}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-blue-600 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Redo att komma igång?
            </h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              Starta din 14 dagars kostnadsfria provperiod och koppla {integration.name} till ShopMan på minuter.
            </p>
            <Link
              href="https://admin-production-42ec.up.railway.app/login"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
            >
              Starta gratis provperiod
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
