import { headers } from "next/headers";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalCents: number;
  currency?: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "delivered":
    case "fulfilled":
      return "bg-green-100 text-green-700";
    case "pending":
    case "processing":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
    case "refunded":
      return "bg-red-100 text-red-700";
    case "shipped":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatKr(cents: number): string {
  return `${(cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr`;
}

async function fetchOrders(cookie?: string): Promise<Order[]> {
  const endpoints = ["/api/orders/my", "/api/customers/me/orders", "/api/orders?customerId=me"];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: cookie ? { cookie } : {},
        cache: "no-store",
      });
      if (!res.ok) continue;
      if (!(res.headers.get("content-type") ?? "").includes("application/json")) continue;
      const data = (await res.json()) as { items?: Order[] } | Order[];
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch {
      continue;
    }
  }
  return [];
}

export default async function AccountOrdersPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const orders = await fetchOrders(cookie);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">No orders yet.</p>
          <p className="text-sm text-gray-400 mt-1">When you place orders, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Order #</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-4 font-medium text-gray-900">
                    #{order.orderNumber ?? order.id}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("sv-SE")
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-gray-900">
                    {formatKr(order.totalCents ?? 0)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium underline underline-offset-2"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
