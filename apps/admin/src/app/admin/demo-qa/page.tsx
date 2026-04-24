"use client";

import { useState } from "react";

type Checkpoint = { label: string };
type Section = { id: string; title: string; checkpoints: Checkpoint[] };

const SECTIONS: Section[] = [
  {
    id: "demo-a",
    title: "Demo A — Enkel webbutik",
    checkpoints: [
      // Routing & data loading
      { label: "Produktsidan laddar med korrekt data (8 produkter visas)" },
      { label: "URL-routing: /demo/webshop öppnas utan fel (404/500)" },
      // Category pages
      { label: "Kategorifiltret fungerar — filtrera på 'Skor' visar rätt produkter" },
      { label: "Kategorier listas korrekt i navigationen (Skor, Kläder, Yoga, Styrketräning, Elektronik)" },
      // Product pages
      { label: "Klick på produkt öppnar produktkortet med korrekt namn, pris och lager" },
      { label: "Jämförpriset visas korrekt med genomstrykning där det finns" },
      // Search
      { label: "Sökning: fritext-sök 'löparskor' returnerar relevanta produkter" },
      { label: "Sökning: sök på SKU (SHOE-X400-42) hittar rätt produkt" },
      { label: "Sökning: tomt sök returnerar alla produkter" },
      // Orders & customers
      { label: "Ordertabellen laddas och visar 18 orders med korrekt status" },
      { label: "Kundtabellen laddas och visar 6 kunder med korrekt butiksscope" },
      // Dashboard
      { label: "Dashboard-KPI:er visar korrekt data (omsättning, ordrar, AOV)" },
      { label: "Låglagerprodukter visas i varningssektion (GPS-klocka, Hantlar)" },
      // Read-only
      { label: "Skrivskyddsbanner syns på sidan (gul/amber, sticky)" },
      { label: "API: POST /api/products returnerar 403 för demo-kontot" },
      { label: "API: PATCH /api/orders/{id} returnerar 403 för demo-kontot" },
    ],
  },
  {
    id: "demo-b",
    title: "Demo B — Multishop",
    checkpoints: [
      // Routing
      { label: "URL-routing: /demo/multishop öppnas utan fel" },
      // Shop switcher / scoping
      { label: "Butiksväxlaren visar 3 butiker (NordicSport, YogaStudio, GymWarehouse)" },
      { label: "Byta butik uppdaterar produktlistan till rätt scope" },
      { label: "Byta butik uppdaterar orderlistan till rätt scope" },
      { label: "Produkter från butik A syns INTE i butik B (korrekt isolering)" },
      // Categories
      { label: "Kategori 'Yoga' visas i YogaStudio-butiken" },
      { label: "Kategori 'Styrka' visas i GymWarehouse-butiken" },
      // Inventory
      { label: "Delat lager-fliken visar per-butiksallokering" },
      { label: "Lagerstatus är korrekt (inventoryQuantity ≥ 0 för alla produkter)" },
      // Orders
      { label: "Ordrar för GymWarehouse scopas korrekt (0 läcker till NordicSport)" },
      // Read-only
      { label: "Skrivskyddsbanner syns" },
      { label: "API: POST /api/shops/{id}/products returnerar 403" },
    ],
  },
  {
    id: "demo-c",
    title: "Demo C — Handelslösning för flera butiker",
    checkpoints: [
      // Routing
      { label: "URL-routing: /demo/marketplace öppnas utan fel" },
      // Platform view
      { label: "Plattformsvyn visar 4 butikskonton (Vintage, Eko, Tech, BarnLeksaker)" },
      { label: "Klick på 'Visa konto' zoomar in på kontot" },
      // Scoping / isolation
      { label: "Produktlistan är isolerad per konto — inga produkter läcker" },
      { label: "Ordrar är isolerade per konto" },
      { label: "Kundregister är isolerat per konto" },
      // Product pages
      { label: "Produktsidan för TechNord visar USB-C Hub och Tangentbord" },
      { label: "Produktsidan för BarnLeksaker visar Träleksaker och Pussel" },
      // Navigation
      { label: "\"Tillbaka till plattformsvyn\" fungerar" },
      { label: "Kontoinformation visar korrekt plan/slug/status" },
      // Read-only
      { label: "Skrivskyddsbanner syns" },
      { label: "API: DELETE /api/products/{id} returnerar 403 för alla demo-konton" },
    ],
  },
  {
    id: "role-separation",
    title: "Rollseparation — gäller alla demos",
    checkpoints: [
      { label: "Demo-inloggning (demo-webshop@shopman.dev) omdirigeras till /admin" },
      { label: "Demo-inloggning kan INTE komma åt /platform-admin" },
      { label: "Demo-inloggning kan INTE komma åt /vendor-portalen för andra konton" },
      { label: "Platform super admin (info@gregmoto.se) KAN komma åt alla demo-konton" },
      { label: "Platform super admin KAN trigga demo_reseed via Jobs-panelen" },
      { label: "Platform super admin KAN göra skrivoperationer på demo-konton (bypass)" },
    ],
  },
  {
    id: "global",
    title: "Globalt — gäller alla demos",
    checkpoints: [
      { label: "Demolänkar fungerar från /demo-sidan (alla 3 kort → rätt slug)" },
      { label: "Demo-data återställs via seed-script (verifiera via Jobs-panelen → demo_reseed)" },
      { label: "Nattlig cron registrerad (02:00 UTC) — synlig i BullMQ/Redis" },
      { label: "\"Boka personlig demo\"-länken pekar på /book-demo" },
      { label: "\"Starta gratis test\"-länken pekar på /trial" },
      { label: "Alla 3 demos har is_demo = TRUE i store_accounts-tabellen" },
      { label: "Produkter har category_id (inte ren textkategori) — FK fungerar" },
      { label: "Produkter har brand_id där tillämpligt" },
      { label: "Ordrar har korrekt order_number-format (ORD-xxxxx)" },
    ],
  },
];

