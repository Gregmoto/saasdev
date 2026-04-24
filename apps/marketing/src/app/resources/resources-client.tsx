"use client";
import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

type Guide = {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  icon: string;
  tags: string[];
};

const GUIDES: Guide[] = [
  {
    slug: "onboarding",
    title: "Kom igång med ShopMan",
    description: "Steg-för-steg-checklista för att sätta upp din butik: skapa konto, lägg till produkter, konfigurera betalning och publicera.",
    readTime: "10 min",
    category: "Kom igång",
    icon: "🚀",
    tags: ["onboarding", "setup", "konto"],
  },
  {
    slug: "import-guide",
    title: "Importera från Shopify, WooCommerce eller PrestaShop",
    description: "Migrera din befintliga butik till ShopMan på under 5 minuter med Importcenter. Produkter, kunder och ordrar.",
    readTime: "5 min",
    category: "Import",
    icon: "📦",
    tags: ["import", "shopify", "woocommerce", "migration"],
  },
  {
    slug: "supplier-sync",
    title: "Automatisk leverantörssynk",
    description: "Koppla upp din leverantör via API, FTP eller SFTP. Konfigurera schemalagd synkronisering av produkter och lager.",
    readTime: "8 min",
    category: "Lager",
    icon: "🔄",
    tags: ["leverantör", "sync", "lager", "api"],
  },
  {
    slug: "seo-guide",
    title: "SEO-guide för din butik",
    description: "Optimera metatitlar, beskrivningar, canonical-URLs och produktscheman för sökmotorer. Inbyggt i ShopMan.",
    readTime: "7 min",
    category: "SEO",
    icon: "🔍",
    tags: ["seo", "sökmotorer", "metadata", "schema"],
  },
  {
    slug: "fortnox",
    title: "Fortnox-integration",
    description: "Synkronisera ordrar, fakturor och artiklar direkt med Fortnox. Automatisk bokföring utan manuellt arbete.",
    readTime: "6 min",
    category: "Integrationer",
    icon: "🧾",
    tags: ["fortnox", "bokföring", "integration", "faktura"],
  },
  {
    slug: "inventory-tips",
    title: "Lagerhantering i realtid",
    description: "Reservationer, lagerroutning och automatiska beställningspunkter. Aldrig mer slut på lager utan förvarning.",
    readTime: "7 min",
    category: "Lager",
    icon: "🏪",
    tags: ["lager", "reservationer", "realtid"],
  },
  {
    slug: "multi-store",
    title: "Hantera flera butiker",
    description: "Skapa och hantera flera butiker under ett och samma konto. Delat lager, separata kassor, gemensam administration.",
    readTime: "5 min",
    category: "Plattform",
    icon: "🏬",
    tags: ["butiker", "multi-store", "delat lager"],
  },
  {
    slug: "payments",
    title: "Betalningar och kassor",
    description: "Sätt upp Klarna, Stripe eller Swish som betalningsmetod. Konfigurera kvittomall och orderbekräftelse.",
    readTime: "6 min",
    category: "Betalningar",
    icon: "💳",
    tags: ["betalning", "klarna", "stripe", "kassa"],
  },
];

const CATEGORIES = ["Alla", "Kom igång", "Import", "Lager", "SEO", "Integrationer", "Plattform", "Betalningar"];

