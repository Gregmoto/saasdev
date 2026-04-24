"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Me } from "@/lib/auth";
import { cn, Badge } from "@saas-shop/ui";

const VENDOR_NAV = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: "🏠" },
  { label: "Beställningar", href: "/vendor/orders", icon: "🛒" },
  { label: "Produkter", href: "/vendor/products", icon: "📦" },
  { label: "Ärenden", href: "/vendor/tickets", icon: "🎫" },
  { label: "Analys", href: "/vendor/analytics", icon: "📊" },
  { label: "Utbetalningar", href: "/vendor/payouts", icon: "💰" },
];

export function VendorShell({
  user,
  storeName,
  children,
}: {
  user: Me;
  storeName?: string;
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
    <div className="flex h-screen bg-emerald-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-emerald-900 flex flex-col">
        {/* Logo + header badge */}
        <div className="px-4 py-5 border-b border-emerald-800">
          <div className="text-white font-bold text-lg">⚡ SaaS Shop</div>
          <div className="mt-2">
            <Badge variant="success">VENDOR PORTAL</Badge>
          </div>
          <div className="mt-3 text-xs text-emerald-400 uppercase tracking-wider">Store</div>
          <div className="mt-1 text-white text-sm font-medium">{storeName ?? "My Store"}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {VENDOR_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-emerald-700 text-white font-medium"
                    : "text-emerald-200 hover:text-white hover:bg-emerald-800"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-emerald-800">
          <div className="text-xs text-emerald-300 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-emerald-400 hover:text-red-300 transition-colors"
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
