import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/_next", "/favicon.ico", "/api", "/auth", "/access-denied"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and root (root redirects via page.tsx)
  if (pathname === "/" || PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // All portal routes require a session cookie.
  // Role enforcement happens in each layout (server component) since
  // middleware cannot access the DB.
  const sid = req.cookies.get("sid");
  if (!sid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
