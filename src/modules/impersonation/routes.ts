import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as ImpersonationService from "./service.js";
import * as SecurityService from "../security/service.js";

const startImpersonationSchema = z.object({
  storeAccountId: z.string().uuid(),
});

export async function impersonationRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/platform/impersonate ────────────────────────────────────────
  // Start impersonating a store account.
  //
  // What changes in session:
  //   impersonatedStoreAccountId = target store ID
  //   impersonatedUserId         = a store_admin's user ID (for role context)
  //
  // What does NOT change:
  //   session.userId             = the Platform Admin (real actor, for audit)
  //
  // All subsequent /api/** requests will be store-scoped to the impersonated
  // store. requireNotImpersonating blocks write operations on sensitive data.
  app.post(
    "/api/platform/impersonate",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      if (request.session.impersonatedStoreAccountId) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message:
            "Already impersonating a store account. " +
            "Stop the current session first: DELETE /api/platform/impersonate",
        });
      }

      const { storeAccountId } = startImpersonationSchema.parse(request.body);

      const target = await ImpersonationService.resolveImpersonationTarget(
        app.db,
        storeAccountId,
      );

      if (!target) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Store account not found or has no active members",
        });
      }

      request.session.impersonatedStoreAccountId = target.storeAccountId;
      request.session.impersonatedUserId = target.impersonatedUserId;

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "impersonation_start",
        actorUserId: request.currentUser.id,
        storeAccountId: target.storeAccountId,
        afterState: {
          storeAccountId: target.storeAccountId,
          storeSlug: target.storeSlug,
        },
        ipAddress: request.ip,
      });

      app.log.warn(
        {
          actorUserId: request.currentUser.id,
          storeAccountId: target.storeAccountId,
          ip: request.ip,
        },
        "[impersonation] Platform Super Admin started impersonation",
      );

      return reply.send({
        ok: true,
        impersonating: {
          storeAccountId: target.storeAccountId,
          storeSlug: target.storeSlug,
        },
      });
    },
  );

  // ── DELETE /api/platform/impersonate ─────────────────────────────────────
  // Stop the active impersonation session and return to normal admin context.
  app.delete(
    "/api/platform/impersonate",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const storeAccountId = request.session.impersonatedStoreAccountId;

      if (!storeAccountId) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "No active impersonation session",
        });
      }

      // Clear impersonation state from session (exactOptionalPropertyTypes: destroy
      // the keys entirely rather than setting to undefined).
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (request.session as unknown as Record<string, unknown>)["impersonatedStoreAccountId"];
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (request.session as unknown as Record<string, unknown>)["impersonatedUserId"];

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "impersonation_stop",
        actorUserId: request.currentUser.id,
        storeAccountId,
        beforeState: { storeAccountId },
        ipAddress: request.ip,
      });

      app.log.info(
        { actorUserId: request.currentUser.id, storeAccountId, ip: request.ip },
        "[impersonation] Platform Super Admin stopped impersonation",
      );

      return reply.send({ ok: true });
    },
  );

  // ── GET /api/platform/impersonate ─────────────────────────────────────────
  // Returns the current impersonation state.
  app.get(
    "/api/platform/impersonate",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const storeAccountId = request.session.impersonatedStoreAccountId ?? null;
      return reply.send({ impersonating: storeAccountId });
    },
  );
}
