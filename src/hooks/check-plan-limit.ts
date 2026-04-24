import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import type { Db } from "../db/client.js";
import { enforcePlanLimit } from "../modules/plans/service.js";
import type { PlanLimits } from "../db/schema/plans.js";

/**
 * checkPlanLimit — hook factory that enforces a plan quota before a create action.
 *
 * Counts current usage via `countFn`, then calls `enforcePlanLimit`.
 * Returns 402 Payment Required if the limit is reached (never says "tenant").
 *
 * Must run after requireAuth + requireStoreAccountContext.
 *
 * Usage:
 *   import { countProducts } from "../modules/products/service.js";
 *
 *   app.post("/api/products", {
 *     preHandler: [
 *       requireAuth,
 *       requireStoreAccountContext,
 *       checkPlanLimit("maxProducts", (db, storeId) => countProducts(db, storeId)),
 *     ],
 *   }, handler);
 */
export function checkPlanLimit(
  limitKey: keyof PlanLimits,
  countFn: (db: Db, storeAccountId: string) => Promise<number>,
): preHandlerHookHandler {
  return async function enforceLimit(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.storeAccount) {
      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Store context not available",
      });
    }

    const db = request.server.db;
    const storeAccountId = request.storeAccount.id;

    try {
      const current = await countFn(db, storeAccountId);
      await enforcePlanLimit(db, storeAccountId, limitKey, current);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 402) {
        return reply.status(402).send({
          statusCode: 402,
          error: "Payment Required",
          message: (err as Error).message,
        });
      }
      throw err;
    }
  };
}
