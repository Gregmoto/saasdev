"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type StepKey = "domain" | "theme" | "categories" | "product" | "payments" | "publish";

interface Step {
  key: StepKey;
  label: string;
}

const STEPS: Step[] = [
  { key: "domain", label: "Verifiera domän" },
  { key: "theme", label: "Välj tema" },
  { key: "categories", label: "Skapa kategorier" },
  { key: "product", label: "Lägg till produkt" },
  { key: "payments", label: "Konfigurera betalning" },
  { key: "publish", label: "Publicera butiken" },
];

const SUGGESTED_CATEGORIES = ["Kläder", "Elektronik", "Böcker", "Sport", "Hem & Inredning"];

const THEMES = [
  {
    key: "minimal",
    name: "Minimal",
    description: "Rent vitt, minimala kanter",
    preview: (
      <div className="w-full h-16 bg-white border border-gray-200 rounded flex flex-col gap-1 p-2">
        <div className="h-1.5 w-1/2 bg-gray-200 rounded" />
        <div className="h-1 w-3/4 bg-gray-100 rounded" />
        <div className="h-1 w-2/3 bg-gray-100 rounded" />
      </div>
    ),
  },
  {
    key: "modern",
    name: "Modern",
    description: "Mörkt sidhuvud, fet typografi",
    preview: (
      <div className="w-full h-16 bg-white border border-gray-200 rounded flex flex-col overflow-hidden">
        <div className="h-5 bg-zinc-900 flex items-center px-2 gap-1">
          <div className="h-1.5 w-8 bg-zinc-500 rounded" />
          <div className="h-1.5 w-6 bg-zinc-500 rounded" />
        </div>
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          <div className="h-2 w-1/2 bg-zinc-800 rounded" />
          <div className="h-1 w-3/4 bg-zinc-200 rounded" />
        </div>
      </div>
    ),
  },
  {
    key: "classic",
    name: "Classic",
    description: "Varma beige toner",
    preview: (
      <div className="w-full h-16 bg-amber-50 border border-amber-200 rounded flex flex-col gap-1 p-2">
        <div className="h-1.5 w-1/2 bg-amber-300 rounded" />
        <div className="h-1 w-3/4 bg-amber-200 rounded" />
        <div className="h-1 w-2/3 bg-amber-100 rounded" />
      </div>
    ),
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepKey>("domain");
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [storeSlug, setStoreSlug] = useState("yourstorename");

  // Theme step state
  const [selectedTheme, setSelectedTheme] = useState("minimal");

  // Categories step state
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");

  // Product step state
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDesc, setProductDesc] = useState("");

  // Loading states
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/store/setup-wizard`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.isComplete) {
          router.push("/admin/dashboard");
          return;
        }
        if (data?.completedSteps && Array.isArray(data.completedSteps)) {
          setCompletedSteps(new Set(data.completedSteps as StepKey[]));
        }
        if (data?.storeSlug) {
          setStoreSlug(data.storeSlug);
        }
      })
      .catch(() => {
        // Allow local progression on error
      });
  }, [router]);

  async function markComplete(step: StepKey) {
    const next = completedSteps;
    next.add(step);
    setCompletedSteps(new Set(next));

    // Sync with server (optimistic — don't block on failure)
    fetch(`${API}/api/store/setup-wizard`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    }).catch(() => {});

    // Advance to next uncompleted step
    const idx = STEPS.findIndex((s) => s.key === step);
    const nextStep = STEPS.slice(idx + 1).find((s) => !next.has(s.key));
    if (nextStep) {
      setCurrentStep(nextStep.key);
    } else {
      setCurrentStep("publish");
    }
  }

  function addCategory(cat: string) {
    const trimmed = cat.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
    }
    setCategoryInput("");
  }

  function removeCategory(cat: string) {
    setCategories(categories.filter((c) => c !== cat));
  }

  async function saveCategories() {
    setSaving(true);
    try {
      await Promise.all(
        categories.map((name) =>
          fetch(`${API}/api/products/categories`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          })
        )
      );
    } catch { /* optimistic */ }
    setSaving(false);
    await markComplete("categories");
  }

  async function saveProduct() {
    setSaving(true);
    try {
      await fetch(`${API}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          priceCents: Math.round(parseFloat(productPrice) * 100),
          description: productDesc || undefined,
          status: "draft",
        }),
      });
    } catch { /* optimistic */ }
    setSaving(false);
    await markComplete("product");
  }

  async function publishStore() {
    await markComplete("publish");
    router.push("/admin/dashboard");
  }

  const completedCount = completedSteps.size;
  const totalSteps = STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Left sidebar — checklist */}
      <aside className="w-72 flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Kom igång med ShopMan</h2>
        <div className="h-px bg-zinc-200 mb-4" />

        <ul className="space-y-1 flex-1">
          {STEPS.map((step) => {
            const isComplete = completedSteps.has(step.key);
            const isCurrent = currentStep === step.key;
            return (
              <li key={step.key}>
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={[
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                    isCurrent
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : isComplete
                      ? "text-zinc-400"
                      : "text-zinc-600 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  <span className="text-base flex-shrink-0">
                    {isComplete ? (
                      <span className="text-green-500">☑</span>
                    ) : (
                      <span className="text-zinc-300">☐</span>
                    )}
                  </span>
                  <span className={isComplete ? "line-through" : undefined}>
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Progress */}
        <div className="mt-6">
          <div className="h-px bg-zinc-200 mb-4" />
          <p className="text-xs text-zinc-500 mb-2">
            {completedCount} / {totalSteps} klart
          </p>
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">{progressPct}%</p>
        </div>
      </aside>

      {/* Right content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">

          {/* Step: domain */}
          {currentStep === "domain" && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Verifiera domän</h1>
              <p className="text-zinc-500 mb-6">
                Din butik är tillgänglig på{" "}
                <span className="font-medium text-zinc-700">{storeSlug}.shopman.se</span>. Du kan
                lägga till en anpassad domän senare från Inställningar.
              </p>

              <div className="bg-zinc-100 rounded-xl px-5 py-4 mb-8 font-mono text-zinc-800 text-lg border border-zinc-200">
                {storeSlug}.shopman.se
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => markComplete("domain")}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Markera som klar
                </button>
                <button
                  onClick={() => markComplete("domain")}
                  className="text-sm text-zinc-400 hover:text-zinc-600"
                >
                  Hoppa över →
                </button>
              </div>
            </div>
          )}

          {/* Step: theme */}
          {currentStep === "theme" && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Välj tema</h1>
              <p className="text-zinc-500 mb-6">
                Välj ett utseende för din butik. Du kan byta tema när som helst.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {THEMES.map((theme) => {
                  const isSelected = selectedTheme === theme.key;
                  return (
                    <button
                      key={theme.key}
                      onClick={() => setSelectedTheme(theme.key)}
                      className={[
                        "rounded-xl border-2 p-3 text-left transition-all",
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-zinc-200 hover:border-zinc-300",
                      ].join(" ")}
                    >
                      <div className="mb-2">{theme.preview}</div>
                      <p className="text-sm font-semibold text-zinc-900">{theme.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{theme.description}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => markComplete("theme")}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Spara tema
              </button>
            </div>
          )}

          {/* Step: categories */}
          {currentStep === "categories" && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Skapa kategorier</h1>
              <p className="text-zinc-500 mb-6">
                Organisera dina produkter med kategorier.
              </p>

              {/* Suggested */}
              <div className="mb-4">
                <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Förslag</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => addCategory(cat)}
                      disabled={categories.includes(cat)}
                      className={[
                        "px-3 py-1 rounded-full text-sm border transition-colors",
                        categories.includes(cat)
                          ? "border-blue-200 bg-blue-50 text-blue-400 cursor-default"
                          : "border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-600",
                      ].join(" ")}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory(categoryInput)}
                  placeholder="Lägg till kategori…"
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  onClick={() => addCategory(categoryInput)}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                >
                  Lägg till
                </button>
              </div>

              {/* Added categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 rounded-full text-sm text-zinc-700"
                    >
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        className="text-zinc-400 hover:text-zinc-700 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={saveCategories}
                  disabled={saving || categories.length === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Sparar…" : "Spara kategorier"}
                </button>
                <button
                  onClick={() => markComplete("categories")}
                  className="text-sm text-zinc-400 hover:text-zinc-600"
                >
                  Hoppa över →
                </button>
              </div>
            </div>
          )}

          {/* Step: product */}
          {currentStep === "product" && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Lägg till produkt</h1>
              <p className="text-zinc-500 mb-6">
                Lägg till din första produkt. Den sparas som ett utkast.
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Produktnamn
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="T.ex. Vit t-shirt"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Pris (kr)
                  </label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="299"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Beskrivning{" "}
                    <span className="text-zinc-400 font-normal">(valfritt)</span>
                  </label>
                  <textarea
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    placeholder="Kort produktbeskrivning…"
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={saveProduct}
                  disabled={saving || !productName || !productPrice}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Sparar…" : "Spara produkt"}
                </button>
                <button
                  onClick={() => markComplete("product")}
                  className="text-sm text-zinc-400 hover:text-zinc-600"
                >
                  Hoppa över →
                </button>
              </div>
            </div>
          )}

          {/* Step: payments */}
          {currentStep === "payments" && (
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Konfigurera betalning</h1>
              <p className="text-zinc-500 mb-6">
                Betalningsleverantörer konfigureras under Inställningar → Betalningar. Du kan
                fortsätta utan betalningar nu.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Klarna */}
                <div className="border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">💳</span>
                    <span className="font-semibold text-zinc-900">Klarna</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">Betalningar via Klarna Checkout</p>
                  <button
                    disabled
                    className="w-full px-3 py-2 border border-zinc-200 text-zinc-400 rounded-lg text-sm cursor-not-allowed"
                    title="Konfigureras i Inställningar"
                  >
                    Konfigureras i Inställningar
                  </button>
                </div>

                {/* Swish */}
                <div className="border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📱</span>
                    <span className="font-semibold text-zinc-900">Swish</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">Swish för e-handel</p>
                  <button
                    disabled
                    className="w-full px-3 py-2 border border-zinc-200 text-zinc-400 rounded-lg text-sm cursor-not-allowed"
                    title="Konfigureras i Inställningar"
                  >
                    Konfigureras i Inställningar
                  </button>
                </div>
              </div>

              <button
                onClick={() => markComplete("payments")}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Fortsätt
              </button>
            </div>
          )}

          {/* Step: publish */}
          {currentStep === "publish" && (
            <div>
              {completedSteps.has("publish") ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🎉</div>
                  <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                    Grattis! Din butik är nu aktiv.
                  </h1>
                  <p className="text-zinc-500">Omdirigerar till dashboarden…</p>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-zinc-900 mb-2">Publicera butiken</h1>
                  <p className="text-zinc-500 mb-6">
                    Din butik är redo att lanseras! 🎉 Granska dina inställningar nedan.
                  </p>

                  {/* Summary checklist */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 mb-8">
                    <h2 className="text-sm font-semibold text-zinc-700 mb-3">Sammanfattning</h2>
                    <ul className="space-y-2">
                      {STEPS.filter((s) => s.key !== "publish").map((step) => {
                        const done = completedSteps.has(step.key);
                        return (
                          <li key={step.key} className="flex items-center gap-2 text-sm">
                            <span className={done ? "text-green-500" : "text-zinc-300"}>
                              {done ? "☑" : "☐"}
                            </span>
                            <span className={done ? "text-zinc-700" : "text-zinc-400"}>
                              {step.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <button
                    onClick={publishStore}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    Publicera butiken 🚀
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
