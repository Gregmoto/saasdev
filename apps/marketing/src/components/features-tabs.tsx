"use client";
import { useState } from "react";

interface Feature {
  icon: string;
  title: string;
  desc: string;
  details: string[];
  id: string;
}

const MODE_FEATURES: Record<string, string[]> = {
  webshop: ["Hantera flera butiker", "Lagersaldo i realtid", "Betalningsintegrationer"],
  multishop: ["Hantera flera butiker", "Lagersaldo i realtid", "Kundinsikter"],
  marketplace: ["Hantera flera butiker", "Betalningsintegrationer", "Utvecklar-API"],
  b2b: ["Betalningsintegrationer", "Kundinsikter", "Utvecklar-API"],
};

const MODES = [
  { id: "webshop", label: "Webshop" },
  { id: "multishop", label: "MultiShop" },
  { id: "marketplace", label: "Marketplace" },
  { id: "b2b", label: "B2B" },
];

export function FeaturesTabs({ features }: { features: Feature[] }) {
  const [activeMode, setActiveMode] = useState("webshop");

  const activeFeatures = features.filter((f) =>
    MODE_FEATURES[activeMode]?.includes(f.title)
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap justify-center mb-10">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeMode === mode.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {/* Feature cards for selected mode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(activeFeatures.length > 0 ? activeFeatures : features).map((f) => (
          <div
            key={f.id}
            id={f.id}
            className="bg-white rounded-2xl border border-zinc-100 p-7 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="font-bold text-zinc-900 text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-5">{f.desc}</p>
            <ul className="space-y-2">
              {f.details.map((d) => (
                <li key={d} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span className="text-blue-500 flex-shrink-0">✓</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
