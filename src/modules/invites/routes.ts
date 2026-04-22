import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requireRole } from "../../hooks/require-role.js";
import { requirePermission } from "../../hooks/require-permission.js";
import * as InviteService from "./service.js";
import { resolveStoreAccountIdFromRequest } from "../../hooks/require-store-account.js";
import {
  createInviteSchema,
  acceptInviteSchema,
  revokeInviteSchema,
  revokeMemberSchema,
} from "./schemas.js";
import { config } from "../../config.js";
import type { MemberRole } from "../../db/schema/index.js";
import { trackSession } from "../auth/service.js";

export async function inviteRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/invites — send invite email ─────────────────────────────────
  // Requires: store_admin role + members:invite permission
  app.post(
    "/api/invites",
    {
      preHandler: [
        requireAuth,
        requireStoreAccountContext,
        requireRole("store_admin", "marketplace_owner"),
        requirePermission("members:invite"),
      ],
    },
    async (request, reply) => {
      const body = createInviteSchema.parse(request.body);

      await InviteService.createInvite(app.db, {
        storeAccountId: request.storeAccount.id,
        email: body.email,
        roleKey: body.role as MemberRole,
        invitedBy: request.currentUser.id,
      });

      return reply.status(201).send({ ok: true });
    },
  );

  // ── GET /api/invites — list pending invites for this store ─────────────────
  app.get(
    "/api/invites",
    {
      preHandler: [
        requireAuth,
        requireStoreAccountContext,
        requireRole("store_admin", "marketplace_owner"),
        requirePermission("members:read"),
      ],
    },
    async (request, reply) => {
      const invites = await InviteService.listInvites(app.db, request.storeAccount.id);
      return reply.send(invites);
    },
  );

  // ── DELETE /api/invites/:id — revoke a pending invite ─────────────────────
  app.delete(
    "/api/invites/:id",
    {
      preHandler: [
        requireAuth,
        requireStoreAccountContext,
        requireRole("store_admin", "marketplace_owner"),
        requirePermission("members:revoke"),
      ],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await InviteService.revokeInvite(app.db, id, request.storeAccount.id);
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Invite not found or already accepted",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── DELETE /api/members/:userId — revoke member access ────────────────────
  app.delete(
    "/api/members/:userId",
    {
      preHandler: [
        requireAuth,
        requireStoreAccountContext,
        requireRole("store_admin", "marketplace_owner"),
        requirePermission("members:revoke"),
      ],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };

      let ok: boolean;
      try {
        ok = await InviteService.revokeMembership(
          app.db,
          userId,
          request.storeAccount.id,
          request.currentUser.id,
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 400).send({
          statusCode: e.statusCode ?? 400,
          error: "Bad Request",
          message: e.message ?? "Could not revoke membership",
        });
      }

      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Member not found or already revoked",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── GET /auth/invite/preview?token=... — info for the accept form ──────────
  // Public — outside /api/, no guards required.
  app.get("/auth/invite/preview", async (request, reply) => {
    const token = (request.query as Record<string, string | undefined>)["token"];
    if (!token) {
      return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Token required" });
    }
    const preview = await InviteService.getInvitePreview(app.db, token);
    if (!preview) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired invite link",
      });
    }
    return reply.send(preview);
  });

  // ── POST /auth/invite/accept — user sets password + membership created ─────
  app.post(
    "/auth/invite/accept",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = acceptInviteSchema.parse(request.body);

      let result: Awaited<ReturnType<typeof InviteService.acceptInvite>>;
      try {
        result = await InviteService.acceptInvite(app.db, {
          rawToken: body.token,
          password: body.password,
        });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        return reply.status(e.statusCode ?? 400).send({
          statusCode: e.statusCode ?? 400,
          error: "Bad Request",
          message: e.message,
        });
      }

      // Create a session for the newly accepted user.
      request.session.userId = result.userId;
      request.session.totpVerified = true;
      request.session.lastActiveStoreAccountId = result.storeAccountId;

      await trackSession(app.db, {
        sessionId: request.session.sessionId,
        userId: result.userId,
        storeAccountId: result.storeAccountId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        ttlSeconds: config.SESSION_TTL_SECONDS,
      });

      return reply.status(201).send({
        ok: true,
        userId: result.userId,
        role: result.role,
        storeAccountId: result.storeAccountId,
      });
    },
  );
}
