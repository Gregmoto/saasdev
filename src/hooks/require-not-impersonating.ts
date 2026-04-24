import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Blocks the request when the caller is running inside an impersonation session.
 *
 * Impersonation is read-only — it exists for Platform Super Admins to diagnose
 * Store Account issues without the ability to cause financial or data-loss harm.
 *
 * Apply this hook to any endpoint that:
 *   - modifies billing / subscription data
 *   - processes or refunds payments
 *   - reads raw secrets (API keys, webhook signing secrets)
 *   - performs irreversible destructive operations
 *
 * Example:
 *   preHandler: [requireAuth, requireStoreAccountContext, requireNotImpersonating]
 *
 * Must be placed AFTER requireAuth (which sets request.isImpersonating).
 */
export async function requireNotImpersonating(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.isImpersonating) {
    return reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message:
        "This action is not allowed during an impersonation session. " +
        "Stop impersonation (DELETE /api/platform/impersonate) to perform this operation.",
    });
  }
}
