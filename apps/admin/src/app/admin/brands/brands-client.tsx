"use client";

import { useState } from "react";
import { Card, Alert, Button } from "@saas-shop/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  sortOrder?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Brand form panel ──────────────────────────────────────────────────────────

interface BrandFormProps {
  initial?: Partial<Brand>;
  onSave: (data: Partial<Brand>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  title: string;
}

function BrandForm({ initial, onSave, onCancel, saving, error, title }: BrandFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [seoKeywords, setSeoKeywords] = useState(initial?.seoKeywords ?? "");

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(toSlug(val));
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Namn *</label>
          <input
            autoFocus
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Slug</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={slug}
            onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Logotyp-URL</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={logoUrl ?? ""}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">Beskrivning</label>
          <textarea
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[60px]"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">SEO-titel</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={seoTitle ?? ""}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Nyckelord</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={seoKeywords ?? ""}
            onChange={(e) => setSeoKeywords(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-600 mb-1">SEO-beskrivning</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={seoDescription ?? ""}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={saving || !name.trim()}
          onClick={() =>
            onSave({
              name,
              slug,
              description: description || null,
              logoUrl: logoUrl || null,
              seoTitle: seoTitle || null,
              seoDescription: seoDescription || null,
              seoKeywords: seoKeywords || null,
            })
          }
        >
          {saving ? "Sparar…" : "Spara"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface BrandsClientProps {
  initialBrands: unknown[];
}

export function BrandsClient({ initialBrands }: BrandsClientProps) {
  const [brands, setBrands] = useState<Brand[]>(initialBrands as Brand[]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(data: Partial<Brand>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/brands`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      const created = (await res.json()) as Brand;
      setBrands((prev) => [...prev, created]);
      setShowNewForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid skapande");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: Partial<Brand>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/brands/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      const updated = (await res.json()) as Brand;
      setBrands((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid uppdatering");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Radera varumärke?")) return;
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/brands/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text().catch(() => "Fel"));
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid borttagning");
    }
  }

  const editingBrand = brands.find((b) => b.id === editingId);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Varumärken</h1>
          <p className="text-zinc-500 mt-1 text-sm">Hantera varumärken för dina produkter.</p>
        </div>
        <Button onClick={() => { setShowNewForm(true); setEditingId(null); }} disabled={showNewForm}>
          + Nytt varumärke
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Slide-open form panel for new brand */}
      {showNewForm && (
        <Card className="border-2 border-dashed border-zinc-300">
          <div className="p-6">
            <BrandForm
              title="Nytt varumärke"
              onSave={handleCreate}
              onCancel={() => setShowNewForm(false)}
              saving={saving}
              error={null}
            />
          </div>
        </Card>
      )}

      {/* Slide-open form panel for editing */}
      {editingId && editingBrand && (
        <Card className="border-2 border-blue-200">
          <div className="p-6">
            <BrandForm
              title={`Redigera: ${editingBrand.name}`}
              initial={editingBrand}
              onSave={(data) => handleUpdate(editingId, data)}
              onCancel={() => setEditingId(null)}
              saving={saving}
              error={null}
            />
          </div>
        </Card>
      )}

      {/* Brands grid */}
      {brands.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-zinc-400">
            Inga varumärken ännu. Klicka &quot;Nytt varumärke&quot; för att skapa det första.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="w-12 h-12 object-contain rounded-lg border border-zinc-200 bg-white p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-xl shrink-0">
                      🏷️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 text-sm truncate">{brand.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{brand.slug}</div>
                    {brand.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{brand.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setEditingId(brand.id); setShowNewForm(false); }}
                    className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    Redigera
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Radera
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
