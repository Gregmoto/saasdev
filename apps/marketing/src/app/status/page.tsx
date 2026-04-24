import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";
import StatusClient from "./status-client";

export const metadata: Metadata = buildMetadata({
  title: "Systemstatus — ShopMan",
  description: "Aktuell status för ShopMans tjänster. Se pågående incidenter, planerat underhåll och historik.",
  path: "/status",
});

export const revalidate = 60;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ComponentStatus = "operational" | "degraded_performance" | "partial_outage" | "major_outage" | "under_maintenance";

type StatusData = {
  status: ComponentStatus;
  components: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    groupName: string | null;
    status: ComponentStatus;
    sortOrder: number;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    startedAt: string;
    resolvedAt: string | null;
    updates: Array<{ id: string; status: string; message: string; createdAt: string }>;
  }>;
  maintenances: Array<{
    id: string;
    title: string;
    description: string | null;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
  }>;
  updatedAt: string;
};

const FALLBACK: StatusData = {
  status: "operational",
  components: [
    { id: "1", name: "API", slug: "api", description: "Backend API", groupName: "Kärntjänster", status: "operational", sortOrder: 1 },
    { id: "2", name: "Admin-panel", slug: "admin", description: "Adminpanel för butiker", groupName: "Kärntjänster", status: "operational", sortOrder: 2 },
    { id: "3", name: "Butiksfront", slug: "storefront", description: "Kundinriktad butik", groupName: "Kärntjänster", status: "operational", sortOrder: 3 },
    { id: "4", name: "Klarna", slug: "klarna", description: "Klarna betalgateway", groupName: "Integrationer", status: "operational", sortOrder: 4 },
    { id: "5", name: "Leverantörssynk", slug: "supplier-sync", description: "Automatisk produktsynk", groupName: "Integrationer", status: "operational", sortOrder: 5 },
    { id: "6", name: "E-post", slug: "email", description: "Transaktionsmejl och notiser", groupName: "Integrationer", status: "operational", sortOrder: 6 },
  ],
  incidents: [],
  maintenances: [],
  updatedAt: new Date().toISOString(),
};

async function fetchStatus(): Promise<StatusData> {
  try {
    const res = await fetch(`${API}/api/public/status`, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK;
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return FALLBACK;
    const data = await res.json() as StatusData;
    if (!data?.components) return FALLBACK;
    return data;
  } catch {
    return FALLBACK;
  }
}

export default async function StatusPage() {
  const data = await fetchStatus();
  return <StatusClient data={data} />;
}
