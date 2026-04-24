"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Funktioner", href: "/features" },
  { label: "Integrationer", href: "/integrations" },
  { label: "Priser", href: "/pricing" },
  { label: "Resurser", href: "/resources" },
  { label: "Nyheter", href: "/news" },
  { label: "Demo", href: "/demo" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className="text-blue-700">
            <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-semibold tracking-tight text-stone-900">ShopMan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === l.href
                  ? "text-stone-900 font-medium"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="https://admin-production-42ec.up.railway.app/login"
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors px-3 py-1.5"
          >
            Logga in
          </Link>
          <Link
            href="/book-demo"
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors px-3 py-1.5 border border-stone-200 rounded-lg hover:border-stone-300"
          >
            Boka demo
          </Link>
          <Link
            href="/trial"
            className="text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Testa gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-stone-100 transition-colors"
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
        <div className="md:hidden border-t border-stone-100 px-6 py-4 bg-white space-y-1">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className="block px-3 py-2 rounded-md text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 mt-3 border-t border-stone-100 flex flex-col gap-2">
            <Link href="https://admin-production-42ec.up.railway.app/login" className="text-sm text-stone-500 px-3 py-2">Logga in</Link>
            <Link href="/book-demo" className="text-sm text-stone-600 px-3 py-2">Boka demo</Link>
            <Link href="/trial" className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-lg text-center">Testa gratis</Link>
          </div>
        </div>
      )}
    </header>
  );
}
