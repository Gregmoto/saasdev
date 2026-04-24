"use client";
import { useState } from "react";

const ACCOUNTS = [
  {
    id: "acc-1",
    name: "Vintagebutiken",
    slug: "vintagebutiken",
    owner: "Clara Johansson",
    email: "clara@vintagebutiken.se",
    plan: "Growth",
    status: "active",
    emoji: "🪴",
    revenue: "28 450 kr",
    orders: 43,
    products: [
      { id: "1", name: "Vintage Läderjacka 70-tal", price: 1_495, stock: 2, category: "Kläder" },
      { id: "2", name: "Retro Porslinssett", price: 895, stock: 5, category: "Hem" },
      { id: "3", name: "LP-skiva Led Zeppelin IV", price: 349, stock: 3, category: "Musik" },
      { id: "4", name: "Vintage Kamera Minolta", price: 2_195, stock: 1, category: "Elektronik" },
    ],
    latestOrder: { id: "VB-0291", customer: "Nils Borg", total: 1495, status: "Levererad" },
  },
  {
    id: "acc-2",
    name: "EkoGardin",
    slug: "ekogardin",
    owner: "Mattias Strand",
    email: "m.strand@ekogardin.com",
    plan: "Starter",
    status: "active",
    emoji: "🌿",
    revenue: "15 200 kr",
    orders: 28,
    products: [
      { id: "1", name: "Ekologisk Linen Gardin", price: 649, stock: 18, category: "Hem" },
      { id: "2", name: "Bambu Rullgardin 120cm", price: 449, stock: 12, category: "Hem" },
      { id: "3", name: "Återvunnet Tyg 5m", price: 299, stock: 30, category: "Tyg" },
    ],
    latestOrder: { id: "EG-0118", customer: "Sara Holm", total: 898, status: "Skickad" },
  },
  {
    id: "acc-3",
    name: "TechNord AB",
    slug: "technord",
    owner: "David Lindqvist",
    email: "david@technord.se",
    plan: "Growth",
    status: "active",
    emoji: "💻",
    revenue: "91 300 kr",
    orders: 87,
    products: [
      { id: "1", name: "USB-C Hub 10-i-1", price: 549, stock: 45, category: "Tillbehör" },
      { id: "2", name: "Mekaniskt tangentbord TKL", price: 1_195, stock: 12, category: "Tillbehör" },
      { id: "3", name: "Webbkamera 4K Pro", price: 1_495, stock: 8, category: "Kamera" },
      { id: "4", name: "Gaming Headset Trådlös", price: 1_795, stock: 6, category: "Audio" },
      { id: "5", name: "Ergonomisk Musarmstöd", price: 249, stock: 55, category: "Tillbehör" },
    ],
    latestOrder: { id: "TN-0782", customer: "Patrik Lund", total: 2690, status: "Behandlas" },
  },
  {
    id: "acc-4",
    name: "BarnLeksaker",
    slug: "barnleksaker",
    owner: "Karin Magnusson",
    email: "karin@barnleksaker.se",
    plan: "Starter",
    status: "active",
    emoji: "🧸",
    revenue: "8 900 kr",
    orders: 17,
    products: [
      { id: "1", name: "Träleksaker Set Djungeldjur", price: 449, stock: 22, category: "Leksaker" },
      { id: "2", name: "Babymonitor 5-tum HD", price: 1_295, stock: 4, category: "Elektronik" },
      { id: "3", name: "Pussel 200 bitar Natur", price: 199, stock: 15, category: "Spel" },
    ],
    latestOrder: { id: "BL-0051", customer: "Eva Ström", total: 648, status: "Skickad" },
  },
];

const PLAN_COLOR: Record<string, string> = {
  Starter: "bg-gray-100 text-gray-600",
  Growth: "bg-blue-100 text-blue-700",
  Enterprise: "bg-purple-100 text-purple-700",
};

const STATUS_COLOR: Record<string, string> = {
  Levererad: "bg-green-100 text-green-700",
  Skickad: "bg-blue-100 text-blue-700",
  Behandlas: "bg-yellow-100 text-yellow-700",
};

