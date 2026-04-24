import { NextRequest, NextResponse } from "next/server";

const ACCOUNT_PATHS = ["/account/orders", "/account/addresses", "/account/tickets", "/account/rma", "/account/reviews"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ACCOUNT_PATHS.some((p) => pathname.startsWith(p))) {
    const sid = req.cookies.get("sid");
    if (!sid) {
      const url = req.nextUrl.clone();
      url.pathname = "/account/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
