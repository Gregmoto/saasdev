"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Funktioner", href: "/features" },
  { label: "Priser", href: "/pricing" },
  { label: "Blogg", href: "/blog" },
  { label: "Demo", href: "/demo" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L6 11L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight">ShopMan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === l.href
                  ? "text-zinc-900 font-medium bg-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="http://localhost:3001/login"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-1.5"
          >
            Logga in
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Kom igång
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-zinc-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Meny"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 px-6 py-4 bg-white space-y-1">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="block px-3 py-2 rounded-md text-sm text-zinc-600 hover:bg-zinc-50" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 mt-3 border-t border-zinc-100 flex flex-col gap-2">
            <Link href="http://localhost:3001/login" className="text-sm text-zinc-500 px-3 py-2">Logga in</Link>
            <Link href="/contact" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg text-center">Kom igång</Link>
          </div>
        </div>
      )}
    </header>
  );
}
