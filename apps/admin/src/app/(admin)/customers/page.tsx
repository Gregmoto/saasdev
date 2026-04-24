"use client";
import useSWR from "swr";
import { Table, Thead, Th, Tr, Td, Spinner, Alert, Card } from "@saas-shop/ui";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function CustomersPage() {
  const { data, error, isLoading } = useSWR("/api/customers", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Customers</h1>
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
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Orders</Th>
                <Th>Joined</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any) => (
                <Tr key={row.id}>
                  <Td>
                    {(row.name ?? [row.firstName, row.lastName].filter(Boolean).join(" ")) || "—"}
                  </Td>
                  <Td>{row.email ?? "—"}</Td>
                  <Td>{row.ordersCount ?? row.orders ?? "—"}</Td>
                  <Td>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "—"}
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={4} className="text-center text-zinc-400 py-8">
                    No customers yet
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
