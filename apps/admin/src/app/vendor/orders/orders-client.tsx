"use client";
import { useState } from "react";
import { Badge, Table, Thead, Th, Tr, Td, Card, Spinner, Alert } from "@saas-shop/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface VendorOrder {
  id: string;
  orderRef: string;
  customerName?: string;
  customerEmail?: string;
  productCount?: number;
  total: number;
  currency?: string;
  status: string;
  createdAt: string;
}

const ALL_STATUSES = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

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

export function OrdersClient({
  initialOrders,
  totalCount,
}: {
  initialOrders: VendorOrder[];
  totalCount: number;
}) {
  const [orders, setOrders] = useState<VendorOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const filtered = statusFilter === "all"
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  async function loadPage(newPage: number, filter: string) {
    setLoading(true);
    setError("");
    try {
      const statusQ = filter !== "all" ? `&status=${filter}` : "";
      const res = await fetch(
        `${API}/api/marketplace/vendor-orders?page=${newPage}&limit=${limit}${statusQ}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load orders");
      if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
        throw new Error("Unexpected response");
      }
      const data = (await res.json()) as { items?: VendorOrder[] } | VendorOrder[];
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setOrders(items);
      setPage(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/api/marketplace/vendor-orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleFilterChange(filter: string) {
    setStatusFilter(filter);
    loadPage(1, filter);
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-emerald-700 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {s === "all" ? "Alla" : s}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Order ref</Th>
                <Th>Kund</Th>
                <Th>Produkter</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Datum</Th>
                <Th>Åtgärd</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.map((order) => (
                <Tr key={order.id}>
                  <Td className="font-medium">#{order.orderRef ?? order.id}</Td>
                  <Td>{order.customerName ?? order.customerEmail ?? "—"}</Td>
                  <Td>{order.productCount ?? "—"}</Td>
                  <Td>{formatAmount(order.total, order.currency)}</Td>
                  <Td>
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </Td>
                  <Td>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("sv-SE")
                      : "—"}
                  </Td>
                  <Td>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-700 disabled:opacity-50"
                    >
                      {ALL_STATUSES.filter((s) => s !== "all").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <Td colSpan={7} className="text-center text-zinc-400 py-8">
                    Inga beställningar hittades
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>Sida {page} av {totalPages}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => loadPage(page - 1, statusFilter)}
            className="px-3 py-1 rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
          >
            ← Föregående
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => loadPage(page + 1, statusFilter)}
            className="px-3 py-1 rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
          >
            Nästa →
          </button>
        </div>
      </div>
    </div>
  );
}
