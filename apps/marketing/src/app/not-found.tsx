"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const JOKES = [
  "Sidan tog semester utan att berätta det för någon.",
  "Vi letade i alla lådor. Den är borta.",
  "Kanske importerade vi fel URL från Shopify?",
  "Lagersaldo: 0. Den här sidan är slutsåld.",
  "Checkout misslyckades. Sidan hittades inte i lagret.",
  "Ordern #404 har tyvärr avbrutits.",
  "Fel adress — den här varan finns inte i sortimentet.",
];

const LINKS = [
  { label: "Startsida", href: "/", icon: "🏠" },
  { label: "Funktioner", href: "/features", icon: "⚡" },
  { label: "Priser", href: "/pricing", icon: "💳" },
  { label: "Kontakta oss", href: "/contact", icon: "💬" },
];

export default function NotFound() {
  const pathname = usePathname();
  const slug = pathname.replace(/^\//, "") || "???";

  const [joke, setJoke] = useState(JOKES[0]!);
  const [jokeIndex, setJokeIndex] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setJokeIndex(i => (i + 1) % JOKES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setJoke(JOKES[jokeIndex % JOKES.length]!);
  }, [jokeIndex]);

  function handleLogoClick() {
    setIsShaking(true);
    setClickCount(c => c + 1);
    setTimeout(() => setIsShaking(false), 500);
    setJokeIndex(i => (i + 1) % JOKES.length);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-zinc-100 px-6 h-[60px] flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight">ShopMan</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">

        {/* Animated 404 */}
        <div
          className="relative cursor-pointer select-none mb-8"
          onClick={handleLogoClick}
          title="Klicka för ett nytt skämt"
        >
          <div
            className={`text-[10rem] md:text-[14rem] font-black text-zinc-950 leading-none tracking-tighter transition-transform ${
              isShaking ? "animate-[wiggle_0.4s_ease-in-out]" : ""
            }`}
            style={{
              fontVariantNumeric: "tabular-nums",
              WebkitTextStroke: clickCount > 5 ? "2px #2563EB" : undefined,
            }}
          >
            4
            <span className="relative inline-block">
              <span className="relative z-10">0</span>
              {/* Floating emoji inside the zero */}
              <span className="absolute inset-0 flex items-center justify-center z-20 text-4xl md:text-6xl animate-bounce">
                📦
              </span>
            </span>
            4
          </div>

          {/* Glow */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-blue-100 opacity-40 blur-3xl" />
          </div>
        </div>

        {/* shopman.dev URL */}
        <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2 mb-6 font-mono text-sm text-zinc-400">
          <span className="text-zinc-300">shopman.dev</span>
          <span className="text-zinc-200">/</span>
          <span className="text-red-400 line-through">{slug}</span>
        </div>

        {/* Rotating joke */}
        <div className="h-8 mb-2 overflow-hidden">
          <p
            key={joke}
            className="text-zinc-500 text-lg animate-[fadeInUp_0.4s_ease-out]"
          >
            {joke}
          </p>
        </div>

        {/* Click hint */}
        <p className="text-xs text-zinc-300 mb-10">
          {clickCount === 0
            ? "Klicka på siffran för ett nytt skämt →"
            : clickCount < 5
            ? `${clickCount} klick — du gillar uppenbarligen skämt`
            : clickCount < 10
            ? "Okej nu börjar det bli sjukt"
            : "Du behöver verkligen hjälp. Ring oss."}
        </p>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm text-zinc-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Search suggestion */}
        <div className="max-w-sm w-full">
          <p className="text-xs text-zinc-400 mb-3">Eller testa att söka efter det du letade efter</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Sök på shopman.dev…"
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
            <button className="bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Sök
            </button>
          </div>
        </div>

      </main>

      {/* Footer strip */}
      <div className="border-t border-zinc-100 px-6 py-4 flex items-center justify-between text-xs text-zinc-400">
        <span>© {new Date().getFullYear()} ShopMan</span>
        <span className="hidden sm:block">shopman.dev</span>
        <Link href="/contact" className="hover:text-zinc-700 transition-colors">
          Behöver du hjälp? →
        </Link>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-4deg) scale(1.05); }
          40% { transform: rotate(4deg) scale(1.05); }
          60% { transform: rotate(-3deg); }
          80% { transform: rotate(3deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
