"use client";
import { useState, FormEvent } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // simulate
    setSent(true);
    setLoading(false);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Jobbmejl</label>
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
