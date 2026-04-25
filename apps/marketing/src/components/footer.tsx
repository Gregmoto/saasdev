import Link from "next/link";

const COLS = [
  {
    title: "Produkt",
    links: [
      ["Funktioner", "/features"],
      ["Integrationer", "/integrations"],
      ["Priser", "/pricing"],
      ["Versionshistorik", "/changelog"],
      ["Färdplan", "/roadmap"],
    ],
  },
  {
    title: "Resurser",
    links: [
      ["Guider & Resurser", "/resources"],
      ["Nyheter", "/news"],
      ["Blogg", "/blog"],
      ["Dokumentation", "/docs"],
      ["Systemstatus", "/status"],
      ["RSS — Nyheter", "/news/rss"],
    ],
  },
  {
    title: "Kom igång",
    links: [
      ["Boka demo", "/book-demo"],
      ["Starta gratis test", "/trial"],
      ["Kontakt", "/contact"],
      ["Alternativ till Shopify", "/alternatives/shopify"],
      ["Alternativ till WooCommerce", "/alternatives/woocommerce"],
      ["Alternativ till PrestaShop", "/alternatives/prestashop"],
    ],
  },
  {
    title: "Företag",
    links: [
      ["Om oss", "/about"],
      ["Kontakt", "/contact"],
      ["Integritetspolicy", "/privacy"],
      ["Villkor", "/terms"],
      ["Roadmap", "/roadmap"],
      ["Dokumentation", "/docs"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-stone-50 border-t border-stone-100">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-blue-700">
                <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-semibold tracking-tight text-stone-900">ShopMan</span>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">
              Modern e-handelsinfrastruktur för ambitiösa handlare.
            </p>
          </div>
          {COLS.map(col => (
            <div key={col.title}>
              <div className="text-xs font-semibold text-stone-900 uppercase tracking-widest mb-4">{col.title}</div>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-400">© {new Date().getFullYear()} ShopMan. Alla rättigheter förbehållna.</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Om oss</Link>
            <Link href="/privacy" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Integritetspolicy</Link>
            <Link href="/terms" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Villkor</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
