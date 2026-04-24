"use client";
import { useState, FormEvent, useEffect } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

function useUtm() {
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = params.get(key);
      if (v) u[key] = v;
    }
    // Also try sessionStorage (set by landing page)
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      if (!u[key]) {
        const stored = sessionStorage.getItem(key);
        if (stored) u[key] = stored;
      }
    }
    setUtm(u);
  }, []);
  return utm;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const utm = useUtm();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch(`${API}/api/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          firstName: data.firstName as string,
          lastName: data.lastName as string,
          email: data.email as string,
          company: data.company as string,
          message: data.message as string,
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
      <main className="max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Kontakta oss</h1>
        <p className="text-gray-500 mb-10">Berätta om din butik så återkommer vi inom en arbetsdag.</p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-xl font-semibold text-gray-900">Tack — vi återkommer!</h2>
            <p className="text-gray-500 mt-1 text-sm">Förvänta dig svar inom en arbetsdag.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-2xl p-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Förnamn</label>
                <input name="firstName" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efternamn</label>
                <input name="lastName" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
              <input name="email" type="email" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
              <input name="company" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
              <textarea name="message" rows={4} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60">
              {loading ? "Skickar…" : "Skicka meddelande"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
