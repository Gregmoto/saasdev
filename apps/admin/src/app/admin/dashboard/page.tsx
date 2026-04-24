import { headers } from "next/headers";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-shop/ui";
import { Badge } from "@saas-shop/ui";
import { DateRangePicker } from "./date-range-picker";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverviewData {
  orders: number;
  revenue: number;
  netRevenue: number;
  aov: number;
  refunds: number;
  newCustomers: number;
  prevOrders: number;
  prevRevenue: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  status: string;
  paymentStatus: string;
  totalCents: number;
  currency: string;
  createdAt: string;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  inventoryQuantity: number;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function formatKr(cents: number): string {
  return `${(cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr`;
}

function trendIndicator(current: number, prev: number): { label: string; up: boolean | null } {
  if (prev === 0) return { label: "–", up: null };
  const pct = Math.round(((current - prev) / prev) * 100);
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function defaultRange(from?: string, to?: string): { from: string; to: string } {
  const toDate = to ?? new Date().toISOString();
  const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return { from: fromDate, to: toDate };
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "delivered":
    case "fulfilled":
    case "paid":
    case "published":
      return "success";
    case "pending":
    case "processing":
    case "partial":
    case "unpaid":
    case "draft":
      return "warning";
    case "cancelled":
    case "refunded":
    case "returned":
      return "danger";
    default:
      return "default";
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchOverview(
  cookieHeader: string,
  from: string,
  to: string,
): Promise<OverviewData> {
  const zeros: OverviewData = {
    orders: 0, revenue: 0, netRevenue: 0, aov: 0,
    refunds: 0, newCustomers: 0, prevOrders: 0, prevRevenue: 0,
  };
  try {
    const url = `${BASE}/api/analytics/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return zeros;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return zeros;
    return (await res.json()) as OverviewData;
  } catch {
    return zeros;
  }
}

async function fetchRecentOrders(cookieHeader: string): Promise<OrderRow[]> {
  try {
    const res = await fetch(`${BASE}/api/orders?limit=5&sort=createdAt&order=desc`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return [];
    const data = (await res.json()) as { items?: OrderRow[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function fetchLowStockProducts(cookieHeader: string): Promise<ProductRow[]> {
  try {
    const res = await fetch(`${BASE}/api/products?lowStock=true&limit=5`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return [];
    const data = (await res.json()) as { items?: ProductRow[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const sp = await searchParams;
  const { from, to } = defaultRange(sp.from, sp.to);

  const [overview, recentOrders, lowStockProducts] = await Promise.all([
    fetchOverview(cookieHeader, from, to),
    fetchRecentOrders(cookieHeader),
    fetchLowStockProducts(cookieHeader),
  ]);

  const ordersTrend = trendIndicator(overview.orders, overview.prevOrders);
  const revenueTrend = trendIndicator(overview.revenue, overview.prevRevenue);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Översikt för din butik</p>
        </div>
        <Suspense>
          <DateRangePicker from={from} to={to} />
        </Suspense>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ordrar"
          value={overview.orders.toLocaleString("sv-SE")}
          trend={ordersTrend}
        />
        <KpiCard
          label="Bruttoförsäljning"
          value={formatKr(overview.revenue)}
          trend={revenueTrend}
        />
        <KpiCard
          label="AOV"
          value={formatKr(overview.aov)}
          trend={{ label: "–", up: null }}
        />
        <KpiCard
          label="Nya kunder"
          value={overview.newCustomers.toLocaleString("sv-SE")}
          trend={{ label: "–", up: null }}
        />
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle>Senaste ordrar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="px-6 py-4 text-sm text-zinc-500">Inga ordrar ännu.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        #{order.orderNumber}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {order.customerEmail ??
                          ([order.customerFirstName, order.customerLastName]
                            .filter(Boolean)
                            .join(" ") ||
                          "Okänd kund")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                      <span className="text-sm font-medium text-zinc-700">
                        {formatKr(order.totalCents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock products */}
        <Card>
          <CardHeader>
            <CardTitle>Lågt lager</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockProducts.length === 0 ? (
              <p className="px-6 py-4 text-sm text-zinc-500">Inga produkter med lågt lager.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-zinc-500 truncate">SKU: {product.sku}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={product.inventoryQuantity === 0 ? "danger" : "warning"}>
                        {product.inventoryQuantity} i lager
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── KPI card sub-component ────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: { label: string; up: boolean | null };
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-500 font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-900">{value}</div>
        {trend.up !== null ? (
          <p
            className={`mt-1 text-xs font-medium ${
              trend.up ? "text-green-600" : "text-red-500"
            }`}
          >
            {trend.up ? "▲" : "▼"} {trend.label} jämfört med föregående period
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-400">–</p>
        )}
      </CardContent>
    </Card>
  );
}
