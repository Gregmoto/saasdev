"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    priceYearly: 199, // per month, billed yearly
    tagline: "Perfekt för enskilda butiker som just kommit igång.",
    highlight: false,
    badge: null,
    limits: {
      products: "Obegränsat",
      markets: "1",
      api_calls: "10 000/mån",
      warehouses: "1",
      users: "3",
    },
    features: [
      "Obegränsat antal produkter",
      "Webshop",
      "Grundläggande SEO",
      "Klarna-betalningar",
      "Swish-betalningar",
      "CSV-import",
      "E-postsupport",
    ],
    missing: [
      "Multishop",
      "Marknadsplats",
      "B2B-prissättning",
      "Fortnox-integration",
      "API-åtkomst",
      "Flera anpassade domäner",
      "Leverantörssynk",
    ],
    cta: "Starta gratis",
    ctaHref: "https://admin-production-42ec.up.railway.app/login",
  },
  {
    id: "growth",
    name: "Growth",
    price: 1199,
    priceYearly: 899, // per month, billed yearly
    tagline: "För växande handlare med flera kanaler och marknader.",
    highlight: true,
    badge: "Mest populär",
    limits: {
      products: "Obegränsat",
      markets: "5",
      api_calls: "100 000/mån",
      warehouses: "3",
      users: "10",
    },
    features: [
      "Allt i Starter",
      "Obegränsat antal produkter",
      "Multishop",
      "Fortnox-integration",
      "API-åtkomst",
      "Leverantörssynk",
      "Avancerad SEO",
      "Flera anpassade domäner",
      "Prioriterad support",
    ],
    missing: [
      "Marknadsplats",
      "B2B-prissättning",
      "Dedikerad support",
    ],
    cta: "Starta gratis",
    ctaHref: "https://admin-production-42ec.up.railway.app/login",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    priceYearly: null,
    tagline: "För stora återförsäljare och marknadsplatsoperatörer.",
    highlight: false,
    badge: null,
    limits: {
      products: "Obegränsat",
      markets: "Obegränsat",
      api_calls: "Obegränsat",
      warehouses: "Obegränsat",
      users: "Obegränsat",
    },
    features: [
      "Allt i Growth",
      "Marknadsplats",
      "B2B-prissättning",
      "Dedikerad support",
      "SLA-garanti",
      "Anpassade integrationer",
      "White-label",
      "Dedikerad infrastruktur",
    ],
    missing: [],
    cta: "Kontakta sälj",
    ctaHref: "/contact",
  },
];

// ─── Feature comparison table ─────────────────────────────────────────────────

const FEATURE_ROWS = [
  { label: "Produkter", starter: "Obegränsat", growth: "Obegränsat", enterprise: "Obegränsat", group: "Begränsningar" },
  { label: "Marknader / butiker", starter: "1", growth: "5", enterprise: "Obegränsat", group: "Begränsningar" },
  { label: "API-anrop/mån", starter: "10 000", growth: "100 000", enterprise: "Obegränsat", group: "Begränsningar" },
  { label: "Lagerplatser", starter: "1", growth: "3", enterprise: "Obegränsat", group: "Begränsningar" },
  { label: "Användare", starter: "3", growth: "10", enterprise: "Obegränsat", group: "Begränsningar" },
  { label: "Webshop", starter: "✓", growth: "✓", enterprise: "✓", group: "Grundfunktioner" },
  { label: "CSV-import", starter: "✓", growth: "✓", enterprise: "✓", group: "Grundfunktioner" },
  { label: "Klarna & Swish", starter: "✓", growth: "✓", enterprise: "✓", group: "Grundfunktioner" },
  { label: "Grundläggande SEO", starter: "✓", growth: "✓", enterprise: "✓", group: "Grundfunktioner" },
  { label: "Multishop", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "Fortnox-integration", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "API-åtkomst", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "Leverantörssynk", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "Avancerad SEO", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "Flera anpassade domäner", starter: "✗", growth: "✓", enterprise: "✓", group: "Tillväxtfunktioner" },
  { label: "Marknadsplats", starter: "✗", growth: "✗", enterprise: "✓", group: "Enterprise" },
  { label: "B2B-prissättning", starter: "✗", growth: "✗", enterprise: "✓", group: "Enterprise" },
  { label: "White-label", starter: "✗", growth: "✗", enterprise: "✓", group: "Enterprise" },
  { label: "SLA-garanti", starter: "✗", growth: "✗", enterprise: "✓", group: "Enterprise" },
  { label: "Dedikerad infrastruktur", starter: "✗", growth: "✗", enterprise: "✓", group: "Enterprise" },
  { label: "Support", starter: "E-post", growth: "Prioriterad", enterprise: "Dedikerad", group: "Support" },
];

