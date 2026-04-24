"use client";
import { useState } from "react";

const SHOPS = [
  {
    id: "shop-a",
    name: "NordicSport",
    slug: "nordicsport",
    domain: "nordicsport.se",
    color: "bg-blue-600",
    emoji: "🏃",
    products: [
      { id: "1", name: "Löparskor XPro 3", price: 1_195, stock: 18, category: "Skor", sku: "NS-LPS-42" },
      { id: "2", name: "Kompressionstights", price: 549, stock: 24, category: "Kläder", sku: "NS-KTG-S" },
      { id: "3", name: "Löparklocka GPS+", price: 2_995, stock: 7, category: "Elektronik", sku: "NS-GPS-BLK" },
      { id: "4", name: "Träningsryggsäck 20L", price: 799, stock: 12, category: "Tillbehör", sku: "NS-RYG-20" },
    ],
    orders: [
      { id: "NS-0891", customer: "Petra Lindberg", date: "2024-04-22", total: 1744, status: "Skickad" },
      { id: "NS-0890", customer: "Tomas Ek", date: "2024-04-21", total: 2995, status: "Levererad" },
      { id: "NS-0889", customer: "Helena Borg", date: "2024-04-20", total: 549, status: "Behandlas" },
    ],
    revenue: "84 200 kr",
    orders_total: 124,
  },
  {
    id: "shop-b",
    name: "YogaStudio",
    slug: "yogastudio",
    domain: "yogastudio.se",
    color: "bg-emerald-600",
    emoji: "🧘",
    products: [
      { id: "1", name: "Yogamatta Eko 6mm", price: 549, stock: 21, category: "Yoga", sku: "YS-MAT-6" },
      { id: "2", name: "Meditatonsdyna", price: 349, stock: 9, category: "Yoga", sku: "YS-DYN-R" },
      { id: "3", name: "Yogablock Bambu 2-pack", price: 199, stock: 33, category: "Tillbehör", sku: "YS-BLK-2P" },
      { id: "4", name: "Yogahjul Kork", price: 299, stock: 14, category: "Yoga", sku: "YS-HJL-K" },
    ],
    orders: [
      { id: "YS-0312", customer: "Anna Svensson", date: "2024-04-22", total: 748, status: "Levererad" },
      { id: "YS-0311", customer: "Lisa Pettersson", date: "2024-04-21", total: 349, status: "Skickad" },
      { id: "YS-0310", customer: "Maria Karlsson", date: "2024-04-19", total: 498, status: "Levererad" },
    ],
    revenue: "31 450 kr",
    orders_total: 57,
  },
  {
    id: "shop-c",
    name: "GymWarehouse",
    slug: "gymwarehouse",
    domain: "gymwarehouse.se",
    color: "bg-orange-600",
    emoji: "🏋️",
    products: [
      { id: "1", name: "Hantlar 2×15kg Gummi", price: 1_795, stock: 6, category: "Styrka", sku: "GW-HAN-15" },
      { id: "2", name: "Skivstång 20kg Olympisk", price: 3_495, stock: 3, category: "Styrka", sku: "GW-SKV-20" },
      { id: "3", name: "Vikstänger Rubber 10kg", price: 549, stock: 22, category: "Tillbehör", sku: "GW-VIK-10" },
      { id: "4", name: "Powerbälte Läder XL", price: 849, stock: 8, category: "Tillbehör", sku: "GW-BLT-XL" },
    ],
    orders: [
      { id: "GW-1042", customer: "Björn Gustafsson", date: "2024-04-22", total: 4344, status: "Behandlas" },
      { id: "GW-1041", customer: "Nils Eriksson", date: "2024-04-20", total: 1398, status: "Levererad" },
      { id: "GW-1040", customer: "Kristina Persson", date: "2024-04-19", total: 849, status: "Skickad" },
    ],
    revenue: "62 890 kr",
    orders_total: 91,
  },
];

const SHARED_INVENTORY = [
  { sku: "GEN-BTLR-750", name: "Termosflaska 750ml", total: 180, shopA: 60, shopB: 70, shopC: 50 },
  { sku: "GEN-BAND-R", name: "Motståndsband Set", total: 95, shopA: 35, shopB: 25, shopC: 35 },
  { sku: "GEN-FOAM-60", name: "Foam Roller 60cm", total: 44, shopA: 18, shopB: 14, shopC: 12 },
  { sku: "GEN-STEP-20", name: "Stepbräda 20cm", total: 28, shopA: 12, shopB: 6, shopC: 10 },
];

