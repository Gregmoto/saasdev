/**
 * Runtime proxy for /api/* → backend API.
 *
 * This replaces the next.config.ts rewrite that baked the API URL at build
 * time. Route handlers run on the Next.js server and read process.env at
 * request time, so NEXT_PUBLIC_API_URL is always the live value.
 */
import { type NextRequest, NextResponse } from "next/server";

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const upstream = `${apiBase}/api/${path.join("/")}${req.nextUrl.search}`;

  const fwdHeaders = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) fwdHeaders.set("cookie", cookie);
  const ct = req.headers.get("content-type");
  if (ct) fwdHeaders.set("content-type", ct);
  fwdHeaders.set("accept", req.headers.get("accept") ?? "application/json");
  const xff = req.headers.get("x-forwarded-for");
  if (xff) fwdHeaders.set("x-forwarded-for", xff);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : null;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      method: req.method,
      headers: fwdHeaders,
      body,
    });
  } catch {
    return NextResponse.json(
      { statusCode: 502, error: "Bad Gateway", message: "API unreachable" },
      { status: 502 },
    );
  }

  const resHeaders = new Headers();
  upstreamRes.headers.forEach((val, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      resHeaders.append(key, val);
    }
  });

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
