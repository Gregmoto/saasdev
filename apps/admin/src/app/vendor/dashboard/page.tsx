import { headers } from "next/headers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, Thead, Th, Tr, Td } from "@saas-shop/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface VendorOrder {
  id: string;
  orderRef: string;
  status: string;
  customerName?: string;
  total: number;
  currency?: string;
  createdAt: string;
}

interface Settlement {
  id: string;
  period: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
}

async function fetchRecentOrders(cookie?: string): Promise<VendorOrder[]> {
  try {
    const res = await fetch(`${API}/api/marketplace/vendor-orders?limit=5`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = (await res.json()) as { items?: VendorOrder[] } | VendorOrder[];
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

async function fetchOpenSettlements(cookie?: string): Promise<Settlement[]> {
  try {
    const res = await fetch(`${API}/api/marketplace/settlements?status=open`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = (await res.json()) as { items?: Settlement[] } | Settlement[];
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "delivered":
    case "confirmed":
      return "success";
    case "pending":
    case "processing":
      return "warning";
    case "shipped":
      return "info";
    case "cancelled":
      return "danger";
    default:
      return "default";
  }
}

function formatAmount(amount: number, currency = "SEK"): string {
  return `${amount.toLocaleString("sv-SE")} ${currency}`;
}

export default async function VendorDashboardPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;

  const [recentOrders, openSettlements] = await Promise.all([
    fetchRecentOrders(cookie),
    fetchOpenSettlements(cookie),
  ]);

  const pendingCount = recentOrders.filter(
    (o) => o.status === "pending" || o.status === "processing",
  ).length;

  const openSettlementTotal = openSettlements.reduce(
    (sum, s) => sum + (s.netAmount ?? 0),
    0,
  );

  const periodRevenue = openSettlements.reduce(
    (sum, s) => sum + (s.grossAmount ?? 0),
    0,
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Vendor Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Översikt för din butik</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Väntande beställningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Bruttoförsäljning (period)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{formatAmount(periodRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Öppna utbetalningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{formatAmount(openSettlementTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Senaste beställningar</CardTitle>
          <Link
            href="/vendor/orders"
            className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
          >
            Ver alla beställningar →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="px-6 py-4 text-sm text-zinc-500">Inga beställningar ännu.</p>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Order ref</Th>
                  <Th>Status</Th>
                  <Th>Kund</Th>
                  <Th>Total</Th>
                  <Th>Datum</Th>
                </tr>
              </Thead>
              <tbody>
                {recentOrders.map((order) => (
                  <Tr key={order.id}>
                    <Td className="font-medium">#{order.orderRef ?? order.id}</Td>
                    <Td>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </Td>
                    <Td>{order.customerName ?? "—"}</Td>
                    <Td>{formatAmount(order.total, order.currency)}</Td>
                    <Td>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("sv-SE")
                        : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