const FAQ = [
  {
    question: "Är det någon bindningstid?",
    answer: "Nej. Alla planer är månadsbaserade utan bindningstid. Du kan uppgradera, nedgradera eller avsluta när som helst. Vid årsabonnemang erbjuder vi 2 månaders rabatt men återbetalning sker pro rata om du avslutar i förtid.",
  },
  {
    question: "Vad händer om jag överskrider mina produktgränser?",
    answer: "Vi meddelar dig i god tid innan du når gränsen. Du kan enkelt uppgradera till nästa plan med ett klick. Vi stänger aldrig ner din butik utan föregående varning.",
  },
  {
    question: "Ingår betalningsavgifter i priset?",
    answer: "ShopMan tar inga transaktionsavgifter utöver månadspriset. Du betalar Klarnas, Stripes och Swishs egna avgifter direkt till respektive leverantör baserat på ditt avtal med dem.",
  },
  {
    question: "Kan jag testa Enterprise-funktioner?",
    answer: "Ja, kontakta oss för en 30-dagars Enterprise-pilot utan kostnad. Vi sätter upp en sandlådemiljö med alla Enterprise-funktioner aktiverade så du kan utvärdera fullt ut.",
  },
  {
    question: "Erbjuder ni rabatt för nystartade företag?",
    answer: "Ja, vi har ett startup-program för bolag yngre än 2 år med under 500 000 kr i omsättning. Kontakta oss för 40% rabatt på Growth-planen under det första året.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Check() {
  return <span className="text-green-500 font-bold text-base">✓</span>;
}
function Cross() {
  return <span className="text-zinc-300 text-base">✗</span>;
}

function FeatureValue({ value, highlight }: { value: string; highlight: boolean }) {
  if (value === "✓") return <span className={highlight ? "text-white" : "text-green-600"}><Check /></span>;
  if (value === "✗") return <span className={highlight ? "text-blue-300" : "text-zinc-300"}><Cross /></span>;
  return <span className={`text-sm font-medium ${highlight ? "text-white" : "text-zinc-700"}`}>{value}</span>;
}

function FaqItem({ item }: { item: { question: string; answer: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-zinc-900">{item.question}</span>
        <span className={`text-zinc-400 transition-transform text-xl ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-zinc-600 leading-relaxed text-sm">
          {item.answer}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  const groups = Array.from(new Set(FEATURE_ROWS.map(r => r.group)));

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 md:py-24 text-center">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-4">
              Enkel prissättning. Inga överraskningar.
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-10">
              Alla planer inkluderar 14 dagars gratis provperiod. Inget kreditkort krävs.
            </p>

            {/* Monthly/yearly toggle */}
            <div className="inline-flex items-center gap-3 bg-white border border-zinc-200 rounded-full p-1">
              <button
                onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${!yearly ? "bg-blue-600 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Månadsvis
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${yearly ? "bg-blue-600 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
              >
                Årsvis
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${yearly ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}>
                  2 mån gratis
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => {
              const price = yearly ? plan.priceYearly : plan.price;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-8 flex flex-col relative ${
                    plan.highlight
                      ? "bg-blue-600 text-white ring-2 ring-blue-500 shadow-xl"
                      : "bg-white border border-zinc-200 shadow-sm"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-800 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${plan.highlight ? "text-blue-200" : "text-blue-600"}`}>
                    {plan.name}
                  </div>
                  <div className="mb-2">
                    {price !== null ? (
                      <>
                        <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-zinc-900"}`}>
                          {(yearly ? plan.priceYearly : plan.price)?.toLocaleString("sv-SE")} kr
                        </span>
                        <span className={`text-sm ml-1 ${plan.highlight ? "text-blue-200" : "text-zinc-400"}`}>/mån</span>
                        {yearly && (
                          <div className={`text-xs mt-1 ${plan.highlight ? "text-blue-200" : "text-zinc-400"}`}>
                            Faktureras {((yearly ? plan.priceYearly ?? 0 : plan.price ?? 0) * 12).toLocaleString("sv-SE")} kr/år
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-zinc-900"}`}>
                        Offert
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-6 ${plan.highlight ? "text-blue-100" : "text-zinc-500"}`}>{plan.tagline}</p>

                  {/* Limits */}
                  <div className={`rounded-xl p-4 mb-6 space-y-2 text-sm ${plan.highlight ? "bg-white/10" : "bg-zinc-50"}`}>
                    {Object.entries(plan.limits).map(([key, val]) => {
                      const labels: Record<string, string> = {
                        products: "Produkter",
                        markets: "Marknader",
                        api_calls: "API-anrop",
                        warehouses: "Lagerplatser",
                        users: "Användare",
                      };
                      return (
                        <div key={key} className="flex justify-between">
                          <span className={plan.highlight ? "text-blue-200" : "text-zinc-500"}>{labels[key]}</span>
                          <span className={`font-semibold ${plan.highlight ? "text-white" : "text-zinc-900"}`}>{val}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white" : "text-zinc-700"}`}>
                        <span className={plan.highlight ? "text-green-300" : "text-green-500"}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                      plan.highlight
                        ? "bg-white text-blue-600 hover:bg-blue-50"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Fullständig jämförelse</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-zinc-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-zinc-900 w-1/2">Funktion</th>
                  {PLANS.map(plan => (
                    <th key={plan.id} className={`px-6 py-4 text-center font-semibold ${plan.highlight ? "text-blue-600" : "text-zinc-900"}`}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <>
                    <tr key={`group-${group}`} className="bg-zinc-50">
                      <td colSpan={4} className="px-6 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        {group}
                      </td>
                    </tr>
                    {FEATURE_ROWS.filter(r => r.group === group).map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                        <td className="px-6 py-3 text-zinc-700">{row.label}</td>
                        <td className="px-6 py-3 text-center">
                          <FeatureValue value={row.starter} highlight={false} />
                        </td>
                        <td className="px-6 py-3 text-center bg-blue-50/50">
                          <FeatureValue value={row.growth} highlight={false} />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <FeatureValue value={row.enterprise} highlight={false} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-8 text-center">Vanliga frågor om priser</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <FaqItem key={i} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-4">
              Redo att testa ShopMan?
            </h2>
            <p className="text-zinc-600 mb-8 max-w-xl mx-auto">
              Starta din 14 dagars kostnadsfria provperiod idag. Inget kreditkort, ingen bindningstid.
            </p>
            <Link
              href="https://admin-production-42ec.up.railway.app/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors inline-block"
            >
              Starta 14 dagars gratis provperiod
            </Link>
            <p className="text-sm text-zinc-400 mt-4">Inget kreditkort krävs · Avsluta när du vill</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
