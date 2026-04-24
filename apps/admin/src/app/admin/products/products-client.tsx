"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";
import {
  Card,
  Badge,
  Spinner,
  Alert,
  Button,
  Table,
  Thead,
  Th,
  Tr,
  Td,
} from "@saas-shop/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Shop {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  type: "simple" | "variable" | "bundle";
  status: "draft" | "published" | "archived";
  priceCents: number;
  inventoryQuantity?: number | null;
  images?: Array<{ url: string; alt?: string }>;
  category?: { id: string; name: string } | null;
  shopIsPublished?: boolean;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  const val = cents / 100;
  return `kr ${val.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<Product["status"], string> = {
  draft: "Utkast",
  published: "Publicerad",
  archived: "Arkiverad",
};
const STATUS_VARIANT: Record<Product["status"], "default" | "success" | "warning"> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

const TYPE_LABEL: Record<Product["type"], string> = {
  simple: "Enkel",
  variable: "Variabel",
  bundle: "Bundle",
};
const TYPE_VARIANT: Record<Product["type"], "default" | "info" | "warning"> = {
  simple: "default",
  variable: "info",
  bundle: "warning",
};

// ── Main component ────────────────────────────────────────────────────────────

interface ProductsClientProps {
  initialCategories: unknown[];
  initialBrands: unknown[];
  initialShops: unknown[];
}

export function ProductsClient({
  initialCategories,
  initialBrands,
  initialShops,
}: ProductsClientProps) {
  const router = useRouter();
  const categories = initialCategories as Category[];
  const brands = initialBrands as Brand[];
  const shops = initialShops as Shop[];

  // Filters
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [page, setPage] = useState(1);

  // Bulk select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Action states
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Debounce search
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }, []);

  // Build SWR key
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(activeShopId && { shopId: activeShopId }),
  });
  const swrKey = `/api/products?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<ProductsResponse>(swrKey, fetcher);

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Visibility toggle ──────────────────────────────────────────────────────

  async function handleVisibilityToggle(productId: string, current: boolean) {
    if (!activeShopId) return;
    setTogglingId(productId);
    setActionError(null);
    try {
      // Optimistic update
      mutate(
        (prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((p) =>
                  p.id === productId ? { ...p, shopIsPublished: !current } : p
                ),
              }
            : prev,
        false
      );
      const res = await fetch(
        `${BASE}/api/shops/${activeShopId}/products/${productId}/visibility`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !current }),
        }
      );
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel");
      await mutate();
    } finally {
      setTogglingId(null);
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────

  async function handleBulkVisibility(isPublished: boolean) {
    if (!activeShopId || selected.size === 0) return;
    setBulkLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${BASE}/api/shops/${activeShopId}/products/bulk-visibility`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: Array.from(selected), isPublished }),
        }
      );
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      setSelected(new Set());
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Radera ${selected.size} produkt(er)? Detta går inte att ångra.`)) return;
    setBulkLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${BASE}/api/products/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Fel"));
      setSelected(new Set());
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleDeleteOne(id: string) {
    if (!confirm("Radera produkt? Detta går inte att ångra.")) return;
    setActionError(null);
    try {
      const res = await fetch(`${BASE}/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text().catch(() => "Fel"));
      await mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Fel");
    }
  }

  const activeShop = shops.find((s) => s.id === activeShopId);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Produkter</h1>
          <p className="text-zinc-500 mt-1 text-sm">Hantera butikens produkter.</p>
        </div>
        <Button onClick={() => router.push("/products/new")}>+ Ny produkt</Button>
      </div>

      {/* Shop Switcher */}
      {shops.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
          <span className="text-xs font-medium text-zinc-500 self-center mr-2">Butik:</span>
          <button
            onClick={() => setActiveShopId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              activeShopId === null
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            Alla butiker
          </button>
          {shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => setActiveShopId(shop.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeShopId === shop.id
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {shop.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <input
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          placeholder="Sök produkter…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Alla status</option>
          <option value="draft">Utkast</option>
          <option value="published">Publicerad</option>
          <option value="archived">Arkiverad</option>
        </select>
        <select
          className="border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">Alla typer</option>
          <option value="simple">Enkel</option>
          <option value="variable">Variabel</option>
          <option value="bundle">Bundle</option>
        </select>
        {categories.length > 0 && (
          <select
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          >
            <option value="">Alla kategorier</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        {brands.length > 0 && (
          <select
            className="border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value); setPage(1); }}
          >
            <option value="">Alla varumärken</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-zinc-900 text-white rounded-xl">
          <span className="text-sm font-medium">{selected.size} valda</span>
          {activeShopId && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-white border-white hover:bg-zinc-700"
                onClick={() => handleBulkVisibility(true)}
                disabled={bulkLoading}
              >
                Publicera i {activeShop?.name}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-white border-white hover:bg-zinc-700"
                onClick={() => handleBulkVisibility(false)}
                disabled={bulkLoading}
              >
                Avpublicera i {activeShop?.name}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            Radera valda
          </Button>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <Alert variant="error">{actionError}</Alert>
      )}

      {/* Table */}
      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="p-6">
            <Alert variant="error">Kunde inte ladda produkter.</Alert>
          </div>
        )}
        {!isLoading && !error && (
          <Table>
            <Thead>
              <tr>
                <Th>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    className="rounded border-zinc-300"
                  />
                </Th>
                <Th>Bild</Th>
                <Th>Namn</Th>
                <Th>SKU</Th>
                <Th>Typ</Th>
                <Th>Status</Th>
                <Th>Pris</Th>
                <Th>Lager</Th>
                <Th>Kategori</Th>
                {activeShopId && <Th>Publicerad i {activeShop?.name}</Th>}
                <Th>Åtgärder</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={activeShopId ? 11 : 10} className="text-center text-zinc-400 py-12">
                    Inga produkter hittades.
                  </Td>
                </tr>
              )}
              {rows.map((product) => (
                <Tr key={product.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleRow(product.id)}
                      className="rounded border-zinc-300"
                    />
                  </Td>
                  <Td>
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt ?? product.name}
                        className="w-10 h-10 object-cover rounded-lg border border-zinc-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                        📦
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Link
                      href={`/products/${product.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-600 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </Td>
                  <Td className="text-zinc-500 text-xs">{product.sku ?? "—"}</Td>
                  <Td>
                    <Badge variant={TYPE_VARIANT[product.type]}>{TYPE_LABEL[product.type]}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANT[product.status]}>{STATUS_LABEL[product.status]}</Badge>
                  </Td>
                  <Td>{formatPrice(product.priceCents)}</Td>
                  <Td>{product.inventoryQuantity ?? "—"}</Td>
                  <Td className="text-zinc-500 text-xs">{product.category?.name ?? "—"}</Td>
                  {activeShopId && (
                    <Td>
                      <input
                        type="checkbox"
                        checked={!!product.shopIsPublished}
                        disabled={togglingId === product.id}
                        onChange={() => handleVisibilityToggle(product.id, !!product.shopIsPublished)}
                        className="rounded border-zinc-300 cursor-pointer"
                      />
                    </Td>
                  )}
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        Redigera
                      </Link>
                      <button
                        onClick={() => handleDeleteOne(product.id)}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Radera
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Föregående
          </Button>
          <span className="text-sm text-zinc-500">
            Sida {page} av {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Nästa →
          </Button>
        </div>
      )}
    </div>
  );
}
