"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin-production-42ec.up.railway.app";

const TOP_LINKS = [
  { label: "Funktioner", href: "/features" },
  { label: "Priser", href: "/pricing" },
  { label: "Demo", href: "/demo" },
];

const LOSNINGAR_LINKS = [
  { label: "Webshop", href: "/features#webshop" },
  { label: "MultiShop", href: "/features#multishop" },
  { label: "Marketplace", href: "/features#marketplace" },
  { label: "Återförsäljarportal", href: "/features#reseller" },
  { label: "Integrationer", href: "/integrations" },
];

const RESURSER_LINKS = [
  { label: "Dokumentation", href: "/docs" },
  { label: "Versionshistorik", href: "/changelog" },
  { label: "Färdplan", href: "/roadmap" },
  { label: "Nyheter", href: "/news" },
  { label: "Blogg", href: "/blog" },
  { label: "Om oss", href: "/about" },
  { label: "Kontakt", href: "/contact" },
  { label: "Systemstatus", href: "/status" },
];

// Dropdown for desktop hover+click
function Dropdown({
  label,
  links,
  pathname,
}: {
  label: string;
  links: { label: string; href: string }[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const isActive = links.some(
    (l) => pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href.split("#")[0]!))
  );

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? "text-stone-900 font-medium"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-stone-100 rounded-xl shadow-lg shadow-stone-900/10 py-1.5 z-50"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === l.href
                  ? "text-stone-900 font-medium bg-stone-50"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Mobile accordion section
function MobileSection({
  title,
  links,
  onNav,
}: {
  title: string;
  links: { label: string; href: string }[];
  onNav: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-md"
      >
        {title}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 12 12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="pl-3 mt-0.5 space-y-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onNav}
              className="block px-3 py-2 rounded-md text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function closeMenu() {
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" className="text-blue-700">
            <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold tracking-tight text-stone-900">ShopMan</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {TOP_LINKS.map((l) => (
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
          <Dropdown label="Lösningar" links={LOSNINGAR_LINKS} pathname={pathname} />
          <Dropdown label="Resurser" links={RESURSER_LINKS} pathname={pathname} />
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={`${ADMIN_URL}/login`}
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
            href="/start"
            className="text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Starta gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-stone-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-100 px-4 py-4 bg-white space-y-1">
          {/* Flat top links */}
          {TOP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeMenu}
              className={`block px-3 py-2 rounded-md text-sm ${
                pathname === l.href
                  ? "text-stone-900 font-medium bg-stone-50"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Accordion sections */}
          <MobileSection title="Lösningar" links={LOSNINGAR_LINKS} onNav={closeMenu} />
          <MobileSection title="Resurser" links={RESURSER_LINKS} onNav={closeMenu} />

          {/* CTA row */}
          <div className="pt-3 mt-3 border-t border-stone-100 flex flex-col gap-2">
            <Link
              href={`${ADMIN_URL}/login`}
              onClick={closeMenu}
              className="text-sm text-stone-500 px-3 py-2"
            >
              Logga in
            </Link>
            <Link
              href="/book-demo"
              onClick={closeMenu}
              className="text-sm text-stone-600 px-3 py-2"
            >
              Boka demo
            </Link>
            <Link
              href="/start"
              onClick={closeMenu}
              className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-lg text-center"
            >
              Starta gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
