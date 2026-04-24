import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getMe } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { Providers } from "./providers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const me = await getMe(hdrs.get("cookie") ?? undefined);
  if (!me) redirect("/login");
  return (
    <AdminShell user={me}>
      <Providers>{children}</Providers>
    </AdminShell>
  );
}
