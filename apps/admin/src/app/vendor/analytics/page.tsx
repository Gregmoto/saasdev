import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-shop/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface AnalyticsOverview {
  orders?: number;
  revenue?: number;
  netRevenue?: number;
  aov?: number;
  newCustomers?: number;
}

async function fetchAnalytics(cookie?: string): Promise<AnalyticsOverview> {
  try {
    const res = await fetch(`${API}/api/analytics/overview`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return {};
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return {};
    return (await res.json()) as AnalyticsOverview;
  } catch {
    return {};
  }
}

function formatKr(cents: number): string {
  return `${(cents / 100).toLocaleString("sv-SE", { minimumFractionDigits: 0 })} kr`;
}

export default async function VendorAnalyticsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const data = await fetchAnalytics(cookie);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Analys</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Försäljningsöversikt</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Ordrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">
              {data.orders?.toLocaleString("sv-SE") ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Bruttoförsäljning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">
              {data.revenue != null ? formatKr(data.revenue) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">Nettoförsäljning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">
              {data.netRevenue != null ? formatKr(data.netRevenue) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500 font-medium">AOV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">
              {data.aov != null ? formatKr(data.aov) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(data).length === 0 && (
        <div className="text-sm text-zinc-400 text-center py-8">
          Analysdata är inte tillgänglig just nu.
        </div>
      )}
    </div>
  );
}
