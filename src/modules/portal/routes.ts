import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { storeAccounts, storeMemberships } from "../../db/schema/index.js";
import { isPlatformSuperAdmin } from "../rbac/service.js";
import type { MemberRole } from "../../db/schema/index.js";
import { config } from "../../config.js";

/**
 * GET /auth/portal
 *
 * Post-login routing decision endpoint. The client calls this immediately
 * after a successful login to learn where to redirect the user.
 *
 * Resolution order:
 *   1. Platform Super Admin → /platform-admin
 *   2. Hostname resolves to a specific store account → portal for that role
 *   3. User has exactly one active membership → redirect to that portal
 *   4. User has multiple memberships → /accounts (store-account switcher)
 *
 * "Tenant" is never used in the response — use "store account" wording only.
 */
export async function portalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/auth/portal", { preHandler: [requireAuth] }, async (request, reply) => {
    const db = app.db;
    const userId = request.currentUser.id;

    // ── 1. Platform Super Admin ─────────────────────────────────────────────
    if (await isPlatformSuperAdmin(db, userId)) {
      return reply.send({ redirect: "/platform-admin", context: "platform" });
    }

    // ── 2. Collect all active store account memberships ─────────────────────
    const memberships = await db
      .select({
        storeAccountId: storeAccounts.id,
        name: storeAccounts.name,
        slug: storeAccounts.slug,
        mode: storeAccounts.mode,
        role: storeMemberships.role,
      })
      .from(storeMemberships)
      .innerJoin(storeAccounts, eq(storeMemberships.storeAccountId, storeAccounts.id))
      .where(
        and(
          eq(storeMemberships.userId, userId),
          eq(storeMemberships.isActive, true),
          eq(storeAccounts.isActive, true),
        ),
      );

    if (memberships.length === 0) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "You do not have access to any store account",
      });
    }

    // ── 3. Try to match hostname → specific store account ───────────────────
    const hostname = (request.headers["host"] ?? "").split(":")[0] ?? "";
    const slug = parseSubdomainSlug(hostname, config.BASE_DOMAIN);

    const match = memberships.find((m) =>
      slug ? m.slug === slug : m.storeAccountId === hostname,
    );

    if (match) {
      return reply.send({
        redirect: roleToPortal(match.role),
        context: "store",
        storeAccount: { id: match.storeAccountId, name: match.name },
      });
    }

    // ── 4. Multi-store switcher ─────────────────────────────────────────────
    if (memberships.length > 1) {
      return reply.send({
        redirect: "/accounts",
        context: "multi-store",
        // Never use "tenant" — "store account" is the user-facing term.
        storeAccounts: memberships.map((m) => ({
          id: m.storeAccountId,
          name: m.name,
          slug: m.slug,
          mode: m.mode,
          role: m.role,
          portal: roleToPortal(m.role),
        })),
      });
    }

    // ── 5. Single membership ────────────────────────────────────────────────
    const only = memberships[0]!;
    return reply.send({
      redirect: roleToPortal(only.role),
      context: "store",
      storeAccount: { id: only.storeAccountId, name: only.name },
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleToPortal(role: MemberRole): string {
  switch (role) {
    case "store_admin":
    case "store_staff":
    case "marketplace_owner":
      return "/admin";
    case "vendor_admin":
    case "vendor_staff":
      return "/vendor";
    case "reseller_admin":
      return "/reseller";
  }
}

function parseSubdomainSlug(hostname: string, baseDomain: string): string | null {
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return slug && !slug.includes(".") ? slug : null;
}
