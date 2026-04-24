"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

function useUtm() {
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = params.get(key) ?? sessionStorage.getItem(key);
      if (v) u[key] = v;
    }
    setUtm(u);
  }, []);
  return utm;
}

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter", price: "599 kr/mån", desc: "Upp till 500 produkter, 1 butik" },
  { value: "growth", label: "Growth", price: "1 499 kr/mån", desc: "Upp till 5 000 produkter, 5 butiker" },
  { value: "enterprise", label: "Enterprise", price: "Kontakt", desc: "Obegränsat, dedikerad support" },
];

export default function TrialPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState("growth");
  const utm = useUtm();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const res = await fetch(`${API}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "trial",
          firstName: data.firstName as string,
          lastName: data.lastName as string,
          email: data.email as string,
          company: data.company as string,
          metadata: {
            plan,
            storeType: data.storeType as string,
            currentPlatform: data.currentPlatform as string,
          },
          utmSource: utm.utm_source,
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
          utmContent: utm.utm_content,
          utmTerm: utm.utm_term,
          referrer: document.referrer || undefined,
          landingPage: window.location.href,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setError(body.message ?? "Något gick fel. Försök igen.");
        return;
      }
      setSent(true);
    } catch {
      setError("Nätverksfel. Kontrollera din anslutning och försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full mb-5">
            🎁 14 dagars gratis testperiod
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Kom igång kostnadsfritt</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Testa ShopMan i 14 dagar utan kreditkort. Ingen bindningstid, avsluta när du vill.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Plan selector */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Välj plan</h2>
            <div className="space-y-3 mb-8">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlan(p.value)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    plan === p.value
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900">{p.label}</span>
                    <span className="text-sm font-medium text-blue-600">{p.price}</span>
                  </div>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </button>
              ))}
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Inkluderat i testperioden</p>
              {[
                "Alla funktioner i vald plan",
                "Import från Shopify/WooCommerce",
                "Fortnox-integration",
                "Support via e-post",
                "Inga kreditkortsuppgifter",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              Behöver du en genomgång innan?{" "}
              <Link href="/book-demo" className="text-blue-600 hover:underline">Boka en demo</Link>
            </p>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">🚀</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Förfrågan mottagen!</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Vi har tagit emot din förfrågan och aktiverar ditt konto inom kort.
                  Du får ett mejl med inloggningsuppgifter.
                </p>
                <Link href="/" className="text-sm text-blue-600 hover:underline">Tillbaka till startsidan</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
                <h2 className="font-semibold text-gray-900 text-lg">Dina uppgifter</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Förnamn *</label>
                    <input name="firstName" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Efternamn *</label>
                    <input name="lastName" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jobbmejl *</label>
                  <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                  <input name="company" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ av butik</label>
                  <select name="storeType" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">Välj…</option>
                    <option value="single">Enbutik</option>
                    <option value="multi">Flera butiker</option>
                    <option value="marketplace">Marknadsplats</option>
                    <option value="b2b">B2B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nuvarande plattform</label>
                  <select name="currentPlatform" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">Välj…</option>
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                    <option value="prestashop">PrestaShop</option>
                    <option value="magento">Magento</option>
                    <option value="new">Ny butik</option>
                    <option value="other">Annat</option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                  {loading ? "Skickar…" : "Starta 14 dagars test →"}
                </button>
                <p className="text-xs text-center text-gray-400">Inga kreditkortsuppgifter. Inga åtaganden.</p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