const STATUS_COLOR: Record<string, string> = {
  Levererad: "bg-green-100 text-green-700",
  Skickad: "bg-blue-100 text-blue-700",
  Behandlas: "bg-yellow-100 text-yellow-700",
};

export default function MultishopDemo() {
  const [activeShop, setActiveShop] = useState(SHOPS[0]!);
  const [tab, setTab] = useState<"products" | "orders" | "inventory">("products");

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Admin bar with shop switcher */}
      <div className="bg-zinc-900 text-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">⚡ SportGroup AB</span>
            <span className="text-zinc-600">|</span>
            <span className="text-xs text-zinc-400">Butik:</span>
            {/* Shop switcher */}
            <div className="flex gap-1">
              {SHOPS.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => setActiveShop(shop)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeShop.id === shop.id
                      ? "bg-white text-zinc-900"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {shop.emoji} {shop.name}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-zinc-500">{activeShop.domain}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-5">
        <div className="flex gap-1">
          {[
            { id: "products", label: "Produkter" },
            { id: "orders", label: "Ordrar" },
            { id: "inventory", label: "Delat lager" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {SHOPS.map((shop) => (
            <button
              key={shop.id}
              onClick={() => setActiveShop(shop)}
              className={`text-left rounded-xl border p-4 transition-all ${
                activeShop.id === shop.id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{shop.emoji}</span>
                <span className="font-semibold text-sm text-gray-900">{shop.name}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{shop.revenue}</p>
              <p className="text-xs text-gray-500">{shop.orders_total} ordrar i april</p>
            </button>
          ))}
        </div>

        {/* Active shop note */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-base">{activeShop.emoji}</span>
          <span>Visar data för <strong>{activeShop.name}</strong> ({activeShop.domain}) — välj en annan butik ovan för att se dess data</span>
        </div>

        {/* Products tab */}
        {tab === "products" && (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Produkt</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Kategori</th>
                  <th className="text-right px-4 py-3 font-medium">Pris</th>
                  <th className="text-right px-4 py-3 font-medium">Lager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeShop.products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.price.toLocaleString("sv-SE")} kr</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${p.stock <= 7 ? "text-red-600" : "text-gray-700"}`}>{p.stock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders tab */}
        {tab === "orders" && (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Order-ID</th>
                  <th className="text-left px-4 py-3 font-medium">Kund</th>
                  <th className="text-left px-4 py-3 font-medium">Datum</th>
                  <th className="text-right px-4 py-3 font-medium">Summa</th>
                  <th className="text-right px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeShop.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.customer}</td>
                    <td className="px-4 py-3 text-gray-500">{o.date}</td>
                    <td className="px-4 py-3 text-right font-medium">{o.total.toLocaleString("sv-SE")} kr</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Shared inventory tab */}
        {tab === "inventory" && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
              <strong>Delat lager</strong> — dessa produkter delas mellan alla butiker under ditt konto. Varje butik har sin egen allokering från det gemensamma lagret.
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-4 py-3 font-medium">Produkt</th>
                    <th className="text-left px-4 py-3 font-medium">SKU</th>
                    <th className="text-center px-4 py-3 font-medium">Totalt</th>
                    <th className="text-center px-4 py-3 font-medium">🏃 NordicSport</th>
                    <th className="text-center px-4 py-3 font-medium">🧘 YogaStudio</th>
                    <th className="text-center px-4 py-3 font-medium">🏋️ GymWarehouse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SHARED_INVENTORY.map((i) => (
                    <tr key={i.sku} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i.sku}</td>
                      <td className="px-4 py-3 text-center font-bold">{i.total}</td>
                      <td className="px-4 py-3 text-center text-blue-700">{i.shopA}</td>
                      <td className="px-4 py-3 text-center text-emerald-700">{i.shopB}</td>
                      <td className="px-4 py-3 text-center text-orange-700">{i.shopC}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
        <span>Demo-data · Återställs varje natt · Inga riktiga transaktioner</span>
        <span>ShopMan v1.0 · Demo B (Multishop)</span>
      </div>
    </div>
  );
}
