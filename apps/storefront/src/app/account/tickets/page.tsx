import { headers } from "next/headers";
import { NewTicketForm } from "./new-ticket-form";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  updatedAt?: string;
  createdAt: string;
}

function statusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-700";
    case "in_progress":
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "resolved":
    case "closed":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

async function fetchTickets(cookie?: string): Promise<Ticket[]> {
  const endpoints = ["/api/tickets/my", "/api/tickets?submittedBy=me"];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: cookie ? { cookie } : {},
        cache: "no-store",
      });
      if (!res.ok) continue;
      if (!(res.headers.get("content-type") ?? "").includes("application/json")) continue;
      const data = (await res.json()) as { items?: Ticket[] } | Ticket[];
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch {
      continue;
    }
  }
  return [];
}

export default async function AccountTicketsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const tickets = await fetchTickets(cookie);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Support tickets</h1>
      </div>

      <NewTicketForm />

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">No support tickets yet.</p>
          <p className="text-sm text-gray-400 mt-1">Use the form above to contact support.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-4 text-gray-900">{ticket.subject}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {ticket.updatedAt
                      ? new Date(ticket.updatedAt).toLocaleDateString("sv-SE")
                      : ticket.createdAt
                      ? new Date(ticket.createdAt).toLocaleDateString("sv-SE")
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
