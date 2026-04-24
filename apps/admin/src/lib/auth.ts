export interface Me {
  id: string;
  email: string;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  isImpersonating: boolean;
}

// Server-side: call from Server Components and middleware
export async function getMe(cookieHeader?: string): Promise<Me | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/auth/me`,
      {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<Me>;
  } catch {
    return null;
  }
}
