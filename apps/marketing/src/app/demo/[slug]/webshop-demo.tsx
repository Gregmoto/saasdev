"use client";
import { useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  stock: number;
  category: string;
  sku: string;
  image: string;
  description: string;
};

const PRODUCTS: Product[] = [
  { id: "p1", name: "Premium Löparskor X400", price: 1295, compareAt: 1595, stock: 23, category: "Skor", sku: "SHOE-X400-42", image: "👟", description: "Lätta löparskor med avancerat dämpningssystem. Perfekta för dagliga pass på asfalt eller grus." },
  { id: "p2", name: "Träningsjacka ThermoFlex", price: 895, stock: 8, category: "Kläder", sku: "JKT-THFX-M", image: "🧥", description: "Vindtät och vattenavvisande jacka med stretch. Ideal för utomhusträning hela året." },
  { id: "p3", name: "Kompressionsstrumpor Pro", price: 245, compareAt: 299, stock: 45, category: "Tillbehör", sku: "SOCK-COMP-L", image: "🧦", description: "Medicinska kompressionsstrumpor för förbättrad cirkulation under och efter träning." },
  { id: "p4", name: "Sportflaska 750ml BPA-fri", price: 199, stock: 67, category: "Tillbehör", sku: "BTL-750-BLK", image: "🍶", description: "Dubbelväggad termosflaska som håller kall dryck i 24h och varm i 12h." },
  { id: "p5", name: "Yogamatta Eko Premium", price: 549, stock: 12, category: "Yoga", sku: "YOGA-ECO-6MM", image: "🧘", description: "6mm tjock ekologisk gummimatta med utmärkt grepp och dämpning för alla yognivåer." },
  { id: "p6", name: "Hantlar Set 2×10kg", price: 1495, compareAt: 1795, stock: 5, category: "Styrketräning", sku: "DUMB-10KG-SET", image: "🏋️", description: "Gummiklädda hantelpar i kromstål. Hexagonal form förhindrar rullning." },
  { id: "p7", name: "Träningsbälte Läder XL", price: 649, stock: 9, category: "Styrketräning", sku: "BELT-LTH-XL", image: "🥋", description: "Kraftigt läderbälte med 10cm bredd på ryggen för maximalt stöd vid tyngdlyftning." },
  { id: "p8", name: "GPS-klocka Endure 3", price: 3295, compareAt: 3995, stock: 3, category: "Elektronik", sku: "GPS-END3-BLK", image: "⌚", description: "Militär-certifierad GPS-klocka med 40h batteritid, pulsmätning och sömnanalys." },
];

const ORDERS = [
  { id: "ORD-2024-1891", customer: "Maria Lindqvist", date: "2024-04-22", total: 2190, status: "Levererad", items: 2 },
  { id: "ORD-2024-1890", customer: "Johan Svensson", date: "2024-04-22", total: 895, status: "Skickad", items: 1 },
  { id: "ORD-2024-1889", customer: "Anna Berg", date: "2024-04-21", total: 3540, status: "Behandlas", items: 3 },
  { id: "ORD-2024-1888", customer: "Erik Karlsson", date: "2024-04-21", total: 199, status: "Levererad", items: 1 },
  { id: "ORD-2024-1887", customer: "Sofia Nilsson", date: "2024-04-20", total: 1844, status: "Skickad", items: 2 },
  { id: "ORD-2024-1886", customer: "Mikael Johansson", date: "2024-04-20", total: 648, status: "Levererad", items: 2 },
];

const CUSTOMERS = [
  { id: "C-0091", name: "Maria Lindqvist", email: "maria.l@example.com", orders: 7, spent: 12_490, since: "2022-08" },
  { id: "C-0088", name: "Johan Svensson", email: "jsvensson@example.com", orders: 3, spent: 3_285, since: "2023-11" },
  { id: "C-0087", name: "Anna Berg", email: "anna.berg@example.com", orders: 12, spent: 19_740, since: "2021-05" },
  { id: "C-0082", name: "Erik Karlsson", email: "e.karlsson@example.com", orders: 2, spent: 1_494, since: "2024-02" },
  { id: "C-0079", name: "Sofia Nilsson", email: "s.nilsson@example.com", orders: 5, spent: 7_299, since: "2023-03" },
];

const CATEGORIES = ["Alla", "Skor", "Kläder", "Tillbehör", "Yoga", "Styrketräning", "Elektronik"];

const STATUS_COLOR: Record<string, string> = {
  Levererad: "bg-green-100 text-green-700",
  Skickad: "bg-blue-100 text-blue-700",
  Behandlas: "bg-yellow-100 text-yellow-700",
};

