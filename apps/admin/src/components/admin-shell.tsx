"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Me } from "@/lib/auth";
import { cn } from "@saas-shop/ui";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Products", href: "/products", icon: "📦" },
  { label: "Orders", href: "/orders", icon: "🛒" },
  { label: "Customers", href: "/customers", icon: "👤" },
  { label: "Inventory", href: "/inventory", icon: "🏪" },
  { label: "Imports", href: "/imports", icon: "📥" },
  { label: "Integrations", href: "/integrations", icon: "🔗" },
  { label: "Support", href: "/support", icon: "🎫" },
  { label: "Reviews", href: "/reviews", icon: "⭐" },
  { label: "FAQ", href: "/faq", icon: "❓" },
  { label: "Demo QA", href: "/demo-qa", icon: "✅" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export function AdminShell({
  user,
  storeName,
  storeSlug,
  children,
}: {
  user: Me;
  storeName?: string;
  storeSlug?: string;
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
      <aside className="w-60 flex-shrink-0 bg-zinc-900 flex flex-col">
        {/* Logo + store info */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="text-white font-bold text-lg">⚡ SaaS Shop</div>
          <div className="mt-3 text-xs text-zinc-400 uppercase tracking-wider">Store</div>
          <div className="mt-1 text-white text-sm font-medium">{storeName ?? "My Store"}</div>
          {storeSlug && (
            <div className="mt-1 text-xs text-zinc-500">{storeSlug}</div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-zinc-700 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
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
