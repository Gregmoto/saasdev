"use client";

import { useState } from "react";
import Link from "next/link";

export type StatusType = "klar" | "delvis" | "saknas";

export interface ChecklistItem {
  id: number;
  funktion: string;
  status: StatusType;
  statusLabel: string;
  links: { label: string; href: string; external?: boolean }[];
}

function StatusBadge({ status, label }: { status: StatusType; label: string }) {
  if (status === "klar") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span>✅</span> {label}
      </span>
    );
  }
  if (status === "delvis") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <span>⚠️</span> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <span>❌</span> {label}
    </span>
  );
}

type Filter = "alla" | StatusType;

export function ChecklistFilter({ items }: { items: ChecklistItem[] }) {
  const [filter, setFilter] = useState<Filter>("alla");

  const visible = filter === "alla" ? items : items.filter((i) => i.status === filter);

  const countKlar = items.filter((i) => i.status === "klar").length;
  const countDelvis = items.filter((i) => i.status === "delvis").length;
  const countSaknas = items.filter((i) => i.status === "saknas").length;
  const total = items.length;
  const pct = Math.round((countKlar / total) * 100);

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border";
  const active = "bg-slate-800 text-white border-slate-800";
  const inactive = "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50";

  return (
    <div>
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900">{countKlar} / {total}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Klara ({pct}%)</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{countKlar}</div>
          <div className="text-xs text-zinc-500 mt-0.5">✅ Klar</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{countDelvis}</div>
          <div className="text-xs text-zinc-500 mt-0.5">⚠️ Delvis / Byggd</div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{countSaknas}</div>
          <div className="text-xs text-zinc-500 mt-0.5">❌ Saknas</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("alla")} className={`${btnBase} ${filter === "alla" ? active : inactive}`}>
          Visa alla ({total})
        </button>
        <button onClick={() => setFilter("klar")} className={`${btnBase} ${filter === "klar" ? active : inactive}`}>
          ✅ Klara ({countKlar})
        </button>
        <button onClick={() => setFilter("delvis")} className={`${btnBase} ${filter === "delvis" ? active : inactive}`}>
          ⚠️ Delvis / Byggd ({countDelvis})
        </button>
        <button onClick={() => setFilter("saknas")} className={`${btnBase} ${filter === "saknas" ? active : inactive}`}>
          ❌ Saknas ({countSaknas})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-zinc-500 bg-zinc-50">
              <th className="px-4 py-3 font-medium w-10">#</th>
              <th className="px-4 py-3 font-medium">Funktion</th>
              <th className="px-4 py-3 font-medium w-36">Status</th>
              <th className="px-4 py-3 font-medium">Länk</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
              >
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{item.id}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">{item.funktion}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} label={item.statusLabel} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {item.links.map((link) =>
                      link.href === "-" ? (
                        <span key={link.label} className="text-zinc-300">—</span>
                      ) : (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noopener noreferrer" : undefined}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {link.label}
                          {link.external && (
                            <span className="ml-0.5 text-zinc-400">↗</span>
                          )}
                        </Link>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
