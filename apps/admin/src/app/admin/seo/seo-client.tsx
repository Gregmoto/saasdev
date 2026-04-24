"use client";

import { useState } from "react";
import { Badge, Button, Alert } from "@saas-shop/ui";
import type { SeoSettings, SeoRedirect } from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Tab = "settings" | "redirects" | "export";

interface SeoClientProps {
  initialSettings: SeoSettings;
  initialRedirects: SeoRedirect[];
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab({
  initialSettings,
}: {
  initialSettings: SeoSettings;
}) {
  const [settings, setSettings] = useState<SeoSettings>({ ...initialSettings });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hreflang editor state
  const [hreflangEntries, setHreflangEntries] = useState<
    { lang: string; url: string }[]
  >(
    Object.entries(initialSettings.hreflangMap).map(([lang, url]) => ({
      lang,
      url,
    }))
  );

  // Robots.txt textarea
  const [robotsTxt, setRobotsTxt] = useState(
    initialSettings.robotsTxtRules.join("\n")
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const hreflangMap: Record<string, string> = {};
      for (const entry of hreflangEntries) {
        if (entry.lang.trim()) hreflangMap[entry.lang.trim()] = entry.url.trim();
      }
      const payload: SeoSettings = {
        ...settings,
        hreflangMap,
        robotsTxtRules: robotsTxt
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      };
      const res = await fetch(`${API}/api/seo/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparande");
    } finally {
      setSaving(false);
    }
  }

  function addHreflang() {
    setHreflangEntries((prev) => [...prev, { lang: "", url: "" }]);
  }

  function removeHreflang(i: number) {
    setHreflangEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Inställningar sparade!</Alert>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Kanonisk bas-URL
          </label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="https://din-butik.se"
            value={settings.canonicalBaseUrl}
            onChange={(e) =>
              setSettings((s) => ({ ...s, canonicalBaseUrl: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Hreflang-karta
          </label>
          <div className="space-y-2">
            {hreflangEntries.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="w-24 border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="sv"
                  value={entry.lang}
                  onChange={(e) => {
                    const next = hreflangEntries.map((en, idx) =>
                      idx === i ? { lang: e.target.value, url: en.url } : en
                    );
                    setHreflangEntries(next);
                  }}
                />
                <input
                  className="flex-1 border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="https://butik.se"
                  value={entry.url}
                  onChange={(e) => {
                    const next = hreflangEntries.map((en, idx) =>
                      idx === i ? { lang: en.lang, url: e.target.value } : en
                    );
                    setHreflangEntries(next);
                  }}
                />
                <button
                  onClick={() => removeHreflang(i)}
                  className="text-zinc-400 hover:text-red-500 px-1"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addHreflang}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline"
            >
              + Lägg till språk
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            robots.txt-regler
          </label>
          <textarea
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono min-h-[100px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder={"Disallow: /checkout\nDisallow: /cart"}
            value={robotsTxt}
            onChange={(e) => setRobotsTxt(e.target.value)}
          />
          <p className="text-xs text-zinc-400 mt-1">En regel per rad.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Google Merchant ID
          </label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            placeholder="123456789"
            value={settings.googleMerchantId}
            onChange={(e) =>
              setSettings((s) => ({ ...s, googleMerchantId: e.target.value }))
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={settings.includeSoldOutInMerchantFeed}
            onClick={() =>
              setSettings((s) => ({
                ...s,
                includeSoldOutInMerchantFeed: !s.includeSoldOutInMerchantFeed,
              }))
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.includeSoldOutInMerchantFeed
                ? "bg-zinc-900"
                : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.includeSoldOutInMerchantFeed
                  ? "translate-x-4"
                  : "translate-x-0.5"
              }`}
            />
          </button>
          <label className="text-sm text-zinc-700">
            Inkludera produkter utan lager i Merchant Feed
          </label>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Sparar…" : "Spara inställningar"}
      </Button>
    </div>
  );
}

// ── Redirects tab ─────────────────────────────────────────────────────────────

function RedirectsTab({
  initialRedirects,
}: {
  initialRedirects: SeoRedirect[];
}) {
  const [redirects, setRedirects] = useState<SeoRedirect[]>(initialRedirects);
  const [error, setError] = useState<string | null>(null);

  // New redirect form
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<301 | 302>(301);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!from.trim() || !to.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/seo/redirects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.trim(), to: to.trim(), type, note: note.trim() || null }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const created = (await res.json()) as SeoRedirect;
      setRedirects((prev) => [created, ...prev]);
      setFrom("");
      setTo("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid tillägg");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`${API}/api/seo/redirects/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = (await res.json()) as SeoRedirect;
      setRedirects((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid uppdatering");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API}/api/seo/redirects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setRedirects((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid borttagning");
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Från</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Till</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Typ</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Träffar</th>
                <th className="px-4 py-3 text-center font-semibold text-zinc-700">Aktiv</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {redirects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                    Inga omdirigeringar skapade ännu.
                  </td>
                </tr>
              )}
              {redirects.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{r.from}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{r.to}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.type === 301 ? "default" : "info"}>{r.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500">{r.hits.toLocaleString("sv-SE")}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      role="switch"
                      aria-checked={r.active}
                      onClick={() => handleToggleActive(r.id, r.active)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        r.active ? "bg-zinc-900" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          r.active ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Ta bort
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">Lägg till omdirigering</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Från sökväg</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="/gammalt-slug"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Till sökväg</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="/nytt-slug"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Typ</label>
            <select
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={type}
              onChange={(e) => setType(Number(e.target.value) as 301 | 302)}
            >
              <option value={301}>301 — Permanent</option>
              <option value={302}>302 — Tillfällig</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Anteckning</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Valfri anteckning…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={adding || !from.trim() || !to.trim()}>
          {adding ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
    </div>
  );
}

// ── Export tab ────────────────────────────────────────────────────────────────

function ExportTab() {
  const [purgingCache, setPurgingCache] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  async function handlePurgeCache() {
    setPurgingCache(true);
    setPurgeMsg(null);
    setPurgeError(null);
    try {
      const res = await fetch(`${API}/api/store/cache/purge`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setPurgeMsg("Cache rensad!");
      setTimeout(() => setPurgeMsg(null), 3000);
    } catch (e) {
      setPurgeError(e instanceof Error ? e.message : "Fel vid cache-rensning");
    } finally {
      setPurgingCache(false);
    }
  }

  return (
    <div className="space-y-4">
      {purgeError && <Alert variant="error">{purgeError}</Alert>}
      {purgeMsg && <Alert variant="success">{purgeMsg}</Alert>}

      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-800">Exportera filer</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(`${API}/api/seo/sitemap.xml`, "_blank")}
          >
            Sitemap (XML)
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`${API}/api/seo/merchant-feed.xml`, "_blank")}
          >
            Google Merchant Feed
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`${API}/api/seo/robots.txt`, "_blank")}
          >
            robots.txt
          </Button>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-800 mb-2">Cache</h3>
          <Button
            variant="outline"
            onClick={handlePurgeCache}
            disabled={purgingCache}
          >
            {purgingCache ? "Rensar…" : "Rensa cache"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SeoClient({
  initialSettings,
  initialRedirects,
}: SeoClientProps) {
  const [tab, setTab] = useState<Tab>("settings");

  const TABS: { key: Tab; label: string }[] = [
    { key: "settings", label: "Inställningar" },
    { key: "redirects", label: "Omdirigeringar" },
    { key: "export", label: "Exportera" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">SEO</h1>
        <p className="text-zinc-500 mt-1">Hantera sökmotoroptimering för din butik.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsTab initialSettings={initialSettings} />}
      {tab === "redirects" && <RedirectsTab initialRedirects={initialRedirects} />}
      {tab === "export" && <ExportTab />}
    </div>
  );
}
