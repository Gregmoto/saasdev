import { headers } from "next/headers";
import { JobsClient } from "./jobs-client";

export interface Job {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | "retrying";
  progress: number;
  progressMessage: string | null;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

async function fetchJobs(cookie?: string): Promise<Job[]> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${API}/api/jobs?limit=50`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function JobsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const jobs = await fetchJobs(cookie);
  return <JobsClient initialJobs={jobs} />;
}
