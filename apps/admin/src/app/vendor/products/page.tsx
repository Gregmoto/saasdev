import { headers } from "next/headers";
import Link from "next/link";
import { Card, Table, Thead, Th, Tr, Td, Badge } from "@saas-shop/ui";
import { getMe } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  type?: string;
  inventoryQuantity?: number;
  price?: number;
  currency?: string;
}

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "published":
    case "active":
      return "success";
    case "draft":
      return "warning";
    case "archived":
    case "inactive":
      return "danger";
    default:
      return "default";
  }
}

async function fetchProducts(cookie?: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API}/api/products`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    const data = (await res.json()) as { items?: Product[] } | Product[];
    return Array.isArray(data) ? data : (data.items ?? []);
  } catch {
    return [];
  }
}

export default async function VendorProductsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const [products, me] = await Promise.all([
    fetchProducts(cookie),
    getMe(cookie),
  ]);

  const isAdmin = (me as unknown as { role?: string })?.role === "vendor_admin";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Produkter</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {isAdmin ? "Visa och hantera dina produkter" : "Visa dina produkter (skrivskyddad)"}
        </p>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Namn</Th>
              <Th>SKU</Th>
              <Th>Status</Th>
              <Th>Typ</Th>
              <Th>Lager</Th>
              {isAdmin && <Th>Åtgärd</Th>}
            </tr>
          </Thead>
          <tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td className="font-medium">{product.name}</Td>
                <Td className="text-zinc-500">{product.sku ?? "—"}</Td>
                <Td>
                  <Badge variant={statusBadgeVariant(product.status)}>
                    {product.status}
                  </Badge>
                </Td>
                <Td>{product.type ?? "—"}</Td>
                <Td>{product.inventoryQuantity ?? "—"}</Td>
                {isAdmin && (
                  <Td>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Redigera
                    </Link>
                  </Td>
                )}
              </Tr>
            ))}
            {products.length === 0 && (
              <tr>
                <Td colSpan={isAdmin ? 6 : 5} className="text-center text-zinc-400 py-8">
                  Inga produkter hittades
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
