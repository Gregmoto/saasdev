"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Table, Thead, Th, Tr, Td, Badge, Spinner, Alert, Card } from "@saas-shop/ui";



export default function ProductsPage() {
  const { data, error, isLoading } = useSWR("/api/products", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
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
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Inventory</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any) => (
                <Tr key={row.id}>
                  <Td>{row.sku ?? "—"}</Td>
                  <Td>{row.title ?? row.name ?? "—"}</Td>
                  <Td>
                    <Badge>{row.status ?? "—"}</Badge>
                  </Td>
                  <Td>{row.price != null ? `kr ${row.price}` : "—"}</Td>
                  <Td>{row.inventory ?? "—"}</Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center text-zinc-400 py-8">
                    No products yet
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
