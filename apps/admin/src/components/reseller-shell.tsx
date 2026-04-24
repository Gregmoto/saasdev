"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Me } from "@/lib/auth";
import { cn } from "@saas-shop/ui";

const RESELLER_NAV = [
  { label: "Dashboard", href: "/reseller/dashboard", icon: "🏠" },
  { label: "Kunder", href: "/reseller/customers", icon: "👤" },
  { label: "Provisioner", href: "/reseller/commissions", icon: "💰" },
  { label: "Rapporter", href: "/reseller/reports", icon: "📊" },
  { label: "Inställningar", href: "/reseller/settings", icon: "⚙️" },
];

export function ResellerShell({
  user,
  children,
}: {
  user: Me;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-teal-900 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-teal-800">
          <div className="text-white font-bold text-lg">⚡ SaaS Shop</div>
          <div className="mt-3 text-xs text-teal-300 uppercase tracking-wider font-semibold">
            Reseller Portal
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {RESELLER_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-teal-700 text-white font-medium"
                    : "text-teal-300 hover:text-white hover:bg-teal-800"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-teal-800">
          <div className="text-xs text-teal-400 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-teal-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
