import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { Providers } from "./providers";
import { PlanUsageBanner } from "@/components/plan-usage-banner";

// Roles permitted in the /admin portal
const ADMIN_ROLES = new Set(["store_admin", "store_staff", "marketplace_owner"]);

async function getPortalContext(cookieHeader?: string) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/auth/portal`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return await res.json() as {
      redirect: string;
      context: string;
      storeAccount?: { id: string; name: string };
    };
  } catch {
    return null;
  }
}

async function getStoreSettings(cookieHeader?: string): Promise<{ name: string; slug: string } | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/store/settings`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    const data = await res.json() as { name?: string; slug?: string };
    return { name: data.name ?? "My Store", slug: data.slug ?? "" };
  } catch {
    return null;
  }
}

async function logAccessDenied(cookieHeader: string | undefined, path: string, userId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    await fetch(`${base}/api/security/access-denied`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ path, userId, portal: "admin" }),
    });
  } catch { /* non-blocking */ }
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

  // Enforce role: only store_admin / store_staff / marketplace_owner
  const portal = await getPortalContext(cookie);
  if (portal) {
    if (portal.context === "platform") {
      // Platform super admin — redirect to their portal
      await logAccessDenied(cookie, "/admin", me.id);
      redirect("/platform-admin/dashboard");
    }
    if (portal.redirect && portal.redirect !== "/admin") {
      // Vendor or reseller tried to access /admin
      await logAccessDenied(cookie, "/admin", me.id);
      redirect("/access-denied");
    }
  }

  const store = await getStoreSettings(cookie);
  return (
    <AdminShell user={me} storeName={store?.name ?? "My Store"} storeSlug={store?.slug ?? ""}>
      <Providers>
        <PlanUsageBanner />
        {children}
      </Providers>
    </AdminShell>
  );
}
