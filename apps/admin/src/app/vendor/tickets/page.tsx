import { headers } from "next/headers";
import { Card, Table, Thead, Th, Tr, Td, Badge } from "@saas-shop/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  createdAt: string;
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "open":
      return "info";
    case "in_progress":
    case "pending":
      return "warning";
    case "resolved":
    case "closed":
      return "success";
    default:
      return "default";
  }
}

function priorityBadgeVariant(
  priority: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (priority) {
    case "high":
    case "urgent":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "default";
    default:
      return "default";
  }
}

async function fetchTickets(cookie?: string): Promise<Ticket[]> {
  try {
    const res = await fetch(`${API}/api/tickets?limit=20`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = (await res.json()) as { items?: Ticket[] } | Ticket[];
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export default async function VendorTicketsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const tickets = await fetchTickets(cookie);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Ärenden</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Supportärenden från kunder</p>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Ämne</Th>
              <Th>Status</Th>
              <Th>Prioritet</Th>
              <Th>Skapad</Th>
            </tr>
          </Thead>
          <tbody>
            {tickets.map((ticket) => (
              <Tr key={ticket.id}>
                <Td className="font-mono text-xs text-zinc-500">
                  {ticket.id.slice(0, 8)}…
                </Td>
                <Td className="font-medium">{ticket.subject}</Td>
                <Td>
                  <Badge variant={statusBadgeVariant(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </Td>
                <Td>
                  {ticket.priority ? (
                    <Badge variant={priorityBadgeVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  {ticket.createdAt
                    ? new Date(ticket.createdAt).toLocaleDateString("sv-SE")
                    : "—"}
                </Td>
              </Tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center text-zinc-400 py-8">
                  Inga ärenden hittades
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
