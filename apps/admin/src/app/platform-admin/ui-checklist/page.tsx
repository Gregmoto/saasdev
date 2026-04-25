import type { ChecklistItem } from "./checklist-filter";
import { ChecklistFilter } from "./checklist-filter";

const ITEMS: ChecklistItem[] = [
  {
    id: 1,
    funktion: "Produkter UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/products", href: "/admin/products" }],
  },
  {
    id: 2,
    funktion: "Kategorier UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/categories", href: "/admin/categories" }],
  },
  {
    id: 3,
    funktion: "Varumärken UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/brands", href: "/admin/brands" }],
  },
  {
    id: 4,
    funktion: "Ordrar UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/orders", href: "/admin/orders" }],
  },
  {
    id: 5,
    funktion: "Kunder UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/customers", href: "/admin/customers" }],
  },
  {
    id: 6,
    funktion: "Lager UI",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/inventory", href: "/admin/inventory" }],
  },
  {
    id: 7,
    funktion: "Rollbaserade portaler",
    status: "klar",
    statusLabel: "Klar",
    links: [
      { label: "/admin (butik)", href: "/admin" },
      { label: "/platform-admin (plattform)", href: "/platform-admin/dashboard" },
    ],
  },
  {
    id: 8,
    funktion: "Demo Hub (Demo A/B/C)",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/demo (marketing)", href: "/demo", external: true }],
  },
  {
    id: 9,
    funktion: "Demo QA-checklista",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/demo-qa", href: "/admin/demo-qa" }],
  },
  {
    id: 10,
    funktion: "Starta butiksflöde (/start)",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/start (marketing)", href: "/start", external: true }],
  },
  {
    id: 11,
    funktion: "Admin-installationsguide",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/setup", href: "/admin/setup" }],
  },
  {
    id: 12,
    funktion: "Free-plan + användningsgränser",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/admin/billing", href: "/admin/billing" }],
  },
  {
    id: 13,
    funktion: "Prisuppdateringar (Starter 299kr, Growth 1199kr)",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/pricing (marketing)", href: "/pricing", external: true }],
  },
  {
    id: 14,
    funktion: "Inloggningssida (svensk UI + rollrouting)",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "/login", href: "/login", external: true }],
  },
  {
    id: 15,
    funktion: "Planuppdatering banner",
    status: "klar",
    statusLabel: "Klar",
    links: [{ label: "Visas i admin", href: "/admin" }],
  },
  {
    id: 16,
    funktion: "Butiksväxlare (shop switcher)",
    status: "delvis",
    statusLabel: "Delvis",
    links: [{ label: "/admin/stores", href: "/admin/stores" }],
  },
  {
    id: 17,
    funktion: "Om oss-sida (CMS-driven)",
    status: "delvis",
    statusLabel: "Byggd",
    links: [{ label: "/about (marketing)", href: "/about", external: true }],
  },
  {
    id: 18,
    funktion: "Integritetspolicy & Villkor",
    status: "delvis",
    statusLabel: "Byggd",
    links: [
      { label: "/privacy", href: "/privacy", external: true },
      { label: "/terms", href: "/terms", external: true },
    ],
  },
  {
    id: 19,
    funktion: "Roadmap-sida",
    status: "delvis",
    statusLabel: "Byggd",
    links: [{ label: "/roadmap (marketing)", href: "/roadmap", external: true }],
  },
  {
    id: 20,
    funktion: "Dokumentation",
    status: "delvis",
    statusLabel: "Byggd",
    links: [{ label: "/docs (marketing)", href: "/docs", external: true }],
  },
  {
    id: 21,
    funktion: "CMS för marknadsföring",
    status: "delvis",
    statusLabel: "Delvis",
    links: [{ label: "/api/cms/*", href: "/api/cms" }],
  },
  {
    id: 22,
    funktion: "Betalningsinställningar",
    status: "saknas",
    statusLabel: "Saknas",
    links: [{ label: "—", href: "-" }],
  },
  {
    id: 23,
    funktion: "Fraktinställningar",
    status: "saknas",
    statusLabel: "Saknas",
    links: [{ label: "—", href: "-" }],
  },
  {
    id: 24,
    funktion: "Storefrontbyggare (teman)",
    status: "saknas",
    statusLabel: "Saknas",
    links: [{ label: "—", href: "-" }],
  },
  {
    id: 25,
    funktion: "Affiliate/partner-program",
    status: "saknas",
    statusLabel: "Saknas",
    links: [{ label: "—", href: "-" }],
  },
];

const UPDATED_DATE = "2026-04-25";

export default function UIChecklistPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">
        Systemstatus &amp; UI-checklista
      </h1>
      <p className="text-zinc-500 mb-8">
        Kärn-SaaS-leverabler och deras status
      </p>

      {/* Interactive filter + table (client component) */}
      <ChecklistFilter items={ITEMS} />

      {/* Footer */}
      <p className="mt-6 text-xs text-zinc-400 text-right">
        Senast uppdaterad: {UPDATED_DATE}
      </p>
    </div>
  );
}
