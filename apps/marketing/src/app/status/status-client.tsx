"use client";
import { useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

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

const STATUS_CONFIG: Record<ComponentStatus, { label: string; color: string; dot: string; barColor: string }> = {
  operational: { label: "Driftig", color: "text-green-700 bg-green-50", dot: "bg-green-500", barColor: "bg-green-500" },
  degraded_performance: { label: "Försämrad prestanda", color: "text-yellow-700 bg-yellow-50", dot: "bg-yellow-400", barColor: "bg-yellow-400" },
  partial_outage: { label: "Delvis driftstopp", color: "text-orange-700 bg-orange-50", dot: "bg-orange-500", barColor: "bg-orange-500" },
  major_outage: { label: "Driftstopp", color: "text-red-700 bg-red-50", dot: "bg-red-500", barColor: "bg-red-500" },
  under_maintenance: { label: "Underhåll", color: "text-blue-700 bg-blue-50", dot: "bg-blue-400", barColor: "bg-blue-400" },
};

const OVERALL_CONFIG: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  operational: { emoji: "✅", label: "Alla tjänster fungerar normalt", bg: "bg-green-50 border-green-200", text: "text-green-800" },
  degraded_performance: { emoji: "⚠️", label: "Försämrad prestanda på vissa tjänster", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-800" },
  partial_outage: { emoji: "🔶", label: "Partiellt driftstopp", bg: "bg-orange-50 border-orange-200", text: "text-orange-800" },
  major_outage: { emoji: "🔴", label: "Kritiskt driftstopp", bg: "bg-red-50 border-red-200", text: "text-red-800" },
  under_maintenance: { emoji: "🔧", label: "Planerat underhåll pågår", bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}

export default function StatusClient({ data }: { data: StatusData }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const overall = OVERALL_CONFIG[data.status] ?? OVERALL_CONFIG.operational!;

  // Group components by groupName
  const groups = data.components.reduce<Record<string, typeof data.components>>((acc, c) => {
    const key = c.groupName ?? "Övrigt";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(c);
    return acc;
  }, {});

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubscribing(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "";
      await fetch(`${API}/api/public/status/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
    } catch {
      // best-effort
      setSubscribed(true);
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Systemstatus</h1>
          <p className="text-gray-500 text-sm">
            Senast uppdaterad: {formatDate(data.updatedAt)}
          </p>
        </div>

        {/* Overall status banner */}
        <div className={`rounded-2xl border p-5 mb-8 flex items-center gap-4 ${overall.bg}`}>
          <span className="text-2xl">{overall.emoji}</span>
          <span className={`font-semibold text-lg ${overall.text}`}>{overall.label}</span>
        </div>

        {/* Active incidents */}
        {data.incidents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pågående incidenter</h2>
            <div className="space-y-4">
              {data.incidents.map((incident) => (
                <div key={incident.id} className="bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">
                      {incident.impact}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {incident.updates.map((u) => (
                      <div key={u.id} className="text-sm">
                        <span className="font-medium text-gray-700 capitalize">{u.status.replace("_", " ")}</span>
                        <span className="text-gray-400 mx-2">·</span>
                        <span className="text-gray-400">{formatDate(u.createdAt)}</span>
                        <p className="text-gray-600 mt-0.5">{u.message}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Startade: {formatDate(incident.startedAt)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming maintenance */}
        {data.maintenances.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Planerat underhåll</h2>
            <div className="space-y-3">
              {data.maintenances.map((m) => (
                <div key={m.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-1">{m.title}</h3>
                  {m.description && <p className="text-sm text-gray-600 mb-2">{m.description}</p>}
                  <p className="text-xs text-gray-500">
                    {formatDate(m.scheduledStart)} – {formatDate(m.scheduledEnd)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Component groups */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tjänster</h2>
          <div className="space-y-6">
            {Object.entries(groups).map(([groupName, components]) => (
              <div key={groupName}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupName}</h3>
                <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                  {components.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.operational!;
                    return (
                      <div key={c.id} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            {c.description && (
                              <p className="text-xs text-gray-400">{c.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Email subscription */}
        <section className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Få statusuppdateringar via e-post</h2>
          <p className="text-sm text-gray-500 mb-4">Vi meddelar dig vid incidenter och planerat underhåll.</p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Tack! Du är nu prenumerant.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="din@epost.se"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {subscribing ? "…" : "Prenumerera"}
              </button>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
