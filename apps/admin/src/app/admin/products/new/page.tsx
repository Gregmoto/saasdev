import { headers } from "next/headers";
import { ProductForm } from "../[productId]/product-form";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchJson<T>(path: string, cookie?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export default async function NewProductPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;

  const [categories, brands, shops] = await Promise.all([
    fetchJson<unknown[]>("/api/products/categories", cookie),
    fetchJson<unknown[]>("/api/products/brands", cookie),
    fetchJson<unknown[]>("/api/shops", cookie),
  ]);

  return (
    <ProductForm
      initialCategories={categories ?? []}
      initialBrands={brands ?? []}
      initialShops={shops ?? []}
    />
  );
}
