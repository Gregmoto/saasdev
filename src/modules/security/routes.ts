import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { recordAuditEvent } from "./service.js";

export async function securityRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/security/access-denied ──────────────────────────────────────
  app.post(
    "/api/security/access-denied",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { path, portal } = request.body as { path: string; portal: string };
      const userId = request.currentUser.id;

      await recordAuditEvent(app.db, {
        // "suspicious_activity" is not in the TS union but is valid varchar(60) in DB.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventType: "suspicious_activity" as any,
        entityType: "access_denied",
        actorUserId: userId,
        afterState: { path, portal, userId },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );
}
