"use client";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-zinc-100">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between py-5 text-left gap-4 group"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className="text-zinc-900 font-medium text-sm md:text-base group-hover:text-blue-600 transition-colors">
              {item.question}
            </span>
            <span className={`flex-shrink-0 w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center transition-transform duration-200 text-zinc-500 ${open === i ? "rotate-45 border-blue-200 text-blue-600" : ""}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </button>
          {open === i && (
            <p className="pb-5 text-sm text-zinc-500 leading-relaxed max-w-2xl">
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
