export interface CustomerMe {
  id: string;
  email: string;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  isImpersonating: boolean;
  isPlatformAdmin: boolean;
}

export async function getCustomerMe(cookieHeader?: string): Promise<CustomerMe | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/auth/me`,
      { headers: cookieHeader ? { cookie: cookieHeader } : {}, cache: "no-store" },
    );
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return null;
    return await res.json() as CustomerMe;
  } catch {
    return null;
  }
}
