import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../hooks/require-auth.js";
import { requireStoreAccountContext } from "../hooks/require-store-account.js";
import { requireVendorScope } from "../hooks/require-vendor-scope.js";

/**
 * Route Guard — enforces mandatory preHandlers for every route under /api/**.
 *
 * Rules (checked at startup via onRoute — violations are a hard startup error):
 *
 *   /api/**                → must have requireAuth + requireStoreAccountContext
 *   /api/vendor/**         → must additionally have requireVendorScope
 *   /api/public/**         → exempt (explicitly public — no auth required)
 *   /api/webhooks/**       → exempt (webhook receivers authenticate differently)
 *   /health, /auth/**      → not under /api/** — exempt by default
 *
 * Enforcement works by comparing preHandler function identity. Always pass the
 * imported function reference directly — never wrap it in an arrow function or
 * the identity check will fail and startup will be refused.
 *
 * ✓  preHandler: [requireAuth, requireStoreAccountContext]
 * ✗  preHandler: [(req, rep) => requireAuth(req, rep)]   ← breaks identity check
 */

// These URL prefixes are intentionally public and exempt from the guard.
const EXEMPT_PREFIXES = [
  "/api/public/",
  "/api/webhooks/",
] as const;

type HandlerFn = (...args: unknown[]) => unknown;

function toArray(h: unknown): HandlerFn[] {
  if (h == null) return [];
  return Array.isArray(h) ? (h as HandlerFn[]) : [h as HandlerFn];
}

function includes(handlers: HandlerFn[], target: HandlerFn): boolean {
  return handlers.some((h) => h === target);
}

export default fp(async function routeGuardPlugin(app: FastifyInstance) {
  app.addHook("onRoute", (routeOptions) => {
    const { url, method } = routeOptions;

    // Only guard routes explicitly placed under /api/
    if (!url.startsWith("/api/")) return;

    // Exempt public / webhook namespaces
    if (EXEMPT_PREFIXES.some((p) => url.startsWith(p))) return;

    const handlers = toArray(routeOptions.preHandler);

    if (!includes(handlers, requireAuth as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireAuth preHandler.\n` +
          `All /api/** routes must be authenticated.\n` +
          `→ Add to EXEMPT_PREFIXES if this route is intentionally public.`,
      );
    }

    if (!includes(handlers, requireStoreAccountContext as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireStoreAccountContext preHandler.\n` +
          `All /api/** routes must be store-account scoped.\n` +
          `→ Add to EXEMPT_PREFIXES if this route serves multiple store accounts.`,
      );
    }

    if (url.startsWith("/api/vendor/") && !includes(handlers, requireVendorScope as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireVendorScope preHandler.\n` +
          `All /api/vendor/** routes must be vendor-scoped.`,
      );
    }
  });
});
