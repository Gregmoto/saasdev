import { headers } from "next/headers";
import { BrandsClient } from "./brands-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchBrands(cookie?: string): Promise<unknown[]> {
  try {
    const res = await fetch(`${API}/api/products/brands`, {
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

export default async function BrandsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const initialBrands = await fetchBrands(cookie);

  return <BrandsClient initialBrands={initialBrands} />;
}
