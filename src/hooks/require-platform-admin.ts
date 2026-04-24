import type { FastifyRequest, FastifyReply } from "fastify";
import { isPlatformSuperAdmin } from "../modules/rbac/service.js";
import { getTotpStatus } from "../modules/two-factor/service.js";

/**
 * Verifies the current user is an active Platform Super Admin.
 *
 * Must be placed AFTER requireAuth in the preHandler chain.
 *
 * Additional invariant: Platform Super Admins are required to have TOTP
 * enabled. If they somehow reach this hook without 2FA enrolled, they receive
 * a 403 directing them to enroll at POST /api/2fa/setup.
 *
 * Platform admin routes (/api/platform/**) are exempt from
 * requireStoreAccountContext — they operate across all store accounts.
 */
export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const db = request.server.db;

  const isAdmin = await isPlatformSuperAdmin(db, userId);

  if (!isAdmin) {
    return reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message: "Platform Super Admin access required",
    });
  }

  // Enforce mandatory 2FA for Platform Super Admins.
  const { enabled } = await getTotpStatus(db, userId);
  if (!enabled) {
    return reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message:
        "Platform Super Admin accounts require two-factor authentication. " +
        "Enroll at POST /api/2fa/setup before accessing platform endpoints.",
    });
  }
}
