import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ReportsService from "./service.js";
import { reportsQuerySchema, topProductsQuerySchema } from "./schemas.js";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

export async function reportsRoutes(app: FastifyInstance): Promise<void> {

  app.get(
    "/api/reports/revenue",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = reportsQuerySchema.parse(request.query);
      const from = new Date(query.from);
      const to = new Date(query.to);
      const result = await ReportsService.getRevenueSummary(
        app.db,
        request.storeAccount.id,
        from,
        to,
        query.groupBy,
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/reports/orders",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = reportsQuerySchema.parse(request.query);
      const from = new Date(query.from);
      const to = new Date(query.to);
      const result = await ReportsService.getOrdersSummary(
        app.db,
        request.storeAccount.id,
        from,
        to,
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/reports/top-products",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = topProductsQuerySchema.parse(request.query);
      const from = query.from !== undefined ? new Date(query.from) : new Date(0);
      const to = query.to !== undefined ? new Date(query.to) : new Date();
      const result = await ReportsService.getTopProducts(
        app.db,
        request.storeAccount.id,
        from,
        to,
        query.limit,
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/reports/customers",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = reportsQuerySchema.parse(request.query);
      const from = new Date(query.from);
      const to = new Date(query.to);
      const result = await ReportsService.getCustomerStats(
        app.db,
        request.storeAccount.id,
        from,
        to,
      );
      return reply.send(result);
    },
  );
}
