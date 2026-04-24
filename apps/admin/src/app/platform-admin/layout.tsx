import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { PlatformAdminShell } from "@/components/platform-admin-shell";

async function getPortalContext(cookieHeader?: string) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/auth/portal`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
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

async function logAccessDenied(
  cookieHeader: string | undefined,
  path: string,
  userId: string,
) {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    await fetch(`${base}/api/security/access-denied`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ path, portal: "platform-admin", userId }),
    });
  } catch {
    /* non-blocking */
  }
}

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;

  const me = await getMe(cookie);
  if (!me) redirect("/login");

  const portal = await getPortalContext(cookie);
  if (!portal || portal.context !== "platform") {
    await logAccessDenied(cookie, "/platform-admin", me.id);
    redirect("/access-denied");
  }

  return (
    <PlatformAdminShell user={me}>
      {children}
    </PlatformAdminShell>
  );
}
