import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import { checkRolePermission } from "../modules/rbac/service.js";

/**
 * requirePermission — factory that returns a preHandler enforcing a
 * fine-grained permission key (e.g. "orders:delete", "settings:write").
 *
 * Permissions are resolved from role_permissions (Redis-cached, 5 min TTL)
 * so the DB is only hit on the first request per role per server process.
 *
 * Must run AFTER requireAuth + requireStoreAccountContext so that
 * request.memberRole is set.
 *
 *   preHandler: [
 *     requireAuth,
 *     requireStoreAccountContext,
 *     requirePermission("products:delete"),
 *   ]
 *
 * Platform Super Admins bypass all permission checks via the "platform:*"
 * wildcard seeded into their role.
 */
export function requirePermission(permissionKey: string): preHandlerHookHandler {
  return async function requirePermissionHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const allowed = await checkRolePermission(
      request.server.db,
      request.server.redis,
      request.memberRole,
      permissionKey,
    );

    if (!allowed) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: `Missing permission: ${permissionKey}`,
      });
    }
  };
}
