import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as DomainsService from "./service.js";
import { addDomainSchema, domainIdParamSchema } from "./schemas.js";

export async function domainsRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [requireAuth, requireStoreAccountContext];

  // ── GET /api/domains ───────────────────────────────────────────────────────
  app.get("/api/domains", { preHandler }, async (request) => {
    return DomainsService.listDomains(app.db, request.storeAccount.id);
  });

  // ── POST /api/domains ──────────────────────────────────────────────────────
  app.post("/api/domains", { preHandler }, async (request, reply) => {
    const body = addDomainSchema.parse(request.body);
    const result = await DomainsService.addDomain(app.db, {
      storeAccountId: request.storeAccount.id,
      hostname: body.hostname,
      verificationType: body.verificationType,
    });
    return reply.status(201).send(result);
  });

  // ── GET /api/domains/:domainId ─────────────────────────────────────────────
  app.get("/api/domains/:domainId", { preHandler }, async (request, reply) => {
    const { domainId } = domainIdParamSchema.parse(request.params);
    const result = await DomainsService.getDomainChallenge(
      app.db,
      domainId,
      request.storeAccount.id,
    );
    if (!result) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Domain not found",
      });
    }
    return result;
  });

  // ── POST /api/domains/:domainId/verify ────────────────────────────────────
  app.post("/api/domains/:domainId/verify", { preHandler }, async (request, reply) => {
    const { domainId } = domainIdParamSchema.parse(request.params);
    try {
      const result = await DomainsService.verifyDomain(
        app.db,
        domainId,
        request.storeAccount.id,
      );
      return reply.send(result);
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Domain not found",
        });
      }
      throw err;
    }
  });

  // ── POST /api/domains/:domainId/primary ───────────────────────────────────
  app.post("/api/domains/:domainId/primary", { preHandler }, async (request, reply) => {
    const { domainId } = domainIdParamSchema.parse(request.params);
    try {
      await DomainsService.setPrimaryDomain(app.db, domainId, request.storeAccount.id);
      return reply.status(204).send();
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Domain not found",
        });
      }
      if (statusCode === 409) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: (err as Error).message,
        });
      }
      throw err;
    }
  });

  // ── DELETE /api/domains/:domainId ─────────────────────────────────────────
  app.delete("/api/domains/:domainId", { preHandler }, async (request, reply) => {
    const { domainId } = domainIdParamSchema.parse(request.params);
    const deleted = await DomainsService.removeDomain(
      app.db,
      domainId,
      request.storeAccount.id,
    );
    if (!deleted) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Domain not found",
      });
    }
    return reply.status(204).send();
  });
}
