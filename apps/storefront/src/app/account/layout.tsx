import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getCustomerMe } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

const ACCOUNT_NAV = [
  { label: "My Orders", href: "/account/orders" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Support tickets", href: "/account/tickets" },
  { label: "Returns (RMA)", href: "/account/rma" },
  { label: "Reviews", href: "/account/reviews" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const me = await getCustomerMe(cookie);
  if (!me) redirect("/account/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-bold text-gray-900">My Account</span>
          <span className="text-sm text-gray-500">{me.email}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <aside className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {ACCOUNT_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <SignOutButton />
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
