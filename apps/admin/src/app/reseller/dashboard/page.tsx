import Link from "next/link";
import { Badge } from "@saas-shop/ui";

const SECTIONS = [
  { label: "Kunder", href: "/reseller/customers", icon: "👤", description: "Hantera dina kunder och deras butiker." },
  { label: "Provisioner", href: "/reseller/commissions", icon: "💰", description: "Se dina provisioner och utbetalningar." },
  { label: "Rapporter", href: "/reseller/reports", icon: "📊", description: "Statistik och försäljningsrapporter." },
  { label: "Inställningar", href: "/reseller/settings", icon: "⚙️", description: "Kontoinställningar och profil." },
];

export default function ResellerDashboardPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Välkommen, Reseller!</h1>
      <p className="text-zinc-500 mb-8">
        Här hanterar du dina kunder, provisioner och rapporter.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white rounded-xl border border-zinc-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{section.icon}</div>
              <Badge variant="info">Kommande</Badge>
            </div>
            <div className="font-semibold text-zinc-900 group-hover:text-teal-700 transition-colors">
              {section.label}
            </div>
            <p className="text-sm text-zinc-500 mt-1">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
