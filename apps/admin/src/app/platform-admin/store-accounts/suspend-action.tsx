"use client";
import { useState } from "react";

export function SuspendAction({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSuspend() {
    if (
      !confirm(
        `Are you sure you want to suspend "${accountName}"? This will block all access for users of this store.`,
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
      const res = await fetch(
        `${base}/api/platform/store-accounts/${accountId}/suspend`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Suspended by platform admin" }),
        },
      );
      if (res.ok) {
        setDone(true);
      } else {
        alert("Failed to suspend account.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <span className="text-xs text-zinc-400">Suspended</span>;
  }

  return (
    <button
      onClick={handleSuspend}
      disabled={loading}
      className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
    >
      {loading ? "Suspending…" : "Suspend"}
    </button>
  );
}
