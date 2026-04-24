"use client";
import useSWR from "swr";
import { Table, Thead, Th, Tr, Td, Spinner, Alert, Card } from "@saas-shop/ui";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function InventoryPage() {
  const { data, error, isLoading } = useSWR("/api/inventory/levels", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Inventory</h1>
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
                <Th>SKU</Th>
                <Th>Warehouse</Th>
                <Th>Available</Th>
                <Th>Reserved</Th>
                <Th>Incoming</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any, i: number) => (
                <Tr key={row.id ?? i}>
                  <Td>{row.sku ?? "—"}</Td>
                  <Td>{row.warehouse ?? row.warehouseName ?? "—"}</Td>
                  <Td>{row.available ?? "—"}</Td>
                  <Td>{row.reserved ?? "—"}</Td>
                  <Td>{row.incoming ?? "—"}</Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center text-zinc-400 py-8">
                    No inventory data yet
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
