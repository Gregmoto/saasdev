import { headers } from "next/headers";
import { FaqManager } from "./faq-manager";
import type { StoreFaq } from "./faq-manager";

async function fetchFaqs(cookieHeader: string): Promise<StoreFaq[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/faqs`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return [];
    return res.json() as Promise<StoreFaq[]>;
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";
  const initialFaqs = await fetchFaqs(cookie);

  return <FaqManager initialFaqs={initialFaqs} />;
}
