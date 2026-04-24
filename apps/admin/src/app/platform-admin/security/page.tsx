import { headers } from "next/headers";

interface AuditLogRow {
  id: string;
  actorUserId: string | null;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

async function getAuditLogs(cookieHeader?: string): Promise<AuditLogRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/platform/logs/audit?limit=50`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    return (await res.json()) as AuditLogRow[];
  } catch {
    return [];
  }
}

export default async function PlatformSecurityPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const logs = await getAuditLogs(cookie);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Security Logs</h1>
      <p className="text-zinc-500 mb-8">Audit trail for all privileged actions on the platform.</p>

      <div className="bg-white rounded-xl border border-zinc-200">
        {logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400">
            No audit log entries found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500">
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-6 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-6 py-3 text-zinc-400 whitespace-nowrap">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-zinc-500 font-mono text-xs">
                    {log.actorUserId ? log.actorUserId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td className="px-6 py-3 font-medium text-zinc-800">{log.actionType}</td>
                  <td className="px-6 py-3 text-zinc-500">
                    {log.entityType ?? "—"}
                    {log.entityId ? (
                      <span className="text-zinc-400 font-mono text-xs ml-1">
                        ({log.entityId.slice(0, 8)}…)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-3 text-zinc-400">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
