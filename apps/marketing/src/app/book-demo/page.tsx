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

const BENEFITS = [
  "30 min genomgång anpassad för din bransch",
  "Live-demo av alla moduler du är intresserad av",
  "Svar på alla dina frågor direkt",
  "Ingen försäljningspress — vi visar, du bestämmer",
];

export default function BookDemoPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
          type: "demo",
          firstName: data.firstName as string,
          lastName: data.lastName as string,
          email: data.email as string,
          company: data.company as string,
          phone: data.phone as string,
          message: data.message as string,
          metadata: {
            preferredTime: data.preferredTime as string,
            storeSize: data.storeSize as string,
            interests: data.interests as string,
          },
          utmSource: utm.utm_source,
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
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
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: info */}
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
              📅 Kostnadsfri demo
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Boka en personlig demo</h1>
            <p className="text-gray-500 mb-8">
              Se ShopMan i aktion med ditt specifika användningsfall. En av våra produktspecialister
              visar exakt hur ShopMan kan lösa dina utmaningar.
            </p>

            <ul className="space-y-3 mb-10">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">{b}</span>
                </li>
              ))}
            </ul>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <p className="text-sm text-gray-500 mb-3">Vill du utforska på egen hand?</p>
              <Link href="/demo" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Testa den interaktiva demon istället →
              </Link>
            </div>
          </div>

          {/* Right: form */}
          <div>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Bokningsförfrågan mottagen!</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Vi återkommer inom en arbetsdag med en bekräftad tid.
                </p>
                <Link href="/" className="text-sm text-blue-600 hover:underline">Tillbaka till startsidan</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
                <h2 className="font-semibold text-gray-900 text-lg mb-1">Dina uppgifter</h2>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                    <input name="company" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input name="phone" type="tel" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antal produkter</label>
                  <select name="storeSize" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">Välj…</option>
                    <option value="under_100">Under 100</option>
                    <option value="100_500">100–500</option>
                    <option value="500_5000">500–5 000</option>
                    <option value="over_5000">Över 5 000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Önskat demofokus</label>
                  <select name="interests" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">Välj…</option>
                    <option value="all">Generell genomgång</option>
                    <option value="import">Import & migration</option>
                    <option value="inventory">Lagerhantering</option>
                    <option value="multi_store">Flera butiker</option>
                    <option value="marketplace">Marknadsplats</option>
                    <option value="integrations">Integrationer (Fortnox, Klarna)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Önskad tid</label>
                  <select name="preferredTime" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">Spelar ingen roll</option>
                    <option value="morning">Förmiddag (09:00–12:00)</option>
                    <option value="afternoon">Eftermiddag (13:00–16:00)</option>
                    <option value="late">Sen eftermiddag (16:00–18:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Något mer vi bör veta?</label>
                  <textarea name="message" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
                  {loading ? "Skickar…" : "Boka demo"}
                </button>
                <p className="text-xs text-center text-gray-400">Vi kontaktar dig inom en arbetsdag för att bekräfta tid.</p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
