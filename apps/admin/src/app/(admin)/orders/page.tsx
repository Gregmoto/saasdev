"use client";
import useSWR from "swr";
import { Table, Thead, Th, Tr, Td, Badge, Spinner, Alert, Card } from "@saas-shop/ui";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function OrdersPage() {
  const { data, error, isLoading } = useSWR("/api/orders", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
      </div>
      <Card>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
        {error && (
          <div className="p-6">
            <Alert variant="error">Failed to load data</Alert>
          </div>
        )}
        {!isLoading && !error && (
          <Table>
            <Thead>
              <tr>
                <Th>Order #</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Total</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any) => (
                <Tr key={row.id}>
                  <Td>{row.orderNumber ?? row.id}</Td>
                  <Td>{row.customer ?? row.customerEmail ?? "—"}</Td>
                  <Td>
                    <Badge>{row.status ?? "—"}</Badge>
                  </Td>
                  <Td>{row.paymentStatus ?? "—"}</Td>
                  <Td>{row.total != null ? `kr ${row.total}` : "—"}</Td>
                  <Td>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "—"}
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={6} className="text-center text-zinc-400 py-8">
                    No orders yet
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
