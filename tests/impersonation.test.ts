import { describe, it, expect } from "vitest";

// ── Impersonation session logic ────────────────────────────────────────────────
// These tests validate the session state transitions and the requireNotImpersonating
// guard without needing a live DB or Redis.

import { requireNotImpersonating } from "../src/hooks/require-not-impersonating.js";

function makeReply() {
  let _code = 200;
  let _body: unknown;
  const reply = {
    status(c: number) { _code = c; return reply; },
    send(b: unknown) { _body = b; return reply; },
    get statusCode() { return _code; },
    get body() { return _body; },
  };
  return reply;
}

describe("Impersonation guard", () => {
  it("allows normal (non-impersonating) requests", async () => {
    const req = { isImpersonating: false } as never;
    const reply = makeReply();
    await requireNotImpersonating(req, reply as never);
    expect(reply.statusCode).toBe(200);
  });

  it("blocks billing mutation during impersonation", async () => {
    const req = { isImpersonating: true } as never;
    const reply = makeReply();
    await requireNotImpersonating(req, reply as never);
    expect(reply.statusCode).toBe(403);
    const body = reply.body as { statusCode: number; error: string; message: string };
    expect(body.error).toBe("Forbidden");
    expect(body.message).toContain("DELETE /api/platform/impersonate");
  });

  it("error message includes the stop-impersonation endpoint", async () => {
    const req = { isImpersonating: true } as never;
    const reply = makeReply();
    await requireNotImpersonating(req, reply as never);
    const body = reply.body as { message: string };
    expect(body.message).toMatch(/DELETE \/api\/platform\/impersonate/);
  });
});

// ── Route-guard tier: /api/platform/ must have requirePlatformAdmin ───────────
// We re-use the lightweight route-guard test pattern from tests/route-guard.test.ts.

import Fastify, { type FastifyInstance } from "fastify";
import routeGuardPlugin from "../src/plugins/route-guard.js";
import { requireAuth } from "../src/hooks/require-auth.js";
import { requirePlatformAdmin } from "../src/hooks/require-platform-admin.js";

// Match the exact pattern from route-guard.test.ts: no await on register(),
// no fp() wrapper — errors propagate to app.ready().
const guardApps: FastifyInstance[] = [];
function makeGuardApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  guardApps.push(app);
  app.register(routeGuardPlugin);
  return app;
}

afterEach(async () => {
  await Promise.allSettled(guardApps.map((a) => a.close()));
  guardApps.length = 0;
});

describe("Route guard — /api/platform/ tier", () => {
  it("rejects a /api/platform/ route missing requirePlatformAdmin", async () => {
    const app = makeGuardApp();
    app.register(async (instance) => {
      // Only requireAuth, no requirePlatformAdmin → should fail
      instance.get("/api/platform/stores", { preHandler: [requireAuth] }, async () => ({ ok: true }));
    });
    await expect(app.ready()).rejects.toThrow("requirePlatformAdmin");
  });

  it("accepts a /api/platform/ route with both required hooks", async () => {
    const app = makeGuardApp();
    app.register(async (instance) => {
      instance.get(
        "/api/platform/stores",
        { preHandler: [requireAuth, requirePlatformAdmin] },
        async () => ({ ok: true }),
      );
    });
    await expect(app.ready()).resolves.not.toThrow();
  });

  it("accepts a /api/2fa/ route with only requireAuth (no store context needed)", async () => {
    const app = makeGuardApp();
    app.register(async (instance) => {
      instance.get("/api/2fa/status", { preHandler: [requireAuth] }, async () => ({ ok: true }));
    });
    await expect(app.ready()).resolves.not.toThrow();
  });
});
