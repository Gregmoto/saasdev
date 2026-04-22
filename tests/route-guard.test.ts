import { describe, it, expect, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import routeGuardPlugin from "../src/plugins/route-guard.js";
import { requireAuth } from "../src/hooks/require-auth.js";
import { requireStoreAccountContext } from "../src/hooks/require-store-account.js";
import { requireVendorScope } from "../src/hooks/require-vendor-scope.js";

// Minimal Fastify instance that has only the route-guard plugin — no DB, Redis,
// or session plugins needed because the guard fires at route-registration time,
// before any request handlers are ever invoked.
function makeApp(): FastifyInstance {
  return Fastify({ logger: false });
}

const apps: FastifyInstance[] = [];
function tracked(app: FastifyInstance): FastifyInstance {
  apps.push(app);
  return app;
}

afterEach(async () => {
  // Close all apps created in this test run to avoid open handle warnings.
  await Promise.allSettled(apps.map((a) => a.close()));
  apps.length = 0;
});

// ─── Failure cases ────────────────────────────────────────────────────────────

describe("route-guard — startup rejection", () => {
  it("rejects when an /api route has NO preHandlers at all", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    // Route registered inside a plugin so the error propagates to ready().
    app.register(async (instance) => {
      instance.get("/api/products", async () => []);
    });

    await expect(app.ready()).rejects.toThrow(/missing requireAuth/);
  });

  it("rejects when requireAuth is present but requireStoreAccountContext is missing", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get(
        "/api/products",
        { preHandler: [requireAuth] },
        async () => [],
      );
    });

    await expect(app.ready()).rejects.toThrow(/missing requireStoreAccountContext/);
  });

  it("rejects a /api/vendor route that is missing requireVendorScope", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get(
        "/api/vendor/products",
        { preHandler: [requireAuth, requireStoreAccountContext] }, // missing vendor guard
        async () => [],
      );
    });

    await expect(app.ready()).rejects.toThrow(/missing requireVendorScope/);
  });

  it("rejects even when preHandlers are wrapped in arrow functions (identity mismatch)", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      // Wrapping breaks identity — this is the footgun the guard catches.
      instance.get(
        "/api/products",
        {
          preHandler: [
            (req: never, rep: never) => requireAuth(req, rep),      // ← not the real ref
            (req: never, rep: never) => requireStoreAccountContext(req, rep),
          ],
        },
        async () => [],
      );
    });

    await expect(app.ready()).rejects.toThrow(/missing requireAuth/);
  });
});

// ─── Pass cases ───────────────────────────────────────────────────────────────

describe("route-guard — startup passes", () => {
  it("allows /api routes with both required preHandlers", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get(
        "/api/products",
        { preHandler: [requireAuth, requireStoreAccountContext] },
        async () => [],
      );
    });

    await expect(app.ready()).resolves.toBeDefined();
  });

  it("allows /api/vendor routes with all three required preHandlers", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get(
        "/api/vendor/listings",
        { preHandler: [requireAuth, requireStoreAccountContext, requireVendorScope] },
        async () => [],
      );
    });

    await expect(app.ready()).resolves.toBeDefined();
  });

  it("allows /api/public routes without any preHandlers", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get("/api/public/catalog", async () => []);
    });

    await expect(app.ready()).resolves.toBeDefined();
  });

  it("allows /api/webhooks routes without preHandlers", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.post("/api/webhooks/stripe", async () => ({ received: true }));
    });

    await expect(app.ready()).resolves.toBeDefined();
  });

  it("does not enforce on routes outside /api (e.g. /health, /auth)", async () => {
    const app = tracked(makeApp());
    app.register(routeGuardPlugin);

    app.register(async (instance) => {
      instance.get("/health", async () => ({ ok: true }));
      instance.post("/auth/login", async () => ({ ok: true }));
    });

    await expect(app.ready()).resolves.toBeDefined();
  });
});
