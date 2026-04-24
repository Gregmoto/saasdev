import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Access denied</h1>
        <p className="text-zinc-500 mb-6">You don&apos;t have permission to access this area.</p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
