import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@saas-shop/ui";

const STATS = [
  { label: "Total Orders", value: "0" },
  { label: "Revenue", value: "kr 0" },
  { label: "Customers", value: "0" },
  { label: "Products", value: "0" },
];

export default async function DashboardPage() {
  const hdrs = await headers();
  const me = await getMe(hdrs.get("cookie") ?? undefined);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Welcome back, {me?.email}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm text-zinc-500 font-medium">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-500 text-sm">
              No recent activity yet. Start by adding products or importing data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
