"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Me } from "@/lib/auth";
import { cn } from "@saas-shop/ui";

const PA_NAV = [
  { label: "Dashboard", href: "/platform-admin/dashboard", icon: "🏢" },
  { label: "Store Accounts", href: "/platform-admin/store-accounts", icon: "🏪" },
  { label: "Users", href: "/platform-admin/users", icon: "👥" },
  { label: "Plans", href: "/platform-admin/plans", icon: "💳" },
  { label: "Analytics", href: "/platform-admin/analytics", icon: "📊" },
  { label: "Security Logs", href: "/platform-admin/security", icon: "🔒" },
  { label: "Jobs", href: "/platform-admin/jobs", icon: "⚙️" },
  { label: "Settings", href: "/platform-admin/settings", icon: "⚙️" },
  { label: "UI-checklista", href: "/platform-admin/ui-checklist", icon: "✅" },
];

export function PlatformAdminShell({
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
      <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Logo + badge */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="text-white font-bold text-lg">⚡ SaaS Shop</div>
          <div className="mt-3">
            <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded tracking-wider uppercase">
              PLATFORM ADMIN
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {PA_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-slate-700 text-white font-medium"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
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
