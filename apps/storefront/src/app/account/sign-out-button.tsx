"use client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    router.push("/account/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
    >
      Sign out
    </button>
  );
}
