"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: "", color: "" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  const score = [pw.length >= 12, hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (score <= 2) return { level: 1, label: "Svagt", color: "bg-red-500" };
  if (score <= 3) return { level: 2, label: "Okej", color: "bg-yellow-400" };
  return { level: 3, label: "Starkt", color: "bg-green-500" };
}

// ── types ─────────────────────────────────────────────────────────────────────

type StoreMode = "WEBSHOP" | "MULTISHOP" | "MARKETPLACE" | "RESELLER_PANEL";

interface Step1Data {
  email: string;
  password: string;
  confirmPassword: string;
}

interface Step2Data {
  storeName: string;
  subdomain: string;
  mode: StoreMode;
}

interface SignupResult {
  autoActivated?: boolean;
  status?: string;
}

const STORE_MODES: { value: StoreMode; emoji: string; title: string; desc: string }[] = [
  { value: "WEBSHOP", emoji: "🛒", title: "Webshop", desc: "En butik, produktkatalog och kassa" },
  { value: "MULTISHOP", emoji: "🏪", title: "MultiShop", desc: "Flera varumärkesbutiker, delat lager" },
  { value: "MARKETPLACE", emoji: "🌐", title: "Marketplace", desc: "Fristående butikskonton på en plattform" },
  { value: "RESELLER_PANEL", emoji: "🔄", title: "Återförsäljare", desc: "Hantera och sälja vidare till slutkunder" },
];

// ── sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
              n < step
                ? "bg-blue-600 text-white"
                : n === step
                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {n < step ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              n
            )}
          </div>
          {n < 3 && (
            <div className={`w-12 h-0.5 ${n < step ? "bg-blue-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function StartPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step1Errors, setStep1Errors] = useState<Partial<Record<keyof Step1Data, string>>>({});

  // step 2
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainManual, setSubdomainManual] = useState(false);
  const [mode, setMode] = useState<StoreMode>("WEBSHOP");
  const [step2Errors, setStep2Errors] = useState<Partial<Record<keyof Step2Data | "general", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // step 3 result
  const [result, setResult] = useState<SignupResult | null>(null);

  // auto-redirect on auto-activated
  useEffect(() => {
    if (result?.autoActivated) {
      const timer = setTimeout(() => {
        window.location.href = `${ADMIN_URL}/admin/setup`;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  // auto-populate subdomain from storeName
  useEffect(() => {
    if (!subdomainManual) {
      setSubdomain(slugify(storeName));
    }
  }, [storeName, subdomainManual]);

  const pwStrength = passwordStrength(password);

  // ── step 1 validation ──
  function validateStep1(): boolean {
    const errs: typeof step1Errors = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Ange en giltig e-postadress.";
    }
    if (password.length < 12) {
      errs.password = "Lösenordet måste vara minst 12 tecken.";
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = "Lösenorden matchar inte.";
    }
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── step 2 validation ──
  function validateStep2(): boolean {
    const errs: Partial<Record<keyof Step2Data, string>> = {};
    if (!storeName || storeName.trim().length < 2 || storeName.trim().length > 255) {
      errs.storeName = "Butiksnamnet måste vara mellan 2 och 255 tecken.";
    }
    if (!subdomain || subdomain.length < 2) {
      errs.subdomain = "Subdomänen måste vara minst 2 tecken.";
    }
    setStep2Errors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── submit ──
  async function handleSubmit() {
    if (!validateStep2()) return;
    setSubmitting(true);
    setStep2Errors({});
    try {
      const res = await fetch(`${API}/api/public/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          storeName: storeName.trim(),
          storeSlug: subdomain,
          mode,
          subdomain,
        }),
      });

      if (res.status === 409) {
        setStep2Errors({ subdomain: "Det subdomännamnet är redan taget. Välj ett annat." });
        return;
      }
      if (res.status === 422) {
        const body = await res.json().catch(() => ({}));
        const msgs = body?.errors ?? body?.message ?? "Ogiltiga uppgifter.";
        setStep2Errors({ general: typeof msgs === "string" ? msgs : JSON.stringify(msgs) });
        return;
      }
      if (!res.ok) {
        setStep2Errors({ general: "Något gick fel. Försök igen." });
        return;
      }

      const data: SignupResult = await res.json().catch(() => ({}));
      setResult(data);
      setStep(3);
    } catch {
      setStep2Errors({ general: "Något gick fel. Försök igen." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* top bar */}
      <header className="w-full px-6 py-4 flex items-center relative">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5 z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          tillbaka till ShopMan.se
        </Link>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 font-bold text-gray-900 text-lg tracking-tight">
          <span className="text-blue-600">⚡</span> ShopMan
        </div>
      </header>

      {/* main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 p-8">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                <ProgressBar step={1} />
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Kontouppgifter</h1>
                <p className="text-sm text-gray-500 mb-6">Steg 1 av 3 — Skapa ditt ShopMan-konto</p>

                <div className="flex flex-col gap-5">
                  <Field label="E-post" error={step1Errors.email}>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="du@exempel.se"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        step1Errors.email ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
                      }`}
                    />
                  </Field>

                  <Field label="Lösenord" error={step1Errors.password}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minst 12 tecken"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        step1Errors.password ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
                      }`}
                    />
                    {password.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                            style={{ width: `${(pwStrength.level / 3) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          pwStrength.level === 1 ? "text-red-500" :
                          pwStrength.level === 2 ? "text-yellow-500" : "text-green-600"
                        }`}>
                          {pwStrength.label}
                        </span>
                      </div>
                    )}
                  </Field>

                  <Field label="Bekräfta lösenord" error={step1Errors.confirmPassword}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Upprepa lösenordet"
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        step1Errors.confirmPassword ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
                      }`}
                    />
                  </Field>
                </div>

                <button
                  onClick={() => { if (validateStep1()) setStep(2); }}
                  className="mt-7 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  Nästa
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                <ProgressBar step={2} />
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Din butik</h1>
                <p className="text-sm text-gray-500 mb-6">Steg 2 av 3 — Konfigurera din butik</p>

                <div className="flex flex-col gap-5">
                  <Field label="Butiksnamn" error={step2Errors.storeName}>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Min Butik AB"
                      maxLength={255}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        step2Errors.storeName ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
                      }`}
                    />
                  </Field>

                  <Field label="Subdomän" error={step2Errors.subdomain}>
                    <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(e) => {
                          setSubdomainManual(true);
                          setSubdomain(slugify(e.target.value));
                        }}
                        placeholder="min-butik"
                        maxLength={63}
                        className="flex-1 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none bg-white"
                      />
                      <span className="flex items-center px-3 bg-gray-50 border-l border-gray-300 text-sm text-gray-500 font-medium whitespace-nowrap">
                        .shopman.se
                      </span>
                    </div>
                    {subdomain && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Förhandsvisning:{" "}
                        <span className="text-blue-600 font-medium">{subdomain}.shopman.se</span>
                      </p>
                    )}
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700">Butikstyp</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {STORE_MODES.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMode(m.value)}
                          className={`rounded-xl border-2 p-3.5 text-left cursor-pointer transition-all duration-150 ${
                            mode === m.value
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="text-2xl mb-1.5">{m.emoji}</div>
                          <div className={`text-sm font-semibold ${mode === m.value ? "text-blue-700" : "text-gray-800"}`}>
                            {m.title}
                          </div>
                          <div className={`text-xs mt-0.5 leading-snug ${mode === m.value ? "text-blue-600" : "text-gray-500"}`}>
                            {m.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {step2Errors.general && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {step2Errors.general}
                    </div>
                  )}
                </div>

                <div className="mt-7 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Tillbaka
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Skapar butik…
                      </>
                    ) : (
                      "Skapa butik"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && result && (
              <>
                <ProgressBar step={3} />

                {result.autoActivated ? (
                  <div className="flex flex-col items-center text-center py-4">
                    {/* animated green checkmark */}
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 animate-[scale-in_0.4s_ease-out]">
                      <svg
                        className="w-10 h-10 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ animation: "dash 0.5s ease-out 0.1s both" }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Din butik är redo! 🎉</h2>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Ditt konto är aktiverat. Vi tar dig till installationsguiden.
                    </p>
                    <div className="mt-5 flex items-center gap-2 text-sm text-gray-400">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Omdirigerar…
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5 text-4xl">
                      ⏳
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Ansökan mottagen!</h2>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Vi granskar din butik och meddelar dig på{" "}
                      <span className="font-medium text-gray-700">{email}</span> inom 1–2 arbetsdagar.
                    </p>
                    <a
                      href={`${ADMIN_URL}/login`}
                      className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Gå till inloggning
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          {/* bottom link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Har du redan ett konto?{" "}
            <a
              href={`${ADMIN_URL}/login`}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Logga in →
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
