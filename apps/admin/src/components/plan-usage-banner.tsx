"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface UsageDimension {
  current: number;
  limit: number | null;
  pct: number | null;
  nearLimit: boolean;
  atLimit: boolean;
}

interface PlanUsage {
  plan: { slug: string; name: string; monthlyPriceCents: number };
  usage: {
    products?: UsageDimension;
    orders?: UsageDimension;
  };
  upgradeUrl: string;
}

export function PlanUsageBanner() {
  const [data, setData] = useState<PlanUsage | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/plan-usage`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((json: PlanUsage | null) => {
        if (!json || json.plan.slug !== "free") return;
        setData(json);
      })
      .catch(() => null);
  }, []);

  if (!data || data.plan.slug !== "free") return null;

  const { products, orders } = data.usage;

  const atLimit = products?.atLimit || orders?.atLimit;
  const nearLimit = !atLimit && (products?.nearLimit || orders?.nearLimit);

  if (!atLimit && !nearLimit) return null;

  // Build a dismissal key based on current usage state
  const dismissKey = `plan-banner-${data.plan.slug}-${products?.current ?? 0}-${orders?.current ?? 0}`;

  if (dismissed) return null;

  // Check sessionStorage dismissal
  if (typeof window !== "undefined" && !atLimit) {
    const wasDismissed = sessionStorage.getItem(dismissKey);
    if (wasDismissed) return null;
  }

  const handleDismiss = () => {
    if (!atLimit) {
      sessionStorage.setItem(dismissKey, "1");
    }
    setDismissed(true);
  };

  const atLimitDimension =
    products?.atLimit ? "produkter" :
    orders?.atLimit ? "ordrar" :
    "produkter";

  const nearDimension = products?.nearLimit ? products : orders?.nearLimit ? orders : null;
  const nearLabel = products?.nearLimit ? "produkter" : "ordrar";

  if (atLimit) {
    return (
      <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 flex items-center justify-between text-sm">
        <span>
          Blockerad: Du har nått gränsen för Free-planen. Uppgradera för att fortsätta lägga till {atLimitDimension}.
        </span>
        <Link
          href="/admin/billing"
          className="ml-4 font-semibold underline hover:no-underline whitespace-nowrap"
        >
          Uppgradera &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 flex items-center justify-between text-sm">
      <span>
        ⚠️ Du närmar dig gränsen för Free-planen.{" "}
        {nearDimension && nearDimension.limit !== null
          ? `${nearDimension.current}/${nearDimension.limit} ${nearLabel} använda.`
          : "Uppgradera för att fortsätta växa."}
      </span>
      <div className="flex items-center gap-3 ml-4">
        <Link
          href="/admin/billing"
          className="font-semibold underline hover:no-underline whitespace-nowrap"
        >
          Uppgradera →
        </Link>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-900 font-bold leading-none"
          aria-label="Stäng"
        >
          ×
        </button>
      </div>
    </div>
  );
}
