"use client";
import useSWR from "swr";
import { Table, Thead, Th, Tr, Td, Badge, Spinner, Alert, Card } from "@saas-shop/ui";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function ImportsPage() {
  const { data, error, isLoading } = useSWR("/api/import/jobs", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Imports</h1>
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
                <Th>Job ID</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any) => (
                <Tr key={row.id}>
                  <Td className="font-mono text-xs">{row.id}</Td>
                  <Td>{row.type ?? "—"}</Td>
                  <Td>
                    <Badge>{row.status ?? "—"}</Badge>
                  </Td>
                  <Td>
                    {row.progress != null ? `${row.progress}%` : "—"}
                  </Td>
                  <Td>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "—"}
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center text-zinc-400 py-8">
                    No import jobs yet
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
