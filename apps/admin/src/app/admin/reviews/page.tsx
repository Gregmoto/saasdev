"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Table, Thead, Th, Tr, Td, Badge, Spinner, Alert, Card } from "@saas-shop/ui";



function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400">
      {"★".repeat(Math.min(5, Math.max(0, rating)))}
      {"☆".repeat(5 - Math.min(5, Math.max(0, rating)))}
    </span>
  );
}

export default function ReviewsPage() {
  const { data, error, isLoading } = useSWR("/api/reviews", fetcher);
  const rows: any[] = data?.items ?? data ?? [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Reviews</h1>
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
                <Th>Product</Th>
                <Th>Rating</Th>
                <Th>Author</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row: any) => (
                <Tr key={row.id}>
                  <Td>{row.product ?? row.productName ?? row.productId ?? "—"}</Td>
                  <Td>
                    {row.rating != null ? (
                      <StarRating rating={row.rating} />
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{row.author ?? row.authorName ?? row.customerName ?? "—"}</Td>
                  <Td>
                    <Badge>{row.status ?? "—"}</Badge>
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
                    No reviews yet
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
