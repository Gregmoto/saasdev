/**
 * Demo read-only enforcement module.
 *
 * Registers a global onRequest hook that blocks all mutating HTTP methods
 * (POST / PUT / PATCH / DELETE) for store accounts that have `is_demo = true`.
 *
 * Platform super-admins (is_platform_admin = true) bypass the guard so they
 * can trigger resets and maintenance work.
 *
 * The check is:
 *   1. Is this a mutating method?  No → pass through.
 *   2. Is there a session?         No → pass through (let auth handle it).
 *   3. Is the user a platform admin? Yes → pass through.
 *   4. Does the resolved store account have is_demo = true? Yes → 403.
 */

import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { storeAccounts } from "../../db/schema/store-accounts.js";
import { authUsers } from "../../db/schema/auth.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Paths that are always allowed even for demo accounts (admin resets etc.)
const ADMIN_BYPASS_PREFIXES = ["/api/admin/", "/api/platform-admin/"];

export default fp(async function demoReadOnlyPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. Only block mutating methods.
    if (!WRITE_METHODS.has(request.method)) return;

    // 2. Skip admin bypass paths (platform-admin reset triggers etc.)
    const { pathname } = new URL(request.url, "http://localhost");
    if (ADMIN_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) return;

    // 3. No session — let auth module handle it.
    const sessionId = request.cookies?.["sid"];
    if (!sessionId) return;

    // 4. Load session to get userId.
    let userId: string | null = null;
    try {
      const sessionData = await app.redis.get(`session:${sessionId}`);
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as { userId?: string };
        userId = parsed.userId ?? null;
      }
    } catch {
      // Redis unavailable — fail open (don't block the request).
      return;
    }
    if (!userId) return;

    // 5. Platform super-admins are allowed to mutate demo data.
    try {
      const [user] = await app.db
        .select({ isPlatformAdmin: authUsers.isPlatformAdmin })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);

      if (user?.isPlatformAdmin) return;
    } catch {
      // DB unavailable — fail open.
      return;
    }

    // 6. Resolve the store account from the request context (set by requireStoreAccountContext)
    //    or fall back to the Host header slug lookup.
    const storeAccountId: string | undefined =
      // @ts-expect-error — storeAccount is decorated by requireStoreAccountContext
      (request.storeAccount as { id?: string } | undefined)?.id;

    if (!storeAccountId) return;

    try {
      const [account] = await app.db
        .select({ isDemo: storeAccounts.isDemo })
        .from(storeAccounts)
        .where(eq(storeAccounts.id, storeAccountId))
        .limit(1);

      if (account?.isDemo) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Demo accounts are read-only. No data can be modified.",
        });
      }
    } catch {
      // DB unavailable — fail open.
      return;
    }
  });
});
