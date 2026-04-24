import { headers } from "next/headers";
import { Card, Table, Thead, Th, Tr, Td, Badge } from "@saas-shop/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Settlement {
  id: string;
  period: string;
  status: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  currency?: string;
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "paid":
      return "success";
    case "open":
      return "info";
    case "closed":
      return "warning";
    default:
      return "default";
  }
}

function formatAmount(amount: number, currency = "SEK"): string {
  return `${amount.toLocaleString("sv-SE")} ${currency}`;
}

async function fetchSettlements(cookie?: string): Promise<Settlement[]> {
  try {
    const res = await fetch(`${API}/api/marketplace/settlements`, {
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

export default async function VendorPayoutsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const settlements = await fetchSettlements(cookie);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Utbetalningar</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Dina avräkningar och utbetalningar</p>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Period</Th>
              <Th>Status</Th>
              <Th>Brutto</Th>
              <Th>Provision</Th>
              <Th>Netto (utbetalning)</Th>
            </tr>
          </Thead>
          <tbody>
            {settlements.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.period ?? "—"}</Td>
                <Td>
                  <Badge variant={statusBadgeVariant(s.status)}>
                    {s.status}
                  </Badge>
                </Td>
                <Td>{formatAmount(s.grossAmount ?? 0, s.currency)}</Td>
                <Td>{formatAmount(s.commissionAmount ?? 0, s.currency)}</Td>
                <Td className="font-semibold">
                  {formatAmount(s.netAmount ?? 0, s.currency)}
                </Td>
              </Tr>
            ))}
            {settlements.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center text-zinc-400 py-8">
                  Inga avräkningar hittades
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
