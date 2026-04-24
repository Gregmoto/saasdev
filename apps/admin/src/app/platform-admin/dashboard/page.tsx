import Link from "next/link";
import { headers } from "next/headers";
import { Badge } from "@saas-shop/ui";

interface StoreAccountRow {
  id: string;
  name: string;
  slug: string;
  mode: string;
  plan: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

async function getRecentStoreAccounts(cookieHeader?: string): Promise<StoreAccountRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/platform/store-accounts?limit=5`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    return (await res.json()) as StoreAccountRow[];
  } catch {
    return [];
  }
}

async function getTotalStoreAccounts(cookieHeader?: string): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/platform/store-accounts?limit=1000`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return 0;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return 0;
    const data = (await res.json()) as StoreAccountRow[];
    return data.length;
  } catch {
    return 0;
  }
}

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  if (status === "pending") return "warning";
  return "default";
}

export default async function PlatformAdminDashboardPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;

  const [accounts, total] = await Promise.all([
    getRecentStoreAccounts(cookie),
    getTotalStoreAccounts(cookie),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Platform Overview</h1>
      <p className="text-zinc-500 mb-8">Global health of the SaaS platform.</p>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="text-sm text-zinc-500 mb-1">Total Store Accounts</div>
          <div className="text-3xl font-bold text-zinc-900">{total}</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="text-sm text-zinc-500 mb-1">Active Accounts</div>
          <div className="text-3xl font-bold text-green-600">
            {accounts.filter((a) => a.status === "active").length}
          </div>
          <div className="text-xs text-zinc-400 mt-1">(of last 5 shown)</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <div className="text-sm text-zinc-500 mb-1">Suspended</div>
          <div className="text-3xl font-bold text-red-600">
            {accounts.filter((a) => a.status === "suspended").length}
          </div>
          <div className="text-xs text-zinc-400 mt-1">(of last 5 shown)</div>
        </div>
      </div>

      {/* Recent store accounts */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Most Recent Store Accounts</h2>
          <Link
            href="/platform-admin/store-accounts"
            className="text-sm text-blue-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        {accounts.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-400">No store accounts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Mode</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                  <td className="px-6 py-3 font-medium text-zinc-900">{account.name}</td>
                  <td className="px-6 py-3 text-zinc-500 capitalize">{account.mode}</td>
                  <td className="px-6 py-3">
                    <Badge variant={statusVariant(account.status)}>
                      {account.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-zinc-400">
                    {account.createdAt
                      ? new Date(account.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
