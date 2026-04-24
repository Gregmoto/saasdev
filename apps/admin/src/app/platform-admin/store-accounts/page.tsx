import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@saas-shop/ui";
import { SuspendAction } from "./suspend-action";

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

async function getStoreAccounts(cookieHeader?: string): Promise<StoreAccountRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/platform/store-accounts`, {
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

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "suspended") return "danger";
  if (status === "pending") return "warning";
  return "default";
}

export default async function PlatformStoreAccountsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const accounts = await getStoreAccounts(cookie);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Store Accounts</h1>
      <p className="text-zinc-500 mb-8">All store accounts on the platform.</p>

      <div className="bg-white rounded-xl border border-zinc-200">
        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400">No store accounts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Mode</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-6 py-3 font-medium text-zinc-900">{account.name}</td>
                  <td className="px-6 py-3 text-zinc-500 capitalize">{account.mode}</td>
                  <td className="px-6 py-3">
                    <Badge variant={statusVariant(account.status)}>{account.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">{account.plan}</td>
                  <td className="px-6 py-3 text-zinc-400">
                    {account.createdAt
                      ? new Date(account.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href="/admin/dashboard"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Manage
                      </Link>
                      {account.status !== "suspended" && (
                        <SuspendAction accountId={account.id} accountName={account.name} />
                      )}
                    </div>
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
