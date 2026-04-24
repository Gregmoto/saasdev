import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Priser — Enkla, transparenta planer",
  description:
    "ShopMan erbjuder enkla och transparenta priser för alla typer av handlare. Starter från 599 kr/månad. 14 dagars gratis provperiod utan kreditkort.",
  path: "/pricing",
});

const PLANS = [
  {
    name: "Starter",
    price: "599 kr",
    desc: "Perfekt för enskilda butiker som just kommit igång.",
    features: ["1 butik", "Upp till 1 000 produkter", "5 000 ordrar/månad", "Importcenter", "E-postsupport"],
    cta: "Kom igång",
    highlight: false,
  },
  {
    name: "Growth",
    price: "1 499 kr",
    desc: "För växande handlare med flera kanaler.",
    features: ["5 butiker", "Obegränsat antal produkter", "25 000 ordrar/månad", "Multishop", "Prioriterad support", "API-åtkomst"],
    cta: "Kom igång",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "För stora återförsäljare och marknadsplatsoperatörer.",
    features: ["Obegränsat antal butiker", "Obegränsat av allt", "Dedikerad infrastruktur", "SLA-garanti", "Anpassade integrationer", "Dedikerad kundansvarig"],
    cta: "Kontakta sälj",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Enkla, transparenta priser</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Alla planer inkluderar 14 dagars gratis provperiod. Inget kreditkort krävs.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlight ? "bg-blue-600 text-white ring-2 ring-blue-600" : "bg-white border border-gray-200"}`}>
              <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${plan.highlight ? "text-blue-100" : "text-blue-600"}`}>{plan.name}</div>
              <div className="text-4xl font-bold mb-1">
                {plan.price === "Custom" ? "Offert" : plan.price}
                {plan.price !== "Custom" && (
                  <span className={`text-base font-normal ml-1 ${plan.highlight ? "text-blue-100" : "text-gray-400"}`}>/månad</span>
                )}
              </div>
              <p className={`text-sm mt-2 mb-6 ${plan.highlight ? "text-blue-100" : "text-gray-500"}`}>{plan.desc}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white" : "text-gray-700"}`}>
                    <span className="text-green-400">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
