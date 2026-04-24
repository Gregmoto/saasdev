import { headers } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface RMA {
  id: string;
  rmaNumber?: string;
  orderId?: string;
  orderNumber?: string;
  status: string;
  createdAt: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-green-100 text-green-700";
    case "pending":
    case "requested":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "processing":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

async function fetchRMA(cookie?: string): Promise<RMA[]> {
  try {
    const res = await fetch(`${API}/api/rma`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = (await res.json()) as { items?: RMA[] } | RMA[];
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export default async function AccountRMAPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const rmas = await fetchRMA(cookie);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Returns (RMA)</h1>

      {rmas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">No return requests yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            If you need to return a product, please contact support.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">RMA #</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rmas.map((rma) => (
                <tr key={rma.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-4 font-medium text-gray-900">
                    {rma.rmaNumber ?? rma.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {rma.orderNumber ? `#${rma.orderNumber}` : rma.orderId ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(rma.status)}`}
                    >
                      {rma.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {rma.createdAt
                      ? new Date(rma.createdAt).toLocaleDateString("sv-SE")
                      : "—"}
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
