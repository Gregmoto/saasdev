import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import { isFeatureEnabled } from "../modules/plans/service.js";

/**
 * requireFeature — hook factory that gates a route behind a feature flag.
 *
 * Checks:
 *   1. Per-store feature_flags table override (explicit enable/disable)
 *   2. Plan-level feature gate
 *
 * Returns 403 with a polite message if the feature is not enabled.
 * Never mentions "tenant", "plan ID", or internal identifiers.
 *
 * Usage:
 *   app.post("/api/products/bulk-import", {
 *     preHandler: [requireAuth, requireStoreAccountContext, requireFeature("bulkImport")],
 *   }, handler);
 */
export function requireFeature(featureKey: string): preHandlerHookHandler {
  return async function checkFeature(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.storeAccount) {
      // Guard against misconfigured route (requireStoreAccountContext must run first).
      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Store context not available",
      });
    }

    const enabled = await isFeatureEnabled(
      request.server.db,
      request.storeAccount.id,
      featureKey,
    );

    if (!enabled) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message:
          `This feature (${featureKey}) is not available on your current plan. ` +
          "Please upgrade to access it.",
      });
    }
  };
}
