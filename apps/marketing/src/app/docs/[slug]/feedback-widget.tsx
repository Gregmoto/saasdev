"use client";

import { useState } from "react";

export function FeedbackWidget({ slug }: { slug: string }) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  // slug is available for future backend integration
  void slug;

  if (voted) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <svg
          className="text-green-500"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 10l5 5 7-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {voted === "up"
          ? "Tack för ditt svar!"
          : "Tack — vi jobbar på att förbättra den här artikeln."}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <p className="text-sm text-stone-500">Var detta till hjälp?</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVoted("up")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all"
          aria-label="Ja, detta var till hjälp"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7 10V17H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h3ZM7 10l3-7a2 2 0 0 1 2 2v3h4a1 1 0 0 1 1 1.1l-.9 5.4A1 1 0 0 1 15.1 15H7V10Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Ja
        </button>
        <button
          onClick={() => setVoted("down")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:border-red-400 hover:text-red-700 hover:bg-red-50 transition-all"
          aria-label="Nej, detta var inte till hjälp"
        >
          <svg
            className="rotate-180"
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 10V17H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h3ZM7 10l3-7a2 2 0 0 1 2 2v3h4a1 1 0 0 1 1 1.1l-.9 5.4A1 1 0 0 1 15.1 15H7V10Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Nej
        </button>
      </div>
    </div>
  );
}
