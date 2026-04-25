"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  slug: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Kom igång",
    items: [
      { label: "Skapa konto", slug: "getting-started" },
      { label: "Konfigurering av butik", slug: "store-setup" },
      { label: "Lägg till produkter", slug: "add-products" },
      { label: "Ta emot betalningar", slug: "payments-setup" },
    ],
  },
  {
    title: "Produkter & Lager",
    items: [
      { label: "Produkttyper & varianter", slug: "product-types" },
      { label: "Kategorier & varumärken", slug: "categories-brands" },
      { label: "Lagerhantering", slug: "inventory" },
    ],
  },
  {
    title: "Flerbutik & Marketplace",
    items: [
      { label: "MultiShop — ett konto, flera butiker", slug: "multishop" },
      { label: "Marketplace", slug: "marketplace" },
      { label: "Återförsäljarportal", slug: "reseller-portal" },
    ],
  },
  {
    title: "Import & Synk",
    items: [
      {
        label: "Importera från Shopify/WooCommerce/PrestaShop",
        slug: "imports",
      },
      { label: "Leverantörssynk (FTP/API/CSV)", slug: "supplier-sync" },
    ],
  },
  {
    title: "Integrationer",
    items: [
      { label: "Fortnox Connect", slug: "fortnox" },
      { label: "Klarna & Swish", slug: "payments" },
    ],
  },
  {
    title: "Support & Returflöde",
    items: [{ label: "Tickets, Chat & RMA", slug: "support-rma" }],
  },
  {
    title: "SEO & Prestanda",
    items: [
      { label: "SEO & prestanda", slug: "seo-performance" },
      { label: "API-referens", slug: "api-reference" },
    ],
  },
];

function SidebarSection({
  section,
  pathname,
  defaultOpen,
}: {
  section: NavSection;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
        aria-expanded={open}
      >
        <span>{section.title}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-200 text-stone-400 ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M4 2l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {section.items.map((item) => {
            const active = pathname === `/docs/${item.slug}`;
            return (
              <li key={item.slug}>
                <Link
                  href={`/docs/${item.slug}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                  <span className={active ? "" : "pl-3"}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NavTree({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Dokumentationsnavigation">
      <Link
        href="/docs"
        className={`flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-sm font-medium transition-colors ${
          pathname === "/docs"
            ? "bg-blue-50 text-blue-700"
            : "text-stone-700 hover:bg-stone-100"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          className="shrink-0"
          aria-hidden="true"
        >
          <path
            d="M3 5h14M3 10h14M3 15h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Alla artiklar
      </Link>

      <div className="border-t border-stone-100 pt-3">
        {NAV.map((section) => {
          const hasActive = section.items.some(
            (item) => pathname === `/docs/${item.slug}`
          );
          return (
            <SidebarSection
              key={section.title}
              section={section}
              pathname={pathname}
              defaultOpen={hasActive}
            />
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Mobile bar — rendered outside flex container via layout
// ---------------------------------------------------------------------------
export function DocsMobileBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeLabel =
    NAV.flatMap((s) => s.items).find((i) => `/docs/${i.slug}` === pathname)
      ?.label ?? "Dokumentation";

  return (
    <>
      <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-stone-100 bg-white sticky top-[60px] z-40">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
          aria-expanded={open}
          aria-label="Dokumentationsnavigation"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            {open ? (
              <path
                d="M3 3L17 17M17 3L3 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
          Navigering
        </button>
        <span className="text-stone-300">|</span>
        <span className="text-xs text-stone-500 truncate">{activeLabel}</span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute top-[108px] left-0 bottom-0 w-72 bg-white overflow-y-auto p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <NavTree pathname={pathname} />
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar — renders inside the flex layout column
// ---------------------------------------------------------------------------
export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-60 shrink-0 sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto py-6 pr-2">
      <NavTree pathname={pathname} />
    </aside>
  );
}