export default function WebshopDemo() {
  const [tab, setTab] = useState<"products" | "orders" | "customers" | "dashboard">("dashboard");
  const [category, setCategory] = useState("Alla");
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = category === "Alla" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
    setCartOpen(true);
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const TABS = [
    { id: "dashboard", label: "Översikt" },
    { id: "products", label: "Produkter" },
    { id: "orders", label: "Ordrar" },
    { id: "customers", label: "Kunder" },
  ] as const;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Simulated admin bar */}
      <div className="bg-zinc-900 text-white flex items-center justify-between px-5 py-3 text-sm">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-white">⚡ SportGear AB</span>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`transition-colors ${tab === t.id ? "text-white font-medium" : "text-zinc-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCartOpen(!cartOpen)}
            className="relative flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <span className="text-zinc-400 text-xs">info@gregmoto.se</span>
        </div>
      </div>

      {/* Cart panel */}
      {cartOpen && (
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Varukorg ({cartCount} artiklar)</h3>
            <button onClick={() => setCartOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Stäng</button>
          </div>
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400">Varukorgen är tom</p>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.product.image} {item.product.name} × {item.qty}</span>
                    <span className="font-medium">{(item.product.price * item.qty).toLocaleString("sv-SE")} kr</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-blue-200 pt-3">
                <span className="font-semibold text-gray-900">Totalt: {cartTotal.toLocaleString("sv-SE")} kr</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCart([])} className="text-xs text-gray-400 hover:text-gray-600">Töm</button>
                  <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-default">
                    Checkout (demo)
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Dashboard */}
        {tab === "dashboard" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Översikt — April 2024</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Försäljning (månad)", value: "147 820 kr", trend: "+12% vs mars", up: true },
                { label: "Ordrar (månad)", value: "218", trend: "+8% vs mars", up: true },
                { label: "Snittordervärde", value: "678 kr", trend: "+4% vs mars", up: true },
                { label: "Lagervärde", value: "892 400 kr", trend: "3 produkter lågt lager", up: false },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs mt-0.5 ${stat.up ? "text-green-600" : "text-orange-600"}`}>{stat.trend}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Senaste ordrar</h3>
                <div className="space-y-2">
                  {ORDERS.slice(0, 4).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{o.customer}</p>
                        <p className="text-xs text-gray-400">{o.id} · {o.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>{o.status}</span>
                        <span className="text-sm font-medium text-gray-900">{o.total.toLocaleString("sv-SE")} kr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Låglagernivå — åtgärd behövs</h3>
                <div className="space-y-2">
                  {PRODUCTS.filter(p => p.stock <= 9).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.image}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock <= 5 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.stock} kvar
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Produkter ({filtered.length})</h2>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      category === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 flex items-center justify-center py-6 text-4xl">
                    {p.image}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{p.category}</p>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{p.sku}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-900">{p.price.toLocaleString("sv-SE")} kr</span>
                        {p.compareAt && (
                          <span className="text-xs text-gray-400 line-through ml-1">{p.compareAt.toLocaleString("sv-SE")}</span>
                        )}
                      </div>
                      <span className={`text-xs ${p.stock <= 5 ? "text-red-600 font-medium" : "text-gray-400"}`}>
                        {p.stock} st
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.stock === 0}
                      className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      + Lägg i korg
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Ordrar</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-3 font-medium">Order-ID</th>
                  <th className="text-left pb-3 font-medium">Kund</th>
                  <th className="text-left pb-3 font-medium">Datum</th>
                  <th className="text-left pb-3 font-medium">Artiklar</th>
                  <th className="text-right pb-3 font-medium">Summa</th>
                  <th className="text-right pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ORDERS.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-blue-600">{o.id}</td>
                    <td className="py-3 font-medium text-gray-900">{o.customer}</td>
                    <td className="py-3 text-gray-500">{o.date}</td>
                    <td className="py-3 text-gray-500">{o.items} art.</td>
                    <td className="py-3 text-right font-medium">{o.total.toLocaleString("sv-SE")} kr</td>
                    <td className="py-3 text-right">
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

        {/* Customers */}
        {tab === "customers" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Kunder</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-3 font-medium">Kund</th>
                  <th className="text-left pb-3 font-medium">E-post</th>
                  <th className="text-right pb-3 font-medium">Ordrar</th>
                  <th className="text-right pb-3 font-medium">Totalköp</th>
                  <th className="text-right pb-3 font-medium">Kund sedan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CUSTOMERS.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">{c.email}</td>
                    <td className="py-3 text-right">{c.orders}</td>
                    <td className="py-3 text-right font-medium">{c.spent.toLocaleString("sv-SE")} kr</td>
                    <td className="py-3 text-right text-gray-500">{c.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demo footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400">
        <span>Demo-data · Återställs varje natt · Inga riktiga transaktioner</span>
        <span>ShopMan v1.0 · Demo A (Webshop)</span>
      </div>
    </div>
  );
}
