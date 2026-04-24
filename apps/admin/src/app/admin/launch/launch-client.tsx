"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Alert } from "@saas-shop/ui";
import type { LaunchReadiness, LaunchCheck } from "./page";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const FIX_ROUTES: Record<string, string> = {
  domain_verified: "/settings",
  payments_connected: "/integrations",
  shipping_configured: "/settings",
  taxes_configured: "/settings",
  has_products: "/products",
  has_market: "/settings",
  legal_pages: "/faq",
  test_order: "/orders",
  email_templates: "/settings",
  min_stock: "/inventory",
};

function CheckIcon({ result }: { result: LaunchCheck["result"] }) {
  if (result === "pass") return <span className="text-green-500">✅</span>;
  if (result === "warn") return <span className="text-amber-500">⚠️</span>;
  return <span className="text-red-500">❌</span>;
}

function CheckRow({ check }: { check: LaunchCheck }) {
  const fixRoute = FIX_ROUTES[check.key];
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-zinc-200">
      <div className="mt-0.5 shrink-0">
        <CheckIcon result={check.result} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900">{check.label}</p>
        {check.detail && (
          <p className="text-xs text-zinc-500 mt-0.5">{check.detail}</p>
        )}
      </div>
      {check.result === "fail" && fixRoute && (
        <Link
          href={fixRoute}
          className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
        >
          Åtgärda →
        </Link>
      )}
    </div>
  );
}

interface LaunchClientProps {
  initialData: LaunchReadiness;
}

export function LaunchClient({ initialData }: LaunchClientProps) {
  const [data, setData] = useState<LaunchReadiness>(initialData);
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState<string | null>(null);

  const passed = data.checks.filter((c) => c.result === "pass").length;
  const total = data.checks.length;
  const progressPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  async function handleRecheck() {
    setRechecking(true);
    setRecheckError(null);
    try {
      const res = await fetch(`${API}/api/store/launch-readiness/recheck`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const updated = (await res.json()) as LaunchReadiness;
      setData(updated);
    } catch (e) {
      setRecheckError(e instanceof Error ? e.message : "Fel vid kontroll");
    } finally {
      setRechecking(false);
    }
  }

  // Split checks into two columns
  const half = Math.ceil(data.checks.length / 2);
  const col1 = data.checks.slice(0, half);
  const col2 = data.checks.slice(half);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Driftsättningsguide</h1>
        <p className="text-zinc-500 mt-2">
          Kontrollera att allt är klart innan din butik lanseras.
        </p>
      </div>

      {recheckError && (
        <div className="mb-6">
          <Alert variant="error">{recheckError}</Alert>
        </div>
      )}

      {/* Ready banner or progress */}
      {data.overallReady ? (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-green-700">
            ✅ Din butik är redo att lanseras!
          </p>
          <p className="text-green-600 mt-1 text-sm">
            Alla kontroller godkända. Du kan nu aktivera din butik.
          </p>
        </div>
      ) : (
        <div className="mb-8 bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700">
              {passed} av {total} kontroller godkända
            </span>
            <span className="text-zinc-500">{progressPct}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-zinc-800 h-full rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
      {data.checks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <div className="space-y-2">
            {col1.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </div>
          <div className="space-y-2">
            {col2.map((check) => (
              <CheckRow key={check.key} check={check} />
            ))}
          </div>
        </div>
      )}

      {data.checks.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Klicka "Kontrollera igen" för att köra kontroller.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleRecheck} disabled={rechecking} variant="outline">
          {rechecking ? "Kontrollerar…" : "Kontrollera igen"}
        </Button>

        {data.overallReady && (
          <div className="relative group">
            <Button disabled>Aktivera butik</Button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Kontakta ShopMan för att aktivera din domän
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
