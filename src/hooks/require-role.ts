import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import type { MemberRole } from "../db/schema/index.js";

/**
 * requireRole — factory that returns a preHandler enforcing a minimum role.
 *
 * Must run AFTER requireAuth + requireStoreAccountContext so that
 * request.memberRole is already populated.
 *
 * The returned function is anonymous — it does NOT satisfy the route guard's
 * identity check for requireAuth/requireStoreAccountContext. Always place those
 * two base guards first, then requireRole() as an additional constraint:
 *
 *   preHandler: [requireAuth, requireStoreAccountContext, requireRole("store_admin")]
 *
 * For /api/vendor/** routes the signature is:
 *   preHandler: [requireAuth, requireStoreAccountContext, requireVendorScope, requireRole("vendor_admin")]
 */
export function requireRole(...allowedRoles: MemberRole[]): preHandlerHookHandler {
  return async function requireRoleHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!allowedRoles.includes(request.memberRole)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: `This action requires one of: ${allowedRoles.join(", ")}`,
        yourRole: request.memberRole,
      });
    }
  };
}

// ── Convenience shorthands ─────────────────────────────────────────────────

/** Routes that only store administrators may call. */
export const requireStoreAdmin = requireRole("store_admin");

/** Routes restricted to marketplace owners (marketplace mode stores). */
export const requireMarketplaceOwner = requireRole("marketplace_owner");

/** Routes restricted to vendor administrators. */
export const requireVendorAdmin = requireRole("vendor_admin");

/** Routes restricted to reseller administrators. */
export const requireResellerAdmin = requireRole("reseller_admin");

/** Admin-level roles that can mutate store-wide settings. */
export const requireAdminRole = requireRole("store_admin", "marketplace_owner");
