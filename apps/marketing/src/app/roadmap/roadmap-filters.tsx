"use client";

import { useState, useMemo } from "react";

interface RoadmapItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  quarter: string | null;
  category: string | null;
  itemStatus: "considering" | "planned" | "in_progress" | "shipped";
  tags: string[];
  votes: number;
  publishedAt: string | null;
}

type StatusFilter = "all" | "shipped" | "in_progress" | "planned" | "considering";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Alla",
  shipped: "Levererat",
  in_progress: "Pågår",
  planned: "Planerat",
  considering: "Utvärderar",
};

const STATUS_CONFIG: Record<
  RoadmapItem["itemStatus"],
  { label: string; className: string; dot: string }
> = {
  shipped: {
    label: "Levererat",
    className: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  in_progress: {
    label: "Pågår",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  planned: {
    label: "Planerat",
    className: "bg-stone-50 text-stone-600 border border-stone-200",
    dot: "bg-stone-400",
  },
  considering: {
    label: "Utvärderar",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
};

function StatusBadge({ status }: { status: RoadmapItem["itemStatus"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function RoadmapFilters({ items }: { items: RoadmapItem[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const statusOk =
        statusFilter === "all" || item.itemStatus === statusFilter;
      const tagsOk =
        activeTags.size === 0 ||
        item.tags.some((t) => activeTags.has(t));
      return statusOk && tagsOk;
    });
  }, [items, statusFilter, activeTags]);

  const grouped = useMemo(() => {
    const map = new Map<string, RoadmapItem[]>();
    filtered.forEach((item) => {
      const q = item.quarter ?? "Övrigt";
      if (!map.has(q)) map.set(q, []);
      map.get(q)!.push(item);
    });
    // Preserve original quarter order based on items array order
    const quarterOrder: string[] = [];
    items.forEach((item) => {
      const q = item.quarter ?? "Övrigt";
      if (!quarterOrder.includes(q)) quarterOrder.push(q);
    });
    return quarterOrder
      .filter((q) => map.has(q))
      .map((q) => ({ quarter: q, items: map.get(q)! }));
  }, [filtered, items]);

  function toggleTag(tag: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function clearAll() {
    setStatusFilter("all");
    setActiveTags(new Set());
  }

  const hasActiveFilters = statusFilter !== "all" || activeTags.size > 0;

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-8 space-y-4">
        {/* Status buttons */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              "all",
              "shipped",
              "in_progress",
              "planned",
              "considering",
            ] as StatusFilter[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                statusFilter === s
                  ? "bg-stone-900 text-white border-stone-900"
                  : "text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900 bg-white"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Tag buttons */}
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTags.has(tag)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700 bg-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400">Aktiva filter:</span>
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                {STATUS_LABELS[statusFilter]}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-0.5 hover:text-stone-900"
                  aria-label="Ta bort statusfilter"
                >
                  ×
                </button>
              </span>
            )}
            {Array.from(activeTags).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-0.5 hover:text-blue-900"
                  aria-label={`Ta bort tagg ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-stone-400 hover:text-stone-700 underline"
            >
              Rensa alla
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <p className="text-stone-400 text-sm py-12 text-center">
          Inga funktioner matchar dina filter.
        </p>
      ) : (
        <div className="space-y-12">
          {grouped.map(({ quarter, items: qItems }) => (
            <section key={quarter}>
              <h2 className="text-lg font-semibold text-stone-900 mb-5 flex items-center gap-3">
                {quarter}
                <span className="h-px flex-1 bg-stone-100" />
                <span className="text-sm font-normal text-stone-400">
                  {qItems.length} funktioner
                </span>
              </h2>
              <ul className="space-y-3">
                {qItems.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 rounded-xl border border-stone-100 bg-white hover:border-stone-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="font-medium text-stone-900 text-sm">
                            {item.title}
                          </span>
                          <StatusBadge status={item.itemStatus} />
                        </div>
                        {item.excerpt && (
                          <p className="text-xs text-stone-500 leading-relaxed mb-2">
                            {item.excerpt}
                          </p>
                        )}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full border border-stone-100"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1 text-sm text-stone-400 pt-0.5">
                        <span>👍</span>
                        <span className="tabular-nums font-medium text-stone-600">
                          {item.votes}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
