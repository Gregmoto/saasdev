import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as PlatformAdminService from "./service.js";
import * as SecurityService from "../security/service.js";
import {
  createStoreAccountSchema,
  updateStoreAccountSchema,
  storeStatusActionSchema,
  listStoreAccountsSchema,
  listLogsSchema,
} from "./schemas.js";

const PA = [requireAuth, requirePlatformAdmin] as const;

export async function platformAdminRoutes(app: FastifyInstance): Promise<void> {
  // ── Store Account list ────────────────────────────────────────────────────
  app.get(
    "/api/platform/store-accounts",
    { preHandler: [...PA] },
    async (request, reply) => {
      const q = listStoreAccountsSchema.parse(request.query);
      const accounts = await PlatformAdminService.listStoreAccounts(app.db, {
        limit: q.limit,
        offset: q.offset,
        ...(q.status !== undefined && { status: q.status }),
        ...(q.mode !== undefined && { mode: q.mode }),
        ...(q.search !== undefined && { search: q.search }),
      });
      return reply.send(accounts);
    },
  );

  // ── Store Account detail ──────────────────────────────────────────────────
  app.get(
    "/api/platform/store-accounts/:id",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const account = await PlatformAdminService.getStoreAccountById(app.db, id);
      if (!account) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Store account not found" });
      }
      return reply.send(account);
    },
  );

  // ── Create Store Account ──────────────────────────────────────────────────
  app.post(
    "/api/platform/store-accounts",
    { preHandler: [...PA] },
    async (request, reply) => {
      const body = createStoreAccountSchema.parse(request.body);
      try {
        const result = await PlatformAdminService.createStoreAccount(app.db, {
          actorUserId: request.currentUser.id,
          name: body.name,
          slug: body.slug,
          mode: body.mode,
          plan: body.plan,
          adminEmail: body.adminEmail,
          adminPassword: body.adminPassword,
          status: body.status,
          ...(body.planLimits !== undefined && { planLimits: body.planLimits }),
        });

        await SecurityService.recordAuditEvent(app.db, {
          eventType: "role_change",
          actorUserId: request.currentUser.id,
          storeAccountId: result.storeAccountId,
          afterState: { action: "create", slug: body.slug, status: body.status },
          ipAddress: request.ip,
        });

        return reply.status(201).send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate") || msg.includes("unique")) {
          return reply.status(409).send({ statusCode: 409, error: "Conflict", message: "Slug already taken" });
        }
        throw err;
      }
    },
  );

  // ── Update Store Account ──────────────────────────────────────────────────
  app.patch(
    "/api/platform/store-accounts/:id",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateStoreAccountSchema.parse(request.body);
      const updated = await PlatformAdminService.updateStoreAccount(app.db, id, {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.mode !== undefined && { mode: body.mode }),
        ...(body.plan !== undefined && { plan: body.plan }),
        ...(body.planLimits !== undefined && { planLimits: body.planLimits }),
        ...(body.settings !== undefined && { settings: body.settings }),
      });

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "role_change",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
      });

      return reply.send(updated);
    },
  );

  // ── Approve ───────────────────────────────────────────────────────────────
  app.post(
    "/api/platform/store-accounts/:id/approve",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await PlatformAdminService.approveStoreAccount(app.db, id, request.currentUser.id);

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "role_change",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: { action: "approve" },
        ipAddress: request.ip,
      });

      app.log.info({ actorUserId: request.currentUser.id, storeAccountId: id }, "[platform] Store account approved");
      return reply.send({ ok: true });
    },
  );

  // ── Suspend ───────────────────────────────────────────────────────────────
  app.post(
    "/api/platform/store-accounts/:id/suspend",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = storeStatusActionSchema.parse(request.body);
      await PlatformAdminService.suspendStoreAccount(app.db, id, reason);

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "role_change",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: { action: "suspend", reason },
        ipAddress: request.ip,
      });

      return reply.send({ ok: true });
    },
  );

  // ── Reactivate ────────────────────────────────────────────────────────────
  app.post(
    "/api/platform/store-accounts/:id/reactivate",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await PlatformAdminService.reactivateStoreAccount(app.db, id, request.currentUser.id);

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "role_change",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: { action: "reactivate" },
        ipAddress: request.ip,
      });

      return reply.send({ ok: true });
    },
  );

  // ── Close ─────────────────────────────────────────────────────────────────
  app.post(
    "/api/platform/store-accounts/:id/close",
    { preHandler: [...PA] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = storeStatusActionSchema.parse(request.body);
      await PlatformAdminService.closeStoreAccount(app.db, id, reason);

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "role_change",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: { action: "close", reason },
        ipAddress: request.ip,
      });

      return reply.send({ ok: true });
    },
  );

  // ── Security logs ─────────────────────────────────────────────────────────
  app.get(
    "/api/platform/logs/security",
    { preHandler: [...PA] },
    async (request, reply) => {
      const q = listLogsSchema.parse(request.query);
      const logs = await PlatformAdminService.listSecurityLogs(app.db, {
        limit: q.limit,
        offset: q.offset,
        ...(q.storeAccountId !== undefined && { storeAccountId: q.storeAccountId }),
        ...(q.userId !== undefined && { userId: q.userId }),
        ...(q.eventType !== undefined && { eventType: q.eventType }),
      });
      return reply.send(logs);
    },
  );

  // ── Audit logs ────────────────────────────────────────────────────────────
  app.get(
    "/api/platform/logs/audit",
    { preHandler: [...PA] },
    async (request, reply) => {
      const q = listLogsSchema.parse(request.query);
      const logs = await PlatformAdminService.listAuditLogs(app.db, {
        limit: q.limit,
        offset: q.offset,
        ...(q.storeAccountId !== undefined && { storeAccountId: q.storeAccountId }),
        ...(q.userId !== undefined && { userId: q.userId }),
        ...(q.eventType !== undefined && { eventType: q.eventType }),
      });
      return reply.send(logs);
    },
  );
}
