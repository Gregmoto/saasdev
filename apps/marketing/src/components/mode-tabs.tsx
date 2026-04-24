"use client";
import { useState } from "react";
import Link from "next/link";

interface Mode {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  bullets: string[];
  href: string;
}

const MODES: Mode[] = [
  {
    id: "webshop",
    icon: "🏪",
    title: "Webshop",
    tagline: "Enkel e-handel",
    bullets: [
      "Kom igång snabbt med en professionell butik",
      "Produkter, varianter och kategorier",
      "Inbyggda betalningslösningar",
    ],
    href: "/features#webshop",
  },
  {
    id: "multishop",
    icon: "🏬",
    title: "MultiShop",
    tagline: "Flera butiker",
    bullets: [
      "Hantera alla dina varumärken från en dashboard",
      "Delat lager och gemensamma kunder",
      "Separata domäner och teman per butik",
    ],
    href: "/features#multishop",
  },
  {
    id: "marketplace",
    icon: "🛒",
    title: "Marketplace",
    tagline: "Marknadsplats",
    bullets: [
      "Öppna din plattform för externa säljare",
      "Provision och utbetalningsflöden",
      "Säljarkonton med egna dashboards",
    ],
    href: "/features#marketplace",
  },
  {
    id: "b2b",
    icon: "🤝",
    title: "B2B / Återförsäljare",
    tagline: "Grossist",
    bullets: [
      "Priser, kredit och orderflöden för B2B-kunder",
      "Kundspecifika prislistor och rabatter",
      "Faktura och kreditgränser",
    ],
    href: "/features#b2b",
  },
];

export function ModeTabs() {
  const [active, setActive] = useState("multishop");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {MODES.map((mode) => {
        const isActive = active === mode.id;
        return (
          <div
            key={mode.id}
            onClick={() => setActive(mode.id)}
            className={`cursor-pointer rounded-2xl p-6 transition-all duration-200 border ${
              isActive
                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-zinc-50 border-zinc-100 hover:border-zinc-200 hover:bg-white text-zinc-900"
            }`}
          >
            <div className="text-3xl mb-3">{mode.icon}</div>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isActive ? "text-blue-200" : "text-zinc-400"}`}>
              {mode.tagline}
            </div>
            <h3 className={`text-lg font-bold mb-4 ${isActive ? "text-white" : "text-zinc-900"}`}>
              {mode.title}
            </h3>
            <ul className="space-y-2 mb-5">
              {mode.bullets.map((b) => (
                <li key={b} className={`flex items-start gap-2 text-sm ${isActive ? "text-blue-100" : "text-zinc-500"}`}>
                  <span className={`mt-0.5 flex-shrink-0 ${isActive ? "text-blue-300" : "text-blue-500"}`}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href={mode.href}
              onClick={(e) => e.stopPropagation()}
              className={`text-sm font-medium transition-colors ${isActive ? "text-white hover:text-blue-100" : "text-blue-600 hover:text-blue-700"}`}
            >
              Läs mer →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