export default function ResourcesClient() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alla");
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  const filtered = GUIDES.filter((g) => {
    const matchCat = category === "Alla" || g.category === category;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Resurser & Guider</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Allt du behöver för att komma igång och växa med ShopMan. Praktiska guider, tips och steg-för-steg-instruktioner.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-8">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök bland guider…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Guide grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Inga guider hittades.</p>
            <button onClick={() => { setSearch(""); setCategory("Alla"); }} className="mt-3 text-sm text-blue-600 hover:underline">
              Rensa filter
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((guide) => (
              <div key={guide.slug}>
                <button
                  onClick={() => setOpenGuide(openGuide === guide.slug ? null : guide.slug)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{guide.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {guide.category}
                        </span>
                        <span className="text-xs text-gray-400">{guide.readTime}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{guide.description}</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openGuide === guide.slug ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded guide content */}
                {openGuide === guide.slug && (
                  <div className="mt-1 bg-gray-50 border border-gray-200 border-t-0 rounded-b-2xl px-6 py-6 -mt-2 pt-6">
                    <GuideContent slug={guide.slug} title={guide.title} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Hittar du inte svaret du söker?</h2>
          <p className="text-blue-100 mb-6">Kontakta supporten — vi svarar inom en arbetsdag.</p>
          <Link
            href="/contact"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Kontakta oss
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function GuideContent({ slug, title }: { slug: string; title: string }) {
  const content: Record<string, React.ReactNode> = {
    onboarding: (
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">Följ den här checklistan för att ha din butik redo inom en timme.</p>
        <ol className="space-y-3">
          {[
            { step: "1. Skapa ditt konto", desc: "Registrera dig på shopman.dev. Du får direkt tillgång till din butikspanel." },
            { step: "2. Fyll i butiksinformation", desc: "Ge din butik ett namn, välj valuta (SEK standard) och ladda upp din logotyp." },
            { step: "3. Lägg till produkter", desc: "Gå till Produkter → Ny produkt. Fyll i titel, pris, lagerantal och bilder." },
            { step: "4. Konfigurera betalning", desc: "Gå till Integrationer → Betalningar. Aktivera Klarna, Stripe eller Swish." },
            { step: "5. Ställ in frakt", desc: "Gå till Frakt och skapa minst en fraktmetod (t.ex. PostNord eller DbSchenker)." },
            { step: "6. Publicera din butik", desc: "Aktivera din butik under Inställningar → Synlighet. Din butik är nu live!" },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 text-sm">{item.step}</span>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800">💡 <strong>Tips:</strong> Använd Importcenter om du redan har en Shopify- eller WooCommerce-butik — du slipper lägga till allt manuellt.</p>
        </div>
      </div>
    ),

    "import-guide": (
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">Importera din befintliga butik med några få klick.</p>
        <ol className="space-y-3">
          {[
            { step: "1. Öppna Importcenter", desc: "Gå till Imports i sidomenyn i din adminpanel." },
            { step: "2. Välj källa", desc: "Välj Shopify, WooCommerce eller PrestaShop. För Shopify behöver du en API-nyckel." },
            { step: "3. Koppla upp dig", desc: "Ange din butiks URL och API-nyckel. ShopMan ansluter och läser av din data." },
            { step: "4. Välj vad som ska importeras", desc: "Välj Produkter, Kunder, Ordrar eller allt. Du kan granska innan import." },
            { step: "5. Starta importen", desc: "Klicka Starta import. Processen körs i bakgrunden — du får ett mejl när det är klart." },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 text-sm">{item.step}</span>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 font-mono mb-1">// Shopify API-behörigheter som krävs:</p>
          <pre className="text-green-400 text-xs font-mono">read_products, read_customers, read_orders</pre>
        </div>
      </div>
    ),

    "supplier-sync": (
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">Koppla upp din leverantör för automatisk produkt- och lageruppdatering.</p>
        <ol className="space-y-3">
          {[
            { step: "1. Öppna Leverantörer", desc: "Gå till Inventory → Leverantörer i adminpanelen." },
            { step: "2. Lägg till leverantör", desc: "Klicka 'Ny leverantör' och välj anslutningstyp: API, FTP eller SFTP." },
            { step: "3. Konfigurera anslutning", desc: "Ange host, port, användarnamn och lösenord. Välj filformat (CSV, XML eller JSON)." },
            { step: "4. Mappa fält", desc: "Koppla leverantörens kolumner till ShopMans produktfält (EAN, titel, pris, lager)." },
            { step: "5. Schemalägg synk", desc: "Välj hur ofta synken ska köras: varje timme, dagligen eller manuellt." },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 text-sm">{item.step}</span>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-sm text-amber-800">⚠️ <strong>OBS:</strong> Leverantörens fil måste innehålla minst ett unikt ID (EAN eller artikelnummer) för att produkter ska kunna matchas korrekt.</p>
        </div>
      </div>
    ),

    "seo-guide": (
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">ShopMan har inbyggd SEO-optimering — här är hur du utnyttjar det fullt ut.</p>
        <div className="space-y-3">
          {[
            { title: "Metatitlar och beskrivningar", desc: "Varje produkt och kategori har egna SEO-fält. Gå till produkten → fliken SEO. Optimal titellängd: 50–60 tecken." },
            { title: "Produktscheman (JSON-LD)", desc: "ShopMan genererar automatiskt Product schema med pris, tillgänglighet och recensioner — inga plugins krävs." },
            { title: "Canonical URLs", desc: "Undvik duplicerat innehåll med canonical-taggar. Ställs in automatiskt för filtreringssidor och sidnumrering." },
            { title: "Sitemap.xml", desc: "Automatisk sitemap genereras och uppdateras vid varje publicering. Anmäl den till Google Search Console." },
            { title: "Bilder", desc: "Lägg alltid till alt-texter på produktbilder. ShopMan komprimerar bilder automatiskt till WebP." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    fortnox: (
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">Koppla ShopMan till Fortnox för automatisk bokföring av ordrar och fakturor.</p>
        <ol className="space-y-3">
          {[
            { step: "1. Aktivera i Fortnox", desc: "Logga in på Fortnox → Inställningar → API-kopplingar. Generera en API-nyckel med behörighet: Faktura, Order, Artikel." },
            { step: "2. Lägg in nyckeln i ShopMan", desc: "Gå till Integrationer → Fortnox i ShopMan. Klistra in API-nyckeln och spara." },
            { step: "3. Konfigurera konton", desc: "Välj vilket bokföringskonto försäljning ska bokföras mot (standard: 3001). Ange momskonto (2610/2620)." },
            { step: "4. Aktivera automatisk synk", desc: "Aktivera 'Skapa faktura vid betald order'. ShopMan skickar fakturan till Fortnox automatiskt." },
            { step: "5. Testa", desc: "Lägg en testorder och kontrollera att fakturan dyker upp i Fortnox inom några minuter." },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 text-sm">{item.step}</span>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  };

  return (
    <div>
      {content[slug] ?? (
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">{title} — detaljerad guide.</p>
          <p className="text-gray-400 text-sm">Fullständig guide kommer snart. Kontakta supporten för hjälp.</p>
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
        <Link
          href="/contact"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Behöver du mer hjälp? →
        </Link>
      </div>
    </div>
  );
}
