"use client";

import { useState } from "react";
import Link from "next/link";

interface ChangelogEntry {
  slug: string;
  version: string | null;
  versionLabel: string | null;
  title: string;
  tags: string[];
  highlights: Array<{ text: string; href?: string }>;
  fixes: Array<{ text: string; href?: string }>;
  body: string;
  publishedAt: string | null;
}

const TAG_STYLES: Record<string, string> = {
  new: "bg-green-50 text-green-700 border border-green-200",
  improvement: "bg-blue-50 text-blue-700 border border-blue-200",
  fix: "bg-amber-50 text-amber-700 border border-amber-200",
  breaking: "bg-red-50 text-red-700 border border-red-200",
};

const TAG_LABELS: Record<string, string> = {
  new: "Nytt",
  improvement: "Förbättring",
  fix: "Rättning",
  breaking: "Brytande förändring",
};

function TagPill({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag] ?? "bg-stone-50 text-stone-600 border border-stone-200";
  const label = TAG_LABELS[tag] ?? tag;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="border border-stone-100 rounded-2xl bg-white p-6 hover:border-stone-200 hover:shadow-sm transition-all">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {entry.publishedAt && (
          <time dateTime={entry.publishedAt} className="text-sm text-stone-400">
            {formatDate(entry.publishedAt)}
          </time>
        )}
        {entry.version && (
          <span className="text-xs font-mono font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
            v{entry.version}
          </span>
        )}
        {entry.versionLabel && (
          <span className="text-xs text-stone-500 italic">{entry.versionLabel}</span>
        )}
        {entry.tags.map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-4 leading-snug">
        {entry.title}
      </h2>

      {entry.highlights.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Nyheter
          </div>
          <ul className="space-y-1.5">
            {entry.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-blue-600 hover:underline transition-colors"
                  >
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.fixes.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Rättningar
          </div>
          <ul className="space-y-1.5">
            {entry.fixes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-blue-600 hover:underline transition-colors"
                  >
                    {item.text}
                  </Link>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.body && (
        <p className="text-sm text-stone-600 leading-relaxed mb-4">{entry.body}</p>
      )}

      <div className="pt-2">
        <Link
          href={`/changelog/${entry.slug}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Läs mer →
        </Link>
      </div>
    </article>
  );
}

const MONTH_NAMES_SV = [
  "Januari","Februari","Mars","April","Maj","Juni",
  "Juli","Augusti","September","Oktober","November","December",
];

function groupByMonth(entries: ChangelogEntry[]) {
  const map = new Map<string, { label: string; entries: ChangelogEntry[] }>();
  for (const entry of entries) {
    if (!entry.publishedAt) continue;
    const d = new Date(entry.publishedAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        label: `${MONTH_NAMES_SV[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        entries: [],
      });
    }
    map.get(key)!.entries.push(entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);
}

export function HistoryToggle({ entries }: { entries: ChangelogEntry[] }) {
  const [open, setOpen] = useState(false);
  const months = groupByMonth(entries);

  return (
    <div id="tidig-historia" className="mt-12">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 border border-stone-200 rounded-xl px-6 py-4 bg-white hover:border-stone-300 hover:bg-stone-50 transition-colors text-left"
        aria-expanded={open}
      >
        <div>
          <span className="font-semibold text-stone-800 text-sm">
            Tidig historia (2024)
          </span>
          <span className="ml-2 text-stone-400 text-sm">
            — {entries.length} releaser
          </span>
        </div>
        <span
          className={`text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-10">
          {months.map((group) => (
            <section key={group.label}>
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-3">
                {group.label}
                <span className="h-px flex-1 bg-stone-100" />
              </h3>
              <div className="space-y-6">
                {group.entries.map((entry) => (
                  <EntryCard key={entry.slug} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
