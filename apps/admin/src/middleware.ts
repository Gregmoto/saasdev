import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/_next", "/favicon.ico", "/api"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  // Quick gate: check if the session cookie 'sid' exists.
  // Real validation happens in Server Components via getMe().
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
