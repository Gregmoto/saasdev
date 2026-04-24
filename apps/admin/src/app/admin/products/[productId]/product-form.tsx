"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Spinner, Alert, Button } from "@saas-shop/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductType = "simple" | "variable" | "bundle";
type ProductStatus = "draft" | "published" | "archived";

interface ProductImage {
  url: string;
  alt: string;
}

interface Variant {
  id?: string;
  title: string;
  priceCents: number;
  sku: string;
  barcode: string;
  compareAtPriceCents: number;
  inventoryQuantity: number;
  options: Record<string, string>;
  sortOrder: number;
}

interface ShopVisibility {
  shopId: string;
  isPublished: boolean;
}

interface ShopPriceOverride {
  shopId: string;
  variantId: string;
  priceCents: number;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

type Tab = "general" | "prices" | "inventory" | "variants" | "seo" | "shops";

// ── Slug helper ───────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Variant row component ─────────────────────────────────────────────────────

interface VariantRowProps {
  variant: Variant;
  index: number;
  onUpdate: (index: number, updated: Variant) => void;
  onDelete: (index: number) => void;
}

function VariantRow({ variant, index, onUpdate, onDelete }: VariantRowProps) {
  const [editing, setEditing] = useState(!variant.id);
  const [form, setForm] = useState({ ...variant });
  const [optionKey, setOptionKey] = useState("");
  const [optionVal, setOptionVal] = useState("");

  function save() {
    onUpdate(index, form);
    setEditing(false);
  }

  if (!editing) {
    return (
      <tr className="border-b border-zinc-100 hover:bg-zinc-50/50">
        <td className="px-4 py-3 text-sm text-zinc-900">{variant.title}</td>
        <td className="px-4 py-3 text-sm text-zinc-500">{variant.sku || "—"}</td>
        <td className="px-4 py-3 text-sm text-zinc-700">
          kr {(variant.priceCents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500">{variant.inventoryQuantity}</td>
        <td className="px-4 py-3 text-sm text-zinc-500">
          {Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(", ") || "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            >
              Redigera
            </button>
            <button
              onClick={() => onDelete(index)}
              className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
            >
              Ta bort
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-100 bg-zinc-50">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Titel *</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">SKU</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Pris (kr)</label>
            <input
              type="number"
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.priceCents / 100}
              onChange={(e) => setForm({ ...form, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Jämförpris (kr)</label>
            <input
              type="number"
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.compareAtPriceCents / 100}
              onChange={(e) => setForm({ ...form, compareAtPriceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Streckkod</label>
            <input
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Lagerantal</label>
            <input
              type="number"
              className="w-full border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              value={form.inventoryQuantity}
              onChange={(e) => setForm({ ...form, inventoryQuantity: parseInt(e.target.value || "0", 10) })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Alternativ (key:value)</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Nyckel (t.ex. Färg)"
                value={optionKey}
                onChange={(e) => setOptionKey(e.target.value)}
              />
              <input
                className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Värde (t.ex. Röd)"
                value={optionVal}
                onChange={(e) => setOptionVal(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (optionKey && optionVal) {
                    setForm({ ...form, options: { ...form.options, [optionKey]: optionVal } });
                    setOptionKey("");
                    setOptionVal("");
                  }
                }}
                className="px-3 py-1.5 text-xs rounded bg-zinc-900 text-white hover:bg-zinc-700"
              >
                Lägg till
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(form.options).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded text-xs">
                  {k}: {v}
                  <button
                    type="button"
                    onClick={() => {
                      const opts = { ...form.options };
                      delete opts[k];
                      setForm({ ...form, options: opts });
                    }}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={save} disabled={!form.title}>Spara</Button>
          {variant.id && (
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Avbryt</Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProductFormProps {
  initialProduct?: unknown;
  initialVariants?: unknown[];
  initialCategories: unknown[];
  initialBrands: unknown[];
  initialShops: unknown[];
}

export function ProductForm({
  initialProduct,
  initialVariants = [],
  initialCategories,
  initialBrands,
  initialShops,
}: ProductFormProps) {
  const router = useRouter();
  const product = initialProduct as Record<string, unknown> | undefined;
  const categories = initialCategories as Category[];
  const brands = initialBrands as Brand[];
  const shops = initialShops as Shop[];

  const isEdit = !!product?.id;

  // Form state
  const [name, setName] = useState((product?.name as string) ?? "");
  const [slug, setSlug] = useState((product?.slug as string) ?? "");
  const [slugManual, setSlugManual] = useState(false);
  const [type, setType] = useState<ProductType>((product?.type as ProductType) ?? "simple");
  const [status, setStatus] = useState<ProductStatus>((product?.status as ProductStatus) ?? "draft");
  const [description, setDescription] = useState((product?.description as string) ?? "");
  const [categoryId, setCategoryId] = useState((product?.categoryId as string) ?? "");
  const [brandId, setBrandId] = useState((product?.brandId as string) ?? "");
  const [images, setImages] = useState<ProductImage[]>(
    (product?.images as ProductImage[]) ?? []
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");

  // Prices
  const [priceDisplay, setPriceDisplay] = useState(
    product?.priceCents ? String((product.priceCents as number) / 100) : ""
  );
  const [compareAtDisplay, setCompareAtDisplay] = useState(
    product?.compareAtPriceCents ? String((product.compareAtPriceCents as number) / 100) : ""
  );
  const [taxable, setTaxable] = useState((product?.taxable as boolean) ?? true);

  // Inventory
  const [sku, setSku] = useState((product?.sku as string) ?? "");
  const [barcode, setBarcode] = useState((product?.barcode as string) ?? "");
  const [trackInventory, setTrackInventory] = useState((product?.trackInventory as boolean) ?? false);
  const [inventoryQuantity, setInventoryQuantity] = useState(
    String((product?.inventoryQuantity as number) ?? 0)
  );
  const [weight, setWeight] = useState(String((product?.weight as number) ?? ""));

  // Variants
  const [variants, setVariants] = useState<Variant[]>(
    (initialVariants as Array<Record<string, unknown>>).map((v) => ({
      id: v.id as string,
      title: (v.title as string) ?? "",
      priceCents: (v.priceCents as number) ?? 0,
      sku: (v.sku as string) ?? "",
      barcode: (v.barcode as string) ?? "",
      compareAtPriceCents: (v.compareAtPriceCents as number) ?? 0,
      inventoryQuantity: (v.inventoryQuantity as number) ?? 0,
      options: (v.options as Record<string, string>) ?? {},
      sortOrder: (v.sortOrder as number) ?? 0,
    }))
  );

  // SEO
  const [seoTitle, setSeoTitle] = useState((product?.seoTitle as string) ?? "");
  const [seoDescription, setSeoDescription] = useState((product?.seoDescription as string) ?? "");
  const [seoKeywords, setSeoKeywords] = useState((product?.seoKeywords as string) ?? "");

  // Shops visibility
  const [shopVisibility, setShopVisibility] = useState<ShopVisibility[]>(
    shops.map((s) => ({ shopId: s.id, isPublished: false }))
  );
  const [shopPrices, setShopPrices] = useState<ShopPriceOverride[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantSaving, setVariantSaving] = useState(false);

  // Auto-slug
  useEffect(() => {
    if (!slugManual && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugManual]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "Allmänt" },
    { key: "prices", label: "Priser" },
    { key: "inventory", label: "Lager" },
    ...(type === "variable" ? [{ key: "variants" as Tab, label: "Varianter" }] : []),
    { key: "seo", label: "SEO" },
    ...(shops.length > 0 ? [{ key: "shops" as Tab, label: "Butiker" }] : []),
  ];

  // ── Save product ─────────────────────────────────────────────────────────

  async function handleSave(publishNow = false) {
    if (!name.trim()) {
      setError("Namn krävs");
      return;
    }
    setSaving(true);
    setError(null);

    const finalStatus = publishNow ? "published" : status;

    const body = {
      name,
      slug,
      type,
      status: finalStatus,
      description,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      priceCents: Math.round(parseFloat(priceDisplay || "0") * 100),
      compareAtPriceCents: compareAtDisplay
        ? Math.round(parseFloat(compareAtDisplay) * 100)
        : undefined,
      taxable,
      sku: sku || undefined,
      barcode: barcode || undefined,
      trackInventory,
      inventoryQuantity: trackInventory ? parseInt(inventoryQuantity, 10) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      images,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords || undefined,
    };

    try {
      let saved: Record<string, unknown>;
      if (isEdit) {
        const res = await fetch(`${BASE}/api/products/${product!.id as string}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Fel vid sparande"));
        saved = (await res.json()) as Record<string, unknown>;
      } else {
        const res = await fetch(`${BASE}/api/products`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Fel vid sparande"));
        saved = (await res.json()) as Record<string, unknown>;
      }

      // Save shop visibility
      if (shops.length > 0 && saved.id) {
        await Promise.allSettled(
          shopVisibility.map((sv) =>
            fetch(`${BASE}/api/shops/${sv.shopId}/products/${saved.id as string}/visibility`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isPublished: sv.isPublished }),
            })
          )
        );
      }

      if (!isEdit && saved.id) {
        router.push(`/products/${saved.id as string}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Okänt fel");
    } finally {
      setSaving(false);
    }
  }

  // ── Variant CRUD ──────────────────────────────────────────────────────────

  async function saveVariant(index: number, variant: Variant) {
    if (!isEdit) {
      // Just update local state until product is saved
      const updated = [...variants];
      updated[index] = variant;
      setVariants(updated);
      return;
    }
    setVariantSaving(true);
    setError(null);
    try {
      const productId = product!.id as string;
      if (variant.id) {
        const res = await fetch(`${BASE}/api/products/${productId}/variants/${variant.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variant),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
        const updated = [...variants];
        updated[index] = { ...variant, ...(await res.json() as Variant) };
        setVariants(updated);
      } else {
        const res = await fetch(`${BASE}/api/products/${productId}/variants`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variant),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
        const created = await res.json() as Variant;
        const updated = [...variants];
        updated[index] = created;
        setVariants(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid sparande av variant");
    } finally {
      setVariantSaving(false);
    }
  }

  async function deleteVariant(index: number) {
    const variant = variants[index];
    if (!variant) return;
    if (!confirm("Ta bort variant?")) return;
    if (variant.id && isEdit) {
      const productId = product!.id as string;
      try {
        const res = await fetch(`${BASE}/api/products/${productId}/variants/${variant.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok && res.status !== 204) throw new Error(await res.text().catch(() => "Fel"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fel vid borttagning av variant");
        return;
      }
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Shop price overrides ──────────────────────────────────────────────────

  async function saveShopPrice(shopId: string, variantId: string, priceCents: number) {
    if (!isEdit) return;
    try {
      const res = await fetch(`${BASE}/api/shops/${shopId}/prices/${variantId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      setShopPrices((prev) => {
        const idx = prev.findIndex((p) => p.shopId === shopId && p.variantId === variantId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { shopId, variantId, priceCents };
          return updated;
        }
        return [...prev, { shopId, variantId, priceCents }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid pris-override");
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/products")}
          className="text-zinc-500 hover:text-zinc-900 text-sm"
        >
          ← Tillbaka
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 flex-1">
          {isEdit ? name || "Redigera produkt" : "Ny produkt"}
        </h1>
        {isEdit && (
          <Badge
            variant={
              status === "published" ? "success" : status === "archived" ? "warning" : "default"
            }
          >
            {status === "published" ? "Publicerad" : status === "archived" ? "Arkiverad" : "Utkast"}
          </Badge>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
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

      {/* ── Tab: Allmänt ── */}
      {activeTab === "general" && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Namn *</label>
                <input
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Produktnamn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
                <input
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={slug}
                  onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                  placeholder="produkt-slug"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Typ</label>
              <div className="flex gap-3">
                {(["simple", "variable", "bundle"] as ProductType[]).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                      className="accent-zinc-900"
                    />
                    <span className="text-sm text-zinc-700">
                      {t === "simple" ? "Enkel" : t === "variable" ? "Variabel" : "Bundle"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Status</label>
              <div className="flex gap-3">
                {(["draft", "published", "archived"] as ProductStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      className="accent-zinc-900"
                    />
                    <span className="text-sm text-zinc-700">
                      {s === "draft" ? "Utkast" : s === "published" ? "Publicerad" : "Arkiverad"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Beskrivning</label>
              <textarea
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv produkten…"
              />
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Kategori</label>
                <select
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">— Välj kategori —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Varumärke</label>
                <select
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">— Välj varumärke —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Bilder</label>
              <div className="space-y-2 mb-3">
                {images.map((img, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt} className="w-12 h-12 object-cover rounded border border-zinc-200" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-500 truncate">{img.url}</div>
                      <div className="text-xs text-zinc-400">{img.alt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Bild-URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <input
                  className="w-40 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  placeholder="Alt-text"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (newImageUrl) {
                      setImages((prev) => [...prev, { url: newImageUrl, alt: newImageAlt }]);
                      setNewImageUrl("");
                      setNewImageAlt("");
                    }
                  }}
                >
                  + Lägg till bild
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab: Priser ── */}
      {activeTab === "prices" && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Pris (kr) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Jämförpris (kr)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={compareAtDisplay}
                  onChange={(e) => setCompareAtDisplay(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxable}
                  onChange={(e) => setTaxable(e.target.checked)}
                  className="rounded border-zinc-300 accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">Momsbelagd</span>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab: Lager ── */}
      {activeTab === "inventory" && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">SKU</label>
                <input
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Streckkod</label>
                <input
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="1234567890123"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackInventory}
                  onChange={(e) => setTrackInventory(e.target.checked)}
                  className="rounded border-zinc-300 accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">Spåra lager</span>
              </label>
            </div>
            {trackInventory && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Lagerantal</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  value={inventoryQuantity}
                  onChange={(e) => setInventoryQuantity(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Vikt (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab: Varianter ── */}
      {activeTab === "variants" && type === "variable" && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">Varianter</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={variantSaving}
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      title: "",
                      priceCents: 0,
                      sku: "",
                      barcode: "",
                      compareAtPriceCents: 0,
                      inventoryQuantity: 0,
                      options: {},
                      sortOrder: prev.length,
                    },
                  ])
                }
              >
                + Lägg till variant
              </Button>
            </div>
            {variantSaving && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Titel</th>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-left font-medium">Pris</th>
                    <th className="px-4 py-3 text-left font-medium">Lager</th>
                    <th className="px-4 py-3 text-left font-medium">Alternativ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                        Inga varianter ännu. Klicka &quot;Lägg till variant&quot; för att börja.
                      </td>
                    </tr>
                  )}
                  {variants.map((variant, i) => (
                    <VariantRow
                      key={variant.id ?? `new-${i}`}
                      variant={variant}
                      index={i}
                      onUpdate={(idx, updated) => saveVariant(idx, updated)}
                      onDelete={(idx) => deleteVariant(idx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab: SEO ── */}
      {activeTab === "seo" && (
        <Card>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                SEO-titel <span className="text-zinc-400 text-xs font-normal">({seoTitle.length}/255)</span>
              </label>
              <input
                maxLength={255}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Titel för sökmotorer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                SEO-beskrivning <span className="text-zinc-400 text-xs font-normal">({seoDescription.length}/500)</span>
              </label>
              <textarea
                maxLength={500}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[80px]"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Beskrivning för sökmotorer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nyckelord</label>
              <input
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="nyckelord, separerade, med, komma"
              />
            </div>

            {/* Preview snippet */}
            {(seoTitle || name) && (
              <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-lg">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Förhandsgranskning i sökresultat</div>
                <div className="text-blue-600 text-base font-medium line-clamp-1">
                  {seoTitle || name}
                </div>
                <div className="text-green-700 text-xs mt-0.5">
                  yourstore.se/products/{slug || "produktnamn"}
                </div>
                {seoDescription && (
                  <div className="text-zinc-600 text-sm mt-1 line-clamp-2">{seoDescription}</div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Tab: Butiker ── */}
      {activeTab === "shops" && shops.length > 0 && (
        <Card>
          <div className="p-6 space-y-6">
            {shops.map((shop) => {
              const vis = shopVisibility.find((v) => v.shopId === shop.id);
              return (
                <div key={shop.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">{shop.name}</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vis?.isPublished ?? false}
                        onChange={(e) =>
                          setShopVisibility((prev) =>
                            prev.map((v) =>
                              v.shopId === shop.id
                                ? { ...v, isPublished: e.target.checked }
                                : v
                            )
                          )
                        }
                        className="rounded border-zinc-300 accent-zinc-900"
                      />
                      <span className="text-sm text-zinc-700">
                        Publicera i {shop.name}
                      </span>
                    </label>
                  </div>

                  {/* Per-variant price overrides for variable products */}
                  {type === "variable" && variants.length > 0 && isEdit && (
                    <div>
                      <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                        Prisöverstyrning per variant
                      </div>
                      <div className="space-y-2">
                        {variants.filter((v) => v.id).map((variant) => {
                          const override = shopPrices.find(
                            (p) => p.shopId === shop.id && p.variantId === variant.id
                          );
                          return (
                            <div key={variant.id} className="flex items-center gap-3">
                              <span className="text-sm text-zinc-700 w-32 truncate">{variant.title}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-28 border border-zinc-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                placeholder={String(variant.priceCents / 100)}
                                defaultValue={override ? override.priceCents / 100 : ""}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && variant.id) {
                                    saveShopPrice(shop.id, variant.id, Math.round(val * 100));
                                  }
                                }}
                              />
                              <span className="text-xs text-zinc-400">kr (lämna tomt för standardpris)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
        <Button onClick={() => handleSave(false)} disabled={saving}>
          {saving ? <><Spinner /> Sparar…</> : "Spara"}
        </Button>
        {status !== "published" && (
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            Spara och publicera
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => router.push("/products")}
          disabled={saving}
        >
          Avbryt
        </Button>
      </div>
    </div>
  );
}
