"use client";
import { useState, FormEvent, useEffect } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── UTM tracking ─────────────────────────────────────────────────────────────
function useUtm() {
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = params.get(key);
      if (v) u[key] = v;
    }
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

// ── CMS types ─────────────────────────────────────────────────────────────────
interface ContactInfoSection {
  type: "contact_info";
  title?: string;
  body?: string;
  address?: string;
  socialLinks?: { label: string; url: string }[];
}

interface CmsContactPage {
  sections?: ContactInfoSection[];
}

// ── Static fallback contact info ──────────────────────────────────────────────
const FALLBACK_INFO = {
  title: "Kontakta oss",
  subtext: "Vi svarar normalt inom en arbetsdag. Har du frågor om ShopMan — tveka inte.",
  items: [
    { icon: "📧", label: "hej@shopman.se" },
    { icon: "📞", label: "+46 8 123 456 78" },
    { icon: "🕐", label: "Mån–Fre 09:00–17:00" },
  ],
};

// ── Topic options ─────────────────────────────────────────────────────────────
const TOPIC_OPTIONS = [
  { value: "", label: "Välj ämne (valfritt)" },
  { value: "general", label: "Allmän fråga" },
  { value: "demo", label: "Boka demo" },
  { value: "pricing", label: "Priser & planer" },
  { value: "technical", label: "Teknisk support" },
  { value: "partnership", label: "Partnerskap" },
  { value: "billing", label: "Faktura & betalning" },
  { value: "other", label: "Övrigt" },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const utm = useUtm();
  const [cmsSection, setCmsSection] = useState<ContactInfoSection | null>(null);

  // Fetch CMS contact info on mount
  useEffect(() => {
    fetch(`${API}/api/cms/pages/contact?lang=sv`)
      .then((r) => r.ok ? r.json() as Promise<CmsContactPage> : Promise.reject())
      .then((data) => {
        const section = data.sections?.find((s) => s.type === "contact_info");
        if (section) setCmsSection(section);
      })
      .catch(() => {/* use fallback */});
  }, []);

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
          topic: data.topic as string || undefined,
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

  // Resolve info to display — CMS takes precedence, fallback otherwise
  const heading = cmsSection?.title ?? FALLBACK_INFO.title;
  const subtext = cmsSection?.body ?? FALLBACK_INFO.subtext;
  const infoItems = cmsSection ? [] : FALLBACK_INFO.items;
  const socialLinks = cmsSection?.socialLinks ?? [];
  const address = cmsSection?.address;

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Page heading (mobile) */}
        <div className="mb-10 md:hidden">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">{heading}</h1>
          <p className="text-stone-500">{subtext}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
          {/* ── Left column: contact info ───────────────────────────────── */}
          <div className="md:w-1/3 space-y-8">
            {/* Heading — hidden on mobile (shown above form area) */}
            <div className="hidden md:block">
              <h1 className="text-4xl font-bold text-stone-900 mb-3">{heading}</h1>
              <p className="text-stone-500 leading-relaxed">{subtext}</p>
            </div>

            {/* Contact items (fallback) */}
            {infoItems.length > 0 && (
              <ul className="space-y-4">
                {infoItems.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-stone-700 text-sm pt-0.5">{item.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Address from CMS */}
            {address && (
              <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {address}
              </div>
            )}

            {/* Social links from CMS */}
            {socialLinks.length > 0 && (
              <div className="flex flex-col gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {/* Decorative divider */}
            <div className="hidden md:block border-t border-stone-100 pt-6">
              <p className="text-xs text-stone-400 leading-relaxed">
                Alla svar hanteras av vårt team i Stockholm.
                Vi svarar normalt inom en arbetsdag.
              </p>
            </div>
          </div>

          {/* ── Right column: form ──────────────────────────────────────── */}
          <div className="md:w-2/3">
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-xl font-semibold text-stone-900">Tack — vi återkommer!</h2>
                <p className="text-stone-500 mt-2 text-sm">
                  Förvänta dig svar inom en arbetsdag.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5 bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
              >
                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Förnamn <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="firstName"
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Efternamn <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="lastName"
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    E-postadress <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Företag</label>
                  <input
                    name="company"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>

                {/* Topic selector */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Ämne</label>
                  <select
                    name="topic"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  >
                    {TOPIC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Meddelande <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? "Skickar…" : "Skicka meddelande"}
                </button>

                <p className="text-center text-xs text-stone-400">
                  Fält markerade med * är obligatoriska
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