export default function MarketplaceDemo() {
  const [view, setView] = useState<"platform" | string>("platform");

  const activeAccount = view !== "platform" ? ACCOUNTS.find((a) => a.id === view) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Platform admin bar */}
      <div className="bg-zinc-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold">⚡ ShopMan</span>
          <span className="text-zinc-600">|</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${view === "platform" ? "bg-white text-zinc-900" : "text-zinc-400"}`}>
            Plattformsadmin
          </span>
          {activeAccount && (
            <>
              <span className="text-zinc-600">/</span>
              <span className="text-white text-sm font-medium">
                {activeAccount.emoji} {activeAccount.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view !== "platform" && (
            <button
              onClick={() => setView("platform")}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ← Plattformsvy
            </button>
          )}
          <span className="text-xs text-zinc-500">platform-admin</span>
        </div>
      </div>

      <div className="p-6">
        {/* Platform view */}
        {view === "platform" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Butikskonton på plattformen</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Aktiva konton", value: "4" },
                  { label: "Total omsättning", value: "143 850 kr" },
                  { label: "Ordrar (april)", value: "175" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-base font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-5">
              <strong>Isolerade butikskonton</strong> — varje konto ser bara sin egen data. Klicka "Visa konto" för att zooma in.
            </div>

            <div className="space-y-3">
              {ACCOUNTS.map((acc) => (
                <div key={acc.id} className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                  <div className="text-2xl">{acc.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{acc.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLOR[acc.plan] ?? ""}`}>{acc.plan}</span>
                    </div>
                    <p className="text-xs text-gray-500">{acc.owner} · {acc.email} · {acc.slug}.shopman.dev</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm font-bold text-gray-900">{acc.revenue}</p>
                    <p className="text-xs text-gray-400">{acc.orders} ordrar</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm text-gray-700">{acc.products.length} produkter</p>
                    <p className="text-xs text-gray-400">Senaste: {acc.latestOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setView(acc.id)}
                    className="flex-shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Visa konto →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual account view */}
        {activeAccount && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">{activeAccount.emoji}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{activeAccount.name}</h2>
                <p className="text-sm text-gray-500">{activeAccount.owner} · {activeAccount.slug}.shopman.dev</p>
              </div>
              <div className="ml-auto flex gap-4 text-center">
                {[
                  { label: "Omsättning", value: activeAccount.revenue },
                  { label: "Ordrar", value: String(activeAccount.orders) },
                  { label: "Produkter", value: String(activeAccount.products.length) },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-base font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mb-5">
              Du ser nu konto <strong>{activeAccount.name}</strong>. All data är isolerad från övriga butikskonton på plattformen.
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Products */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Produkter</h3>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-xs text-gray-500">
                        <th className="text-left px-4 py-2.5 font-medium">Produkt</th>
                        <th className="text-right px-4 py-2.5 font-medium">Pris</th>
                        <th className="text-right px-4 py-2.5 font-medium">Lager</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeAccount.products.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-900 text-xs">{p.name}</p>
                            <p className="text-gray-400 text-xs">{p.category}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-medium">{p.price.toLocaleString("sv-SE")} kr</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-medium ${p.stock <= 3 ? "text-red-600" : "text-gray-600"}`}>{p.stock}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latest order + account info */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Senaste order</h3>
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-blue-600">{activeAccount.latestOrder.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[activeAccount.latestOrder.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {activeAccount.latestOrder.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{activeAccount.latestOrder.customer}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{activeAccount.latestOrder.total.toLocaleString("sv-SE")} kr</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Kontoinformation</h3>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {[
                      { label: "Plan", value: activeAccount.plan },
                      { label: "Status", value: "Aktiv" },
                      { label: "Slug", value: activeAccount.slug },
                      { label: "Ägare", value: activeAccount.owner },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-medium text-gray-900">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
        <span>Demo-data · Återställs varje natt · Inga riktiga transaktioner</span>
        <span>ShopMan v1.0 · Demo C (Handelslösning för flera butiker)</span>
      </div>
    </div>
  );
}