// These link to the marketing site's demo pages.
// NEXT_PUBLIC_MARKETING_URL must be set in the admin app's .env.
// Falls back to localhost:3002 for local development.
const MARKETING_URL = process.env["NEXT_PUBLIC_MARKETING_URL"] ?? "http://localhost:3002";

const DEMO_LINKS = [
  { label: "Öppna Demo A — Webshop", href: `${MARKETING_URL}/demo/webshop` },
  { label: "Öppna Demo B — Multishop", href: `${MARKETING_URL}/demo/multishop` },
  { label: "Öppna Demo C — Marketplace", href: `${MARKETING_URL}/demo/marketplace` },
];

type CheckState = Record<string, boolean[]>;

function buildInitial(): CheckState {
  const state: CheckState = {};
  for (const s of SECTIONS) {
    state[s.id] = s.checkpoints.map(() => false);
  }
  return state;
}

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000";

export default function DemoQAPage() {
  const [checks, setChecks] = useState<CheckState>(buildInitial);
  const [reseedState, setReseedState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [reseedMsg, setReseedMsg] = useState("");

  function toggle(sectionId: string, index: number) {
    setChecks((prev) => {
      const arr = [...(prev[sectionId] ?? [])];
      arr[index] = !arr[index];
      return { ...prev, [sectionId]: arr };
    });
  }

  function reset(sectionId: string) {
    setChecks((prev) => ({
      ...prev,
      [sectionId]: SECTIONS.find((s) => s.id === sectionId)!.checkpoints.map(() => false),
    }));
  }

  async function triggerReseed() {
    setReseedState("loading");
    setReseedMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/demo-reseed`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setReseedState("success");
      setReseedMsg("Demo-återställning köad. Klar om ~30 sekunder. Kontrollera Jobs-panelen.");
    } catch (err) {
      setReseedState("error");
      setReseedMsg(err instanceof Error ? err.message : "Okänt fel");
    }
  }

  const totalAll = SECTIONS.reduce((sum, s) => sum + s.checkpoints.length, 0);
  const doneAll = SECTIONS.reduce((sum, s) => sum + (checks[s.id] ?? []).filter(Boolean).length, 0);
  const globalPct = Math.round((doneAll / totalAll) * 100);

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Demo QA — Valideringschecklista
          </h1>
          <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
            Validera att demos fungerar korrekt. Kryssa för varje kontrollpunkt manuellt.
          </p>
        </div>
        {/* Manual reseed trigger */}
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={triggerReseed}
            disabled={reseedState === "loading"}
            className="flex items-center gap-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {reseedState === "loading" ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Återställer…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7a6 6 0 0012 0A6 6 0 001 7zm6-4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Återställ demodata nu
              </>
            )}
          </button>
          {reseedMsg && (
            <p className={`text-xs ${reseedState === "error" ? "text-red-600" : "text-green-700"}`}>
              {reseedMsg}
            </p>
          )}
        </div>
      </div>

      {/* Global progress card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-zinc-700">Totalt godkänt</span>
          <span className="text-sm font-bold text-zinc-900">
            {doneAll} / {totalAll} kontrollpunkter
          </span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${globalPct}%` }}
          />
        </div>
        <div className="mt-2 text-right">
          <span className="text-xs text-zinc-400">{globalPct}% klart</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const sectionChecks = checks[section.id] ?? [];
          const done = sectionChecks.filter(Boolean).length;
          const total = section.checkpoints.length;
          const pct = Math.round((done / total) * 100);
          const allDone = done === total;

          return (
            <div key={section.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>
                  {allDone ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Godkänd
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                      Ej verifierad
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">
                    {done}/{total} kontrollpunkter godkända
                  </span>
                  <button
                    onClick={() => reset(section.id)}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors underline underline-offset-2"
                  >
                    Återställ
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 py-2 bg-zinc-50 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-10 text-right">{pct}%</span>
                </div>
              </div>

              {/* Checkpoints */}
              <ul className="divide-y divide-zinc-50">
                {section.checkpoints.map((cp, i) => {
                  const checked = sectionChecks[i];
                  return (
                    <li key={i}>
                      <label className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-zinc-50 transition-colors">
                        <div className="relative flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(section.id, i)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
                              checked
                                ? "bg-green-500 border-green-500"
                                : "bg-white border-zinc-300 hover:border-zinc-400"
                            }`}
                          >
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm leading-relaxed transition-colors ${checked ? "text-zinc-400 line-through" : "text-zinc-700"}`}>
                          {cp.label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Open demos */}
      <div className="mt-10 bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900">Öppna demo (marketing site)</h2>
          <span className="text-xs text-zinc-400">{MARKETING_URL}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {DEMO_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {link.label}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
