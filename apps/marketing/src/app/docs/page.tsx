import type React from "react";
import { buildMetadata } from "@/lib/metadata";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Dokumentation",
  description:
    "Allt du behöver för att komma igång med ShopMan — guider, API-dokumentation och integrationsinstruktioner.",
  path: "/docs",
});

// ---------------------------------------------------------------------------
// Section definitions (icons as SVG paths for clean rendering)
// ---------------------------------------------------------------------------
interface QuickLink {
  label: string;
  slug: string;
}

interface Section {
  title: string;
  icon: React.ReactNode;
  links: QuickLink[];
}

function RocketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2C10 2 14 4 14 10L10 14L6 10C6 4 10 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
      <path d="M7 14l-2 3M13 14l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6l7-3 7 3v8l-7 3-7-3V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 3v14M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="14" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 11h14" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10a7 7 0 0 1 13-3.5M17 10a7 7 0 0 1-13 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 3l1 3.5-3.5 1M4 17l-1-3.5 3.5-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 2v5M13 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 7h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 17v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 11V9a6 6 0 0 1 12 0v2" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="11" width="3" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="11" width="3" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M17 15v1a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const SECTIONS: Section[] = [
  {
    title: "Kom igång",
    icon: <RocketIcon />,
    links: [
      { label: "Skapa konto", slug: "getting-started" },
      { label: "Konfigurering av butik", slug: "store-setup" },
      { label: "Lägg till produkter", slug: "add-products" },
      { label: "Ta emot betalningar", slug: "payments-setup" },
    ],
  },
  {
    title: "Produkter & Lager",
    icon: <BoxIcon />,
    links: [
      { label: "Produkttyper & varianter", slug: "product-types" },
      { label: "Kategorier & varumärken", slug: "categories-brands" },
      { label: "Lagerhantering", slug: "inventory" },
    ],
  },
  {
    title: "Flerbutik & Marketplace",
    icon: <ShopIcon />,
    links: [
      { label: "MultiShop", slug: "multishop" },
      { label: "Marketplace", slug: "marketplace" },
      { label: "Återförsäljarportal", slug: "reseller-portal" },
    ],
  },
  {
    title: "Import & Synk",
    icon: <SyncIcon />,
    links: [
      { label: "Importera från Shopify/WooCommerce/PrestaShop", slug: "imports" },
      { label: "Leverantörssynk (FTP/API/CSV)", slug: "supplier-sync" },
    ],
  },
  {
    title: "Integrationer",
    icon: <PlugIcon />,
    links: [
      { label: "Fortnox Connect", slug: "fortnox" },
      { label: "Klarna & Swish", slug: "payments" },
    ],
  },
  {
    title: "Support & Returflöde",
    icon: <HeadsetIcon />,
    links: [{ label: "Tickets, Chat & RMA", slug: "support-rma" }],
  },
  {
    title: "SEO & Prestanda",
    icon: <SearchIcon />,
    links: [
      { label: "SEO & prestanda", slug: "seo-performance" },
      { label: "API-referens", slug: "api-reference" },
    ],
  },
];

const POPULAR = [
  {
    slug: "getting-started",
    title: "Skapa konto",
    description: "Kom igång med ShopMan på under 5 minuter.",
    section: "Kom igång",
  },
  {
    slug: "multishop",
    title: "MultiShop",
    description: "Driva flera butiker från ett enda konto.",
    section: "Flerbutik & Marketplace",
  },
  {
    slug: "imports",
    title: "Importera från Shopify & WooCommerce",
    description: "Flytta din befintliga butik till ShopMan.",
    section: "Import & Synk",
  },
  {
    slug: "fortnox",
    title: "Fortnox Connect",
    description: "Synka ordrar och fakturor med Fortnox automatiskt.",
    section: "Integrationer",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DocsIndexPage() {
  return (
    <>
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Dokumentation
        </h1>
        <p className="text-stone-500 leading-relaxed max-w-2xl">
          Allt du behöver för att komma igång med ShopMan — guider,
          API-dokumentation och integrationsinstruktioner.
        </p>
      </div>

      {/* Popular */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
          Populärt just nu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POPULAR.map((item) => (
            <Link
              key={item.slug}
              href={`/docs/${item.slug}`}
              className="group flex items-start gap-4 p-4 bg-white border border-stone-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M7 8h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-stone-900 group-hover:text-blue-700 transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {item.description}
                </div>
                <div className="text-xs text-stone-400 mt-1">{item.section}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sections grid */}
      <section>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
          Alla ämnen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="bg-white border border-stone-100 rounded-xl p-5 hover:border-stone-200 transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="text-stone-600">{section.icon}</div>
                <h3 className="font-semibold text-stone-900 text-sm">
                  {section.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.slug}>
                    <Link
                      href={`/docs/${link.slug}`}
                      className="text-sm text-stone-600 hover:text-blue-700 transition-colors hover:underline inline-flex items-center gap-1 group"
                    >
                      <svg
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 5h6M5 2l3 3-3 3"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <div className="mt-12 p-6 bg-stone-50 border border-stone-100 rounded-xl text-center">
        <p className="text-stone-600 text-sm mb-3">
          Hittar du inte det du söker?
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          Kontakta supporten &rarr;
        </Link>
      </div>
    </>
  );
}
