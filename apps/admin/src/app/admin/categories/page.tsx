import { headers } from "next/headers";
import { CategoriesClient } from "./categories-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchCategories(cookie?: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${API}/api/products/categories`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    return res.json() as Promise<unknown[]>;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const initialCategories = await fetchCategories(cookie);

  return <CategoriesClient initialCategories={initialCategories} />;
}
