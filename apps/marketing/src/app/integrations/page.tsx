"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const INTEGRATIONS = [
  // Import & Migration
  { slug: "shopify", name: "Shopify", icon: "🛍️", category: "Import & Migration", description: "Migrera hela din Shopify-butik — produkter, kunder, ordrar och metadata — på under 15 minuter med vår automatiserade importguide." },
  { slug: "woocommerce", name: "WooCommerce", icon: "🟣", category: "Import & Migration", description: "Importera din WordPress/WooCommerce-butik komplett med produktvarianter, kategorier och orderhistorik." },
  { slug: "prestashop", name: "PrestaShop", icon: "🔵", category: "Import & Migration", description: "Flytta din PrestaShop-butik till ShopMan utan teknisk kompetens. Stöd för PrestaShop 1.7 och 8.x." },
  { slug: "magento", name: "Magento / Adobe Commerce", icon: "🔶", category: "Import & Migration", description: "Enterprise-anpassad migration från Magento 2 med stöd för konfigurerbara produkter, kundgrupper och B2B-konton." },
  { slug: "csv-excel", name: "CSV / Excel", icon: "📊", category: "Import & Migration", description: "Ladda upp produkter, kunder och ordrar via standardiserade CSV- eller Excel-filer med automatisk kolumnmappning." },
  // Bokföring & ERP
  { slug: "fortnox", name: "Fortnox", icon: "📒", category: "Bokföring & ERP", description: "Synkronisera ordrar, fakturor och kunder direkt med Fortnox. Automatisk bokföring av varje transaktion i realtid." },
  { slug: "visma", name: "Visma", icon: "📊", category: "Bokföring & ERP", description: "Tvåvägsintegration med Visma eEkonomi och Visma Administration för sömlös bokföring och lagerredovisning." },
  { slug: "bjorn-lunden", name: "Björn Lundén", icon: "📋", category: "Bokföring & ERP", description: "Exportera försäljningsdata och fakturor direkt till Björn Lundén Bokföring med korrekt momshantering." },
  // Leverantörssynk
  { slug: "ftp-sync", name: "FTP-sync", icon: "📁", category: "Leverantörssynk", description: "Automatisk produktsynkronisering mot leverantörers FTP-servrar. Stöd för XML, CSV och EDI-format." },
  { slug: "api-sync", name: "API-sync", icon: "🔌", category: "Leverantörssynk", description: "Anslut mot valfri leverantörs REST- eller SOAP-API för realtidsuppdatering av priser och lagersaldo." },
  { slug: "edi-peppol", name: "EDI / PEPPOL", icon: "📄", category: "Leverantörssynk", description: "Skicka och ta emot orders och fakturor via PEPPOL-nätverket. Uppfyller krav för offentlig sektor." },
  // Betalningar
  { slug: "klarna", name: "Klarna", icon: "🟢", category: "Betalningar", description: "Erbjud Klarna Checkout med delbetalning, faktura och direktbetalning. Sveriges populäraste betallösning aktiveras med ett klick." },
  { slug: "stripe", name: "Stripe", icon: "💳", category: "Betalningar", description: "Acceptera kortbetalningar och digitala plånböcker från hela världen med Stripes säkra betalningsinfrastruktur." },
  { slug: "swish", name: "Swish", icon: "🔵", category: "Betalningar", description: "Aktivera Swish för handel och låt svenska kunder betala direkt från bankappen — utan mellanhänder." },
  { slug: "nets-easy", name: "Nets Easy", icon: "💰", category: "Betalningar", description: "Nordisk betallösning med stöd för kort, faktura och delbetalning på ett och samma checkout-formulär." },
  // Frakt & Logistik
  { slug: "postnord", name: "PostNord", icon: "📦", category: "Frakt & Logistik", description: "Generera fraktsedlar, boka upphämtning och skicka spårningslänkar automatiskt vid orderbekräftelse." },
  { slug: "dhl", name: "DHL Express", icon: "🟡", category: "Frakt & Logistik", description: "Skicka internationella försändelser med DHL Express. Automatisk tullhantering och realtidsspårning." },
  { slug: "bring", name: "Bring", icon: "🟠", category: "Frakt & Logistik", description: "Nordisk frakt via Bring med stöd för paket, pall och temperaturkänsliga varor till hela Norden." },
  // Analytics
  { slug: "google-analytics", name: "Google Analytics 4", icon: "📈", category: "Analytics", description: "Spåra konverteringar, kundresor och produktprestanda i GA4 med automatisk Enhanced Ecommerce-taggning." },
  { slug: "meta-pixel", name: "Meta Pixel", icon: "📘", category: "Analytics", description: "Optimera Meta-annonser med korrekt konverteringsdata via Pixel och Conversions API för maximal ROAS." },
];

const CATEGORIES = ["Alla", ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];

function IntegrationCard({ integration }: { integration: typeof INTEGRATIONS[0] }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md hover:border-zinc-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl">{integration.icon}</span>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
          {integration.category}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-zinc-900 text-base mb-1">{integration.name}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed">{integration.description}</p>
      </div>
      <div className="mt-auto pt-2">
        <Link
          href={`/integrations/${integration.slug}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Läs mer →
        </Link>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState("Alla");

  const filtered = activeCategory === "Alla"
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeCategory);

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span>🔌</span>
              <span>20+ färdiga integrationer</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-4">
              Integrationer & Kopplingar
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Koppla ShopMan till dina befintliga system på minuter. Från bokföring och betalningar
              till frakt och leverantörssynk — allt finns redan klart.
            </p>
          </div>
        </section>

        {/* Category filters */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(integration => (
              <IntegrationCard key={integration.slug} integration={integration} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-zinc-500 py-16">Inga integrationer hittades.</p>
          )}
        </section>

        {/* CTA */}
        <section className="bg-zinc-900 py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Saknar du en integration?
            </h2>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
              Vi lägger kontinuerligt till nya kopplingar. Kontakta oss och berätta vilket system
              du vill ansluta — vi kan ofta leverera inom några veckor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Begär integration
              </Link>
              <Link
                href="https://admin-production-42ec.up.railway.app/login"
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Starta gratis provperiod
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
