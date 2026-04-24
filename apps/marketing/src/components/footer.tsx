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
      ["Versionshistorik", "/changelog"],
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
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-100 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-semibold text-zinc-900">ShopMan</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Modern e-handelsinfrastruktur för ambitiösa handlare.
            </p>
          </div>
          {COLS.map(col => (
            <div key={col.title}>
              <div className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-4">{col.title}</div>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-400">© {new Date().getFullYear()} ShopMan. Alla rättigheter förbehållna.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-zinc-400 hover:text-zinc-600">Integritetspolicy</Link>
            <Link href="/terms" className="text-xs text-zinc-400 hover:text-zinc-600">Villkor</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
