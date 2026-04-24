"use client";

import { useState, useMemo } from "react";
import { Card, Alert, Button, Badge } from "@saas-shop/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageUrl?: string | null;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildTree(flat: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of flat) {
    byId.set(c.id, { ...c, children: [], depth: 0 });
  }
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function setDepth(node: CategoryNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) {
      setDepth(child, depth + 1);
    }
  }
  for (const root of roots) setDepth(root, 0);
  return roots;
}

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function walk(ns: CategoryNode[]) {
    for (const n of ns) {
      result.push(n);
      walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

// ── Category form ─────────────────────────────────────────────────────────────

interface CategoryFormProps {
  initial?: Partial<Category>;
  categories: Category[];
  onSave: (data: Partial<Category>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

function CategoryForm({ initial, categories, onSave, onCancel, saving, error }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugManual, setSlugManual] = useState(false);
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(toSlug(val));
  }

  return (
    <div className="space-y-3 p-4">
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
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Förälderkategori</label>
          <select
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={parentId ?? ""}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">— Ingen (rotkategori) —</option>
            {categories
              .filter((c) => c.id !== initial?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Bild-URL</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={imageUrl ?? ""}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Beskrivning</label>
        <textarea
          className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[60px]"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">SEO-titel</label>
          <input
            className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={seoTitle ?? ""}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </div>
        <div>
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
              parentId: parentId || null,
              description: description || null,
              seoTitle: seoTitle || null,
              seoDescription: seoDescription || null,
              imageUrl: imageUrl || null,
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

interface CategoriesClientProps {
  initialCategories: unknown[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(
    initialCategories as Category[]
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const flat = useMemo(() => flattenTree(tree), [tree]);

  async function handleCreate(data: Partial<Category>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      const created = (await res.json()) as Category;
      setCategories((prev) => [...prev, created]);
      setShowNewForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid skapande");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, data: Partial<Category>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/categories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      const updated = (await res.json()) as Category;
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid uppdatering");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const hasChildren = categories.some((c) => c.parentId === id);
    if (hasChildren) {
      if (
        !confirm(
          "Denna kategori har underkategorier. Om du raderar den kan underkategorierna bli föräldralösa. Fortsätta?"
        )
      )
        return;
    } else {
      if (!confirm("Radera kategori?")) return;
    }
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/products/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text().catch(() => "Fel"));
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid borttagning");
    }
  }

  async function handleSortOrder(id: string, delta: number) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const newOrder = (cat.sortOrder ?? 0) + delta;
    await handleUpdate(id, { sortOrder: newOrder });
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Kategorier</h1>
          <p className="text-zinc-500 mt-1 text-sm">Organisera dina produkter i kategorier.</p>
        </div>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          + Ny kategori
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* New category form */}
      {showNewForm && (
        <Card className="border-2 border-dashed border-zinc-300">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Ny kategori</h3>
            <CategoryForm
              categories={categories}
              onSave={handleCreate}
              onCancel={() => setShowNewForm(false)}
              saving={saving}
              error={null}
            />
          </div>
        </Card>
      )}

      {/* Tree */}
      <Card>
        {flat.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            Inga kategorier ännu. Klicka &quot;Ny kategori&quot; för att skapa den första.
          </div>
        ) : (
          <div>
            {flat.map((node) => (
              <div key={node.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors"
                  style={{ paddingLeft: `${16 + node.depth * 24}px` }}
                >
                  {node.depth > 0 && (
                    <span className="text-zinc-300 text-sm">└</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 text-sm">{node.name}</span>
                      {node.children.length > 0 && (
                        <Badge variant="info">{node.children.length} underkategorier</Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{node.slug}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSortOrder(node.id, -1)}
                      className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                      title="Flytta upp"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleSortOrder(node.id, 1)}
                      className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                      title="Flytta ner"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setEditingId(editingId === node.id ? null : node.id)}
                      className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => handleDelete(node.id)}
                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Radera
                    </button>
                  </div>
                </div>
                {editingId === node.id && (
                  <div className="bg-zinc-50 border-b border-zinc-200">
                    <CategoryForm
                      initial={node}
                      categories={categories}
                      onSave={(data) => handleUpdate(node.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                      error={null}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
