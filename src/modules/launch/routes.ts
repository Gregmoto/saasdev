import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { getLaunchReadiness } from "./service.js";

const storePreHandler = [requireAuth, requireStoreAccountContext];

export async function launchRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/store/launch-readiness ───────────────────────────────────────
  app.get(
    "/api/store/launch-readiness",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;
      const checks = await getLaunchReadiness(app.db, storeId);

      const requiredChecks = checks.filter((c) => c.required);
      const overallReady = requiredChecks.every((c) => c.status === "pass");
      const blockers = requiredChecks
        .filter((c) => c.status === "fail")
        .map((c) => c.key);

      return reply.send({ checks, overallReady, blockers });
    },
  );

  // ── POST /api/store/launch-readiness/recheck ──────────────────────────────
  app.post(
    "/api/store/launch-readiness/recheck",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;
      const checks = await getLaunchReadiness(app.db, storeId);

      const requiredChecks = checks.filter((c) => c.required);
      const overallReady = requiredChecks.every((c) => c.status === "pass");
      const blockers = requiredChecks
        .filter((c) => c.status === "fail")
        .map((c) => c.key);

      return reply.send({ checks, overallReady, blockers });
    },
  );
}
