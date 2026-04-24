import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as IntegrationsService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createProviderSchema,
  updateProviderSchema,
  connectIntegrationSchema,
  connectionIdParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const platformPreHandler = [requireAuth, requirePlatformAdmin] as const;

export async function integrationsRoutes(app: FastifyInstance): Promise<void> {

  // ─────────────────────────────────────────────────────────────────────────
  // Platform Admin: integration provider catalog management
  // ─────────────────────────────────────────────────────────────────────────

  app.get(
    "/api/platform/integrations",
    { preHandler: [...platformPreHandler] },
    async (_request, reply) => {
      const providers = await IntegrationsService.listProviders(app.db, true);
      return reply.send(providers);
    },
  );

  app.post(
    "/api/platform/integrations",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const body = createProviderSchema.parse(request.body);
      try {
        const provider = await IntegrationsService.createProvider(app.db, {
          slug: body.slug,
          name: body.name,
          authType: body.authType,
          configSchema: body.configSchema as Parameters<typeof IntegrationsService.createProvider>[1]["configSchema"],
          ...(body.description !== undefined && { description: body.description }),
          ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        });

        await recordAuditEvent(app.db, {
          eventType: "create",
          actionType: "create",
          entityType: "integration",
          entityId: provider.id,
          actorUserId: request.currentUser.id,
          afterState: { slug: provider.slug, name: provider.name },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.status(201).send(provider);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate") || msg.includes("unique")) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "An integration with that slug already exists.",
          });
        }
        throw err;
      }
    },
  );

  app.patch(
    "/api/platform/integrations/:providerId",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { providerId } = request.params as { providerId: string };
      const body = updateProviderSchema.parse(request.body);

      // Build opts imperatively to satisfy exactOptionalPropertyTypes.
      const updateOpts: Parameters<typeof IntegrationsService.updateProvider>[2] = {};
      if (body.name !== undefined) updateOpts.name = body.name;
      if (body.description !== undefined) updateOpts.description = body.description;
      if (body.logoUrl !== undefined) updateOpts.logoUrl = body.logoUrl;
      if (body.sortOrder !== undefined) updateOpts.sortOrder = body.sortOrder;
      if (body.isActive !== undefined) updateOpts.isActive = body.isActive;
      if (body.configSchema !== undefined) {
        // Cast needed because Zod's `.optional()` produces `boolean | undefined` for
        // nested optional fields, whereas the service interface uses exactOptionalPropertyTypes.
        updateOpts.configSchema = body.configSchema as Record<
          string,
          { type: string; label: string; secret?: boolean; required?: boolean }
        >;
      }
      const updated = await IntegrationsService.updateProvider(app.db, providerId, updateOpts);

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "integration",
        entityId: providerId,
        actorUserId: request.currentUser.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Store Account: integration connections
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/integrations — available providers + this store's connection status
  app.get(
    "/api/integrations",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const connections = await IntegrationsService.listConnectionsForStore(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(connections);
    },
  );

  // POST /api/integrations/connect — connect a provider
  app.post(
    "/api/integrations/connect",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = connectIntegrationSchema.parse(request.body);

      const connection = await IntegrationsService.connectIntegration(
        app.db,
        request.storeAccount.id,
        body.providerId,
        body.config,
        body.metadata,
      );

      await recordAuditEvent(app.db, {
        eventType: "connect",
        actionType: "connect",
        entityType: "integration",
        entityId: connection.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { providerId: body.providerId, status: connection.status },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send({ id: connection.id, status: connection.status });
    },
  );

  // GET /api/integrations/:connectionId — connection detail (no secrets)
  app.get(
    "/api/integrations/:connectionId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { connectionId } = connectionIdParamSchema.parse(request.params);
      const connection = await IntegrationsService.getConnection(
        app.db,
        connectionId,
        request.storeAccount.id,
      );
      if (!connection) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Integration connection not found.",
        });
      }
      return reply.send(connection);
    },
  );

  // POST /api/integrations/:connectionId/test — test credentials
  app.post(
    "/api/integrations/:connectionId/test",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { connectionId } = connectionIdParamSchema.parse(request.params);
      try {
        const result = await IntegrationsService.testConnection(
          app.db,
          connectionId,
          request.storeAccount.id,
        );
        return reply.send(result);
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 404) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Integration connection not found.",
          });
        }
        throw err;
      }
    },
  );

  // DELETE /api/integrations/:connectionId — disconnect
  app.delete(
    "/api/integrations/:connectionId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { connectionId } = connectionIdParamSchema.parse(request.params);

      const disconnected = await IntegrationsService.disconnectIntegration(
        app.db,
        connectionId,
        request.storeAccount.id,
      );

      if (!disconnected) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Integration connection not found.",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "disconnect",
        actionType: "disconnect",
        entityType: "integration",
        entityId: connectionId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { status: "disconnected" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );
}
