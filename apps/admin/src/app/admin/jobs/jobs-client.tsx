"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge, Button, Spinner, Alert } from "@saas-shop/ui";
import type { Job } from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const JOB_TYPES = [
  "analytics_aggregate",
  "cache_purge",
  "sitemap_generate",
  "search_index_sync",
] as const;

type JobType = (typeof JOB_TYPES)[number];

type FilterTab = "all" | Job["status"];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Alla" },
  { key: "pending", label: "Väntar" },
  { key: "running", label: "Körs" },
  { key: "completed", label: "Klara" },
  { key: "failed", label: "Misslyckade" },
];

function statusBadgeVariant(
  status: Job["status"]
): "default" | "info" | "success" | "danger" | "warning" {
  switch (status) {
    case "pending":
      return "default";
    case "running":
      return "info";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "cancelled":
      return "default";
    case "retrying":
      return "warning";
  }
}

const STATUS_LABELS: Record<Job["status"], string> = {
  pending: "Väntar",
  running: "Körs",
  completed: "Klar",
  failed: "Misslyckad",
  cancelled: "Avbruten",
  retrying: "Försöker igen",
};

const JOB_TYPE_LABELS: Record<JobType, string> = {
  analytics_aggregate: "Analysaggrering",
  cache_purge: "Cache-rensning",
  sitemap_generate: "Sitemap-generering",
  search_index_sync: "Sökindexsynk",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface RunJobModalProps {
  onClose: () => void;
  onCreated: (job: Job) => void;
}

function RunJobModal({ onClose, onCreated }: RunJobModalProps) {
  const [type, setType] = useState<JobType>("analytics_aggregate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/jobs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${text}`);
      }
      const job = (await res.json()) as Job;
      onCreated(job);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid skapande av jobb");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Kör nytt jobb</h2>
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            Jobbtyp
          </label>
          <select
            className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            value={type}
            onChange={(e) => setType(e.target.value as JobType)}
          >
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {JOB_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Avbryt
          </Button>
          <Button size="sm" onClick={handleRun} disabled={loading}>
            {loading ? "Startar…" : "Kör"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ExpandedRowProps {
  job: Job;
  onUpdate: (job: Job) => void;
}

function ExpandedRow({ job, onUpdate }: ExpandedRowProps) {
  const [loading, setLoading] = useState<"retry" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading("retry");
    setError(null);
    try {
      const res = await fetch(`${API}/api/jobs/${job.id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = (await res.json()) as Job;
      onUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    setLoading("cancel");
    setError(null);
    try {
      const res = await fetch(`${API}/api/jobs/${job.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = (await res.json()) as Job;
      onUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-zinc-50 px-4 py-3 space-y-2 border-t border-zinc-100">
      {error && <Alert variant="error">{error}</Alert>}
      {job.progressMessage && (
        <p className="text-xs text-zinc-600">
          <span className="font-medium">Förlopp: </span>
          {job.progressMessage}
        </p>
      )}
      {job.lastError && (
        <p className="text-xs text-red-600 font-mono bg-red-50 rounded p-2">
          <span className="font-medium">Fel: </span>
          {job.lastError}
        </p>
      )}
      <div className="flex gap-2">
        {job.status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={loading !== null}
          >
            {loading === "retry" ? "Försöker…" : "Försök igen"}
          </Button>
        )}
        {(job.status === "pending" || job.status === "running") && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={loading !== null}
          >
            {loading === "cancel" ? "Avbryter…" : "Avbryt"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface JobsClientProps {
  initialJobs: Job[];
}

export function JobsClient({ initialJobs }: JobsClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const hasActiveJobs = jobs.some(
    (j) => j.status === "running" || j.status === "pending"
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/jobs?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const updated = (await res.json()) as Job[];
      setJobs(updated);
      setRefreshError(null);
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Fel vid uppdatering");
    }
  }, []);

  useEffect(() => {
    if (!hasActiveJobs) return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [hasActiveJobs, refresh]);

  const filtered =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  function updateJob(updated: Job) {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Jobb</h1>
          <p className="text-zinc-500 mt-1">Bakgrundsjobb och schemalagda uppgifter.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveJobs && <Spinner />}
          <Button onClick={() => setShowModal(true)}>Kör nytt jobb</Button>
        </div>
      </div>

      {refreshError && (
        <div className="mb-4">
          <Alert variant="error">{refreshError}</Alert>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-zinc-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Typ</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 w-40">Förlopp</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden sm:table-cell">Startat</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden md:table-cell">Slutfört</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden lg:table-cell">Fellogg</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                    Inga jobb hittades.
                  </td>
                </tr>
              )}
              {filtered.map((job) => (
                <>
                  <tr
                    key={job.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {JOB_TYPE_LABELS[job.type as JobType] ?? job.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          job.status === "running"
                            ? "animate-pulse inline-flex"
                            : "inline-flex"
                        }
                      >
                        <Badge variant={statusBadgeVariant(job.status)}>
                          {STATUS_LABELS[job.status]}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-zinc-800 h-full rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-8 text-right">
                          {job.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell text-xs">
                      {formatDate(job.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell text-xs">
                      {formatDate(job.completedAt)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {job.lastError ? (
                        <span className="text-xs text-red-600 font-mono truncate max-w-[200px] block">
                          {job.lastError}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === job.id ? null : job.id)
                        }
                        className="px-2 py-1 text-xs rounded bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        {expandedId === job.id ? "Stäng" : "Detaljer"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === job.id && (
                    <tr key={job.id + ":expanded"}>
                      <td colSpan={7} className="p-0">
                        <ExpandedRow job={job} onUpdate={updateJob} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RunJobModal
          onClose={() => setShowModal(false)}
          onCreated={(job) => setJobs((prev) => [job, ...prev])}
        />
      )}
    </div>
  );
}
