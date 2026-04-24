import { headers } from "next/headers";
import { OrdersClient } from "./orders-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface VendorOrder {
  id: string;
  orderRef: string;
  customerName?: string;
  customerEmail?: string;
  productCount?: number;
  total: number;
  currency?: string;
  status: string;
  createdAt: string;
}

async function fetchOrders(cookie?: string): Promise<{ items: VendorOrder[]; total: number }> {
  try {
    const res = await fetch(`${API}/api/marketplace/vendor-orders?page=1&limit=20`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return { items: [], total: 0 };
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return { items: [], total: 0 };
    const data = (await res.json()) as { items?: VendorOrder[]; total?: number } | VendorOrder[];
    if (Array.isArray(data)) return { items: data, total: data.length };
    return { items: data.items ?? [], total: data.total ?? data.items?.length ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function VendorOrdersPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const { items, total } = await fetchOrders(cookie);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Beställningar</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Hantera dina beställningar</p>
      </div>
      <OrdersClient initialOrders={items} totalCount={total} />
    </div>
  );
}
