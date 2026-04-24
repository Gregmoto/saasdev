import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../hooks/require-auth.js";
import { requireStoreAccountContext } from "../hooks/require-store-account.js";
import { requireVendorScope } from "../hooks/require-vendor-scope.js";
import { requirePlatformAdmin } from "../hooks/require-platform-admin.js";

/**
 * Route Guard — enforces mandatory preHandlers for every /api/** route.
 *
 * Tiers (checked at startup via onRoute — violations are a hard startup error):
 *
 *   /api/public/**     → fully exempt (no auth required)
 *   /api/webhooks/**   → fully exempt (authenticate in handler)
 *
 *   /api/platform/**   → requireAuth + requirePlatformAdmin
 *                        (cross-store; no requireStoreAccountContext)
 *
 *   /api/2fa/**        → requireAuth only
 *                        (per-user, not per-store; 2FA is global to the user)
 *
 *   /api/vendor/**     → requireAuth + requireStoreAccountContext + requireVendorScope
 *
 *   /api/** (default)  → requireAuth + requireStoreAccountContext
 *
 *   /health, /auth/**  → not under /api/** — exempt by default
 *
 * Enforcement works by comparing preHandler function identity. Always pass the
 * imported function reference directly — never wrap it in an arrow function or
 * the identity check will fail and startup will be refused.
 *
 * ✓  preHandler: [requireAuth, requireStoreAccountContext]
 * ✗  preHandler: [(req, rep) => requireAuth(req, rep)]   ← breaks identity check
 */

const EXEMPT_PREFIXES = [
  "/api/public/",
  "/api/webhooks/",
  "/api/widget/",   // public storefront widget routes (chat, affiliate redirect)
  "/api/cms/",      // public CMS read routes (marketing site)
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

    if (!url.startsWith("/api/")) return;
    if (EXEMPT_PREFIXES.some((p) => url.startsWith(p))) return;

    const handlers = toArray(routeOptions.preHandler);

    // ── All /api/** routes must be authenticated ──────────────────────────
    if (!includes(handlers, requireAuth as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireAuth preHandler.\n` +
          `All /api/** routes must be authenticated.\n` +
          `→ Add to EXEMPT_PREFIXES if this route is intentionally public.`,
      );
    }

    // ── /api/platform/** — platform admin; no store-account context ───────
    if (url.startsWith("/api/platform/")) {
      if (!includes(handlers, requirePlatformAdmin as HandlerFn)) {
        throw new Error(
          `[route-guard] ${method} ${url} is missing requirePlatformAdmin preHandler.\n` +
            `All /api/platform/** routes require Platform Super Admin access.`,
        );
      }
      return; // no requireStoreAccountContext for platform routes
    }

    // ── /api/2fa/** — per-user 2FA; no store-account context ─────────────
    if (url.startsWith("/api/2fa/")) {
      return; // requireAuth is sufficient; 2FA is global to the user
    }

    // ── All other /api/** routes must be store-account scoped ─────────────
    if (!includes(handlers, requireStoreAccountContext as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireStoreAccountContext preHandler.\n` +
          `All /api/** routes must be store-account scoped.\n` +
          `→ Use /api/platform/ for cross-store routes.\n` +
          `→ Use /api/2fa/ for per-user 2FA routes.\n` +
          `→ Add to EXEMPT_PREFIXES if this route is intentionally public.`,
      );
    }

    // ── /api/vendor/** additionally needs vendor scope ────────────────────
    if (url.startsWith("/api/vendor/") && !includes(handlers, requireVendorScope as HandlerFn)) {
      throw new Error(
        `[route-guard] ${method} ${url} is missing requireVendorScope preHandler.\n` +
          `All /api/vendor/** routes must be vendor-scoped.`,
      );
    }
  });
});
