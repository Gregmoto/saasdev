import { headers } from "next/headers";
import { LaunchClient } from "./launch-client";

export interface LaunchCheck {
  key: string;
  label: string;
  detail: string;
  result: "pass" | "warn" | "fail";
}

export interface LaunchReadiness {
  checks: LaunchCheck[];
  overallReady: boolean;
  blockers: string[];
}

const EMPTY: LaunchReadiness = {
  checks: [],
  overallReady: false,
  blockers: [],
};

async function fetchReadiness(cookie?: string): Promise<LaunchReadiness> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${API}/api/store/launch-readiness`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return EMPTY;
    return await res.json();
  } catch {
    return EMPTY;
  }
}

export default async function LaunchPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const data = await fetchReadiness(cookie);
  return <LaunchClient initialData={data} />;
}
