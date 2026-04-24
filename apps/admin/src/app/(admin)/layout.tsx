import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { Providers } from "./providers";

async function getStoreSettings(cookieHeader?: string): Promise<{ name: string; slug: string } | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/store/settings`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json() as { name?: string; slug?: string };
    return { name: data.name ?? "My Store", slug: data.slug ?? "" };
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const me = await getMe(cookie);
  if (!me) redirect("/login");
  const store = await getStoreSettings(cookie);
  return (
    <AdminShell user={me} storeName={store?.name ?? "My Store"} storeSlug={store?.slug ?? ""}>
      <Providers>{children}</Providers>
    </AdminShell>
  );
}
