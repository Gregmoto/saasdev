"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PRESETS = [
  { label: "7 dagar", days: 7 },
  { label: "30 dagar", days: 30 },
  { label: "90 dagar", days: 90 },
  { label: "12 månader", days: 365 },
] as const;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DateRangePickerProps {
  from: string;
  to: string;
}

export function DateRangePicker({ from, to }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyPreset(days: number) {
    const toDate = new Date();
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", fromDate.toISOString());
    params.set("to", toDate.toISOString());
    router.push(`?${params.toString()}`);
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", new Date(e.target.value).toISOString());
    router.push(`?${params.toString()}`);
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("to", new Date(e.target.value).toISOString());
    router.push(`?${params.toString()}`);
  }

  const fromDate = from ? isoDate(new Date(from)) : isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const toDate = to ? isoDate(new Date(to)) : isoDate(new Date());

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-1 py-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <input
          type="date"
          value={fromDate}
          onChange={handleFromChange}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
        <span>–</span>
        <input
          type="date"
          value={toDate}
          onChange={handleToChange}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        />
      </div>
    </div>
  );
}
