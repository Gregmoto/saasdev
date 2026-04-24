"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Spinner, Alert, Button } from "@saas-shop/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoreFaq {
  id: string;
  storeAccountId: string;
  title: string;
  body: string;
  category: string | null;
  status: "draft" | "published" | "archived";
  isGlobal: boolean;
  sortOrder: number;
  visibleToRoles: string[];
  scheduledPublishAt: string | null;
  scheduledArchiveAt: string | null;
  currentVersion: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FaqVersion {
  id: string;
  faqId: string;
  version: number;
  title: string;
  body: string;
  editedBy: string | null;
  editSummary: string | null;
  createdAt: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<StoreFaq["status"], string> = {
  draft: "Utkast",
  published: "Publicerad",
  archived: "Arkiverad",
};

const STATUS_VARIANTS: Record<
  StoreFaq["status"],
  "default" | "success" | "warning" | "info"
> = {
  draft: "warning",
  published: "success",
  archived: "default",
};

function StatusBadge({ status }: { status: StoreFaq["status"] }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  );
}

// ── Inline edit form ──────────────────────────────────────────────────────────

interface EditFormProps {
  faq: StoreFaq;
  onSave: (updated: StoreFaq) => void;
  onCancel: () => void;
}

function EditForm({ faq, onSave, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(faq.title);
  const [body, setBody] = useState(faq.body);
  const [category, setCategory] = useState(faq.category ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<StoreFaq>(`/api/faqs/${faq.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, body, category: category || null }),
      });
      onSave(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparande");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 bg-zinc-50 border-t border-zinc-100 space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          Titel
        </label>
        <input
          className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          Innehåll (Markdown)
        </label>
        <textarea
          className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono min-h-[120px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          Kategori
        </label>
        <input
          className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="t.ex. Betalningar, API…"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Sparar…" : "Spara"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}

// ── Version history drawer ────────────────────────────────────────────────────

interface VersionDrawerProps {
  faq: StoreFaq;
  onRevert: (updated: StoreFaq) => void;
  onClose: () => void;
}

function VersionDrawer({ faq, onRevert, onClose }: VersionDrawerProps) {
  const [versions, setVersions] = useState<FaqVersion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<number | null>(null);

  // Load on mount
  useState(() => {
    apiFetch<FaqVersion[]>(`/api/faqs/${faq.id}/versions`)
      .then(setVersions)
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Kunde inte ladda versioner"),
      );
  });

  async function handleRevert(version: number) {
    setReverting(version);
    try {
      const updated = await apiFetch<StoreFaq>(
        `/api/faqs/${faq.id}/revert/${version}`,
        { method: "POST" },
      );
      onRevert(updated);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Fel vid återställning");
    } finally {
      setReverting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">
            Versionshistorik
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loadError && <Alert variant="error">{loadError}</Alert>}
          {versions === null && !loadError && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {versions?.length === 0 && (
            <p className="text-sm text-zinc-500">
              Inga sparade versioner ännu.
            </p>
          )}
          {versions?.map((v) => (
            <div
              key={v.id}
              className="border border-zinc-200 rounded-lg p-4 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-800">
                  Version {v.version}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(v.createdAt).toLocaleString("sv-SE")}
                </span>
              </div>
              <p className="text-sm text-zinc-600 truncate">{v.title}</p>
              {v.editSummary && (
                <p className="text-xs text-zinc-400 italic">{v.editSummary}</p>
              )}
              {v.editedBy && (
                <p className="text-xs text-zinc-400">av {v.editedBy}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRevert(v.version)}
                disabled={reverting !== null}
                className="mt-2"
              >
                {reverting === v.version ? "Återställer…" : "Återställ"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── New FAQ form ──────────────────────────────────────────────────────────────

interface NewFaqFormProps {
  onCreated: (faq: StoreFaq) => void;
  onCancel: () => void;
}

function NewFaqForm({ onCreated, onCancel }: NewFaqFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Titel krävs");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const faq = await apiFetch<StoreFaq>("/api/faqs", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          category: category || undefined,
          status: "draft",
        }),
      });
      onCreated(faq);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid skapande");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 border-2 border-dashed border-zinc-300">
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800">Ny FAQ</h3>
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Titel *
          </label>
          <input
            autoFocus
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vad handlar frågan om?"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Svar (Markdown)
          </label>
          <textarea
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono min-h-[100px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv ett detaljerat svar…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Kategori
          </label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="t.ex. Betalningar"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? "Skapar…" : "Skapa FAQ"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            Avbryt
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── AI Suggestions tab ────────────────────────────────────────────────────────

interface AiDraftFaq {
  id: string;
  title: string;
  body: string;
  status: "draft";
}

interface AiTabProps {
  onViewInList: (id: string) => void;
}

function AiTab({ onViewInList }: AiTabProps) {
  const [drafts, setDrafts] = useState<AiDraftFaq[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/faqs/ai-suggest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${text}`);
      }
      const result = (await res.json()) as AiDraftFaq[];
      setDrafts(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid generering");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(id: string) {
    setPublishingId(id);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/faqs/${id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid publicering");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="p-8">
      {/* Warning banner */}
      <div className="mb-6 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <span>⚠️</span>
        <span>
          AI-förslag publiceras aldrig automatiskt. Granska alltid innehållet
          innan publicering.
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">
            AI-genererade FAQ-förslag
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Baserat på dina senaste ärenden och chattkonversationer. Granska och
            publicera manuellt.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Genererar…" : "Generera förslag"}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!loading && drafts.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">🤖</p>
          <p>
            Klicka &apos;Generera förslag&apos; för att analysera dina ärenden
            och chatta.
          </p>
        </div>
      )}

      {!loading && drafts.length > 0 && (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">
                        {draft.title}
                      </h3>
                      <Badge variant="warning">Utkast</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">
                      {draft.body.slice(0, 150)}
                      {draft.body.length > 150 ? "…" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewInList(draft.id)}
                    >
                      Granska &amp; redigera
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePublish(draft.id)}
                      disabled={publishingId !== null}
                    >
                      {publishingId === draft.id ? "Publicerar…" : "Publicera"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type MainTab = "faqs" | "ai";

interface FaqManagerProps {
  initialFaqs: StoreFaq[];
}

export function FaqManager({ initialFaqs }: FaqManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>("faqs");
  const [faqs, setFaqs] = useState<StoreFaq[]>(initialFaqs);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Alla");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Derive category list from current faqs
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const f of faqs) {
      if (f.category) cats.add(f.category);
    }
    return ["Alla", ...Array.from(cats).sort()];
  }, [faqs]);

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const matchSearch =
        !search ||
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        (f.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat =
        categoryFilter === "Alla" || f.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [faqs, search, categoryFilter]);

  function updateFaq(updated: StoreFaq) {
    setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  async function handlePublish(id: string) {
    setActionError(null);
    setActionLoading(id + ":publish");
    try {
      const updated = await apiFetch<StoreFaq>(`/api/faqs/${id}/publish`, {
        method: "POST",
      });
      updateFaq(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel vid publicering");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(id: string) {
    setActionError(null);
    setActionLoading(id + ":archive");
    try {
      const updated = await apiFetch<StoreFaq>(`/api/faqs/${id}/archive`, {
        method: "POST",
      });
      updateFaq(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel vid arkivering");
    } finally {
      setActionLoading(null);
    }
  }

  const historyFaq = faqs.find((f) => f.id === historyId) ?? null;

  // Suppress unused variable warning from router (used indirectly by useRouter import for future navigation)
  void router;

  return (
    <div>
      {/* Top-level tabs */}
      <div className="flex gap-1 border-b border-zinc-200 px-8 pt-8">
        {(
          [
            { key: "faqs" as const, label: "FAQ-poster" },
            { key: "ai" as const, label: "AI-förslag" },
          ] as { key: MainTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AI tab */}
      {activeTab === "ai" && (
        <AiTab
          onViewInList={(id) => {
            setActiveTab("faqs");
            setEditingId(id);
          }}
        />
      )}

      {/* FAQ list tab */}
      {activeTab === "faqs" && (
      <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">FAQ / Hjälpcenter</h1>
          <p className="text-zinc-500 mt-1">
            Hantera vanliga frågor och svar för din butik.
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          + Ny FAQ
        </Button>
      </div>

      {/* Global action error */}
      {actionError && (
        <div className="mb-4">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {/* New FAQ form */}
      {showNewForm && (
        <NewFaqForm
          onCreated={(faq) => {
            setFaqs((prev) => [faq, ...prev]);
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="Sök frågor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === cat
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                  Fråga / Titel
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden sm:table-cell">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700 hidden md:table-cell">
                  Versioner
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700 hidden md:table-cell">
                  Visningar
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden lg:table-cell">
                  Skapad
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-zinc-400"
                  >
                    Inga FAQ-poster hittades.
                  </td>
                </tr>
              )}
              {filtered.map((faq) => (
                <>
                  <tr
                    key={faq.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 line-clamp-1">
                          {faq.title}
                        </span>
                        {faq.isGlobal && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Global
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                      {faq.category ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={faq.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500 hidden md:table-cell">
                      {faq.currentVersion}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500 hidden md:table-cell">
                      {faq.viewCount.toLocaleString("sv-SE")}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                      {new Date(faq.createdAt).toLocaleDateString("sv-SE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {faq.status !== "published" && (
                          <button
                            onClick={() => handlePublish(faq.id)}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === faq.id + ":publish"
                              ? "…"
                              : "Publicera"}
                          </button>
                        )}
                        {faq.status !== "archived" && (
                          <button
                            onClick={() => handleArchive(faq.id)}
                            disabled={actionLoading !== null}
                            className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === faq.id + ":archive"
                              ? "…"
                              : "Arkivera"}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setEditingId(editingId === faq.id ? null : faq.id)
                          }
                          className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() =>
                            setHistoryId(historyId === faq.id ? null : faq.id)
                          }
                          className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
                        >
                          Historik
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === faq.id && (
                    <tr key={faq.id + ":edit"}>
                      <td colSpan={7} className="p-0">
                        <EditForm
                          faq={faq}
                          onSave={(updated) => {
                            updateFaq(updated);
                            setEditingId(null);
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Version history drawer */}
      {historyFaq && (
        <VersionDrawer
          faq={historyFaq}
          onRevert={(updated) => {
            updateFaq(updated);
            setHistoryId(null);
          }}
          onClose={() => setHistoryId(null)}
        />
      )}
    </div>
      )}
    </div>
  );
}
