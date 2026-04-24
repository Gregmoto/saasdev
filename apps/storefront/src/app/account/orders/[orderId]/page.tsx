import { headers } from "next/headers";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface LineItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  lineItems: LineItem[];
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  subtotal: number;
  shippingCost: number;
  totalCents: number;
  currency: string;
}

async function fetchOrder(orderId: string, cookie?: string): Promise<OrderDetail | null> {
  try {
    const res = await fetch(`${API}/api/orders/${orderId}`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return (await res.json()) as OrderDetail;
  } catch {
    return null;
  }
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
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatKr(cents: number): string {
  return `${(cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const order = await fetchOrder(orderId, cookie);

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">Order not found or could not be loaded.</p>
          <Link
            href="/account/orders"
            className="mt-4 inline-block px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
          >
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const lineItems: LineItem[] = order.lineItems ?? [];
  const addr = order.shippingAddress;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Order #{order.orderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleDateString("sv-SE")}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(order.status)}`}
        >
          {order.status}
        </span>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Items</h2>
        {lineItems.length === 0 ? (
          <p className="text-sm text-gray-500">No items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Unit price</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-gray-900">{item.name}</td>
                    <td className="py-3 text-gray-500">{item.sku ?? "—"}</td>
                    <td className="py-3 text-right text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-700">{formatKr(item.unitPrice)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatKr(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatKr(order.subtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>{formatKr(order.shippingCost ?? 0)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
            <span>Total</span>
            <span>{formatKr(order.totalCents ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Shipping address</h2>
          <address className="text-sm text-gray-700 not-italic space-y-0.5">
            {[addr.firstName, addr.lastName].filter(Boolean).join(" ") && (
              <p>{[addr.firstName, addr.lastName].filter(Boolean).join(" ")}</p>
            )}
            {addr.address1 && <p>{addr.address1}</p>}
            {(addr.zip || addr.city) && (
              <p>{[addr.zip, addr.city].filter(Boolean).join(" ")}</p>
            )}
            {addr.country && <p>{addr.country}</p>}
          </address>
        </div>
      )}

      <div>
        <Link
          href="/account/orders"
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
        >
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
