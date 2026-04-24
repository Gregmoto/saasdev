import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { VendorShell } from "./vendor-shell";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getPortalContext(cookie?: string) {
  try {
    const res = await fetch(`${API}/auth/portal`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return (await res.json()) as {
      redirect: string;
      context: string;
      storeAccount?: { id: string; name: string };
    };
  } catch {
    return null;
  }
}

async function logAccessDenied(cookie: string | undefined, path: string, userId: string) {
  try {
    await fetch(`${API}/api/security/access-denied`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ path, userId, portal: "vendor" }),
    });
  } catch { }
}

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;

  const me = await getMe(cookie);
  if (!me) redirect("/login");

  const portal = await getPortalContext(cookie);
  if (!portal || portal.redirect !== "/vendor") {
    await logAccessDenied(cookie, "/vendor", me.id);
    redirect("/access-denied");
  }

  return (
    <VendorShell user={me} storeName={portal.storeAccount?.name ?? "My Store"}>
      {children}
    </VendorShell>
  );
}
