"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@saas-shop/ui";
import { Input } from "@saas-shop/ui";
import { Label } from "@saas-shop/ui";
import { Alert } from "@saas-shop/ui";

const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3002";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
        }),
      });
      if (res.ok) {
        // Use portal API to route to the correct portal based on role
        try {
          const portalRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? ""}/auth/portal`,
            { credentials: "include", cache: "no-store" },
          );
          if (portalRes.ok) {
            const { redirect: dest } = await portalRes.json() as { redirect: string };
            router.push(dest);
            router.refresh();
            return;
          }
        } catch { /* fallthrough */ }
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError("Felaktig e-post eller lösenord");
      }
    } catch {
      setError("Nätverksfel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top bar */}
      <header className="w-full border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a
            href={MARKETING_URL}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            ← Tillbaka till ShopMan.se
          </a>
          <div className="text-xl font-bold text-zinc-900">⚡ ShopMan</div>
          <a
            href={`${MARKETING_URL}/start`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Skapa konto →
          </a>
        </div>
      </header>

      {/* Centered login card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold text-zinc-900">⚡ ShopMan</div>
            <p className="mt-2 text-zinc-500 text-sm">Logga in på ditt konto</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1"
                  placeholder="du@foretag.se"
                />
              </div>
              <div>
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "Loggar in…" : "Logga in"}
              </Button>
            </form>
          </div>

          {/* Below-card links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-zinc-500">
              Inget konto?{" "}
              <a
                href={`${MARKETING_URL}/start`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Skapa butik gratis →
              </a>
            </p>
            <p className="text-sm text-zinc-500">
              Glömt lösenordet?{" "}
              <a
                href="/forgot-password"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Återställ →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
