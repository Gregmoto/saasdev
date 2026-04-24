import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as MarketplaceService from "./service.js";
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
  splitOrderSchema,
  vendorOrderQuerySchema,
  updateVendorOrderSchema,
  createSettlementSchema,
  updateSettlementSchema,
  createPayoutSchema,
  updatePayoutSchema,
  exportPayoutsQuerySchema,
  idParamSchema,
  vendorIdParamSchema,
} from "./schemas.js";
import { z } from "zod";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function marketplaceRoutes(app: FastifyInstance): Promise<void> {
  // ── Commission Rules ────────────────────────────────────────────────────────

  // GET /api/marketplace/commission-rules
  app.get(
    "/api/marketplace/commission-rules",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const rules = await MarketplaceService.listCommissionRules(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(rules);
    },
  );

  // POST /api/marketplace/commission-rules
  app.post(
    "/api/marketplace/commission-rules",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createCommissionRuleSchema.parse(request.body);
      const rule = await MarketplaceService.createCommissionRule(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(rule);
    },
  );

  // PATCH /api/marketplace/commission-rules/:id
  app.patch(
    "/api/marketplace/commission-rules/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateCommissionRuleSchema.parse(request.body);
      const rule = await MarketplaceService.updateCommissionRule(
        app.db,
        id,
        request.storeAccount.id,
        body,
      );
      return reply.send(rule);
    },
  );

  // DELETE /api/marketplace/commission-rules/:id
  app.delete(
    "/api/marketplace/commission-rules/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      await MarketplaceService.deleteCommissionRule(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // ── Order Splitting ─────────────────────────────────────────────────────────

  // POST /api/marketplace/orders/split
  app.post(
    "/api/marketplace/orders/split",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = splitOrderSchema.parse(request.body);
      const vendorOrdersList = await MarketplaceService.splitOrderByVendor(
        app.db,
        request.storeAccount.id,
        body.orderId,
      );
      return reply.status(201).send(vendorOrdersList);
    },
  );

  // ── Vendor Orders ───────────────────────────────────────────────────────────

  // GET /api/marketplace/vendor-orders
  app.get(
    "/api/marketplace/vendor-orders",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = vendorOrderQuerySchema.parse(request.query);
      const opts: {
        page: number;
        limit: number;
        status?: string;
        vendorId?: string;
      } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.vendorId !== undefined) opts.vendorId = query.vendorId;

      const result = await MarketplaceService.listVendorOrders(
        app.db,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  // GET /api/marketplace/vendor-orders/:id
  app.get(
    "/api/marketplace/vendor-orders/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const order = await MarketplaceService.getVendorOrder(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Vendor order not found",
        });
      }
      return reply.send(order);
    },
  );

  // PATCH /api/marketplace/vendor-orders/:id
  app.patch(
    "/api/marketplace/vendor-orders/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateVendorOrderSchema.parse(request.body);

      const data: {
        status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
        trackingNumber?: string;
        trackingCarrier?: string;
        trackingUrl?: string;
      } = {};
      if (body.status !== undefined) data.status = body.status;
      if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber;
      if (body.trackingCarrier !== undefined) data.trackingCarrier = body.trackingCarrier;
      if (body.trackingUrl !== undefined) data.trackingUrl = body.trackingUrl;

      const order = await MarketplaceService.updateVendorOrder(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      return reply.send(order);
    },
  );

  // ── Settlements ─────────────────────────────────────────────────────────────

  // GET /api/marketplace/settlements
  app.get(
    "/api/marketplace/settlements",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = z
        .object({
          status: z.enum(["open", "closed", "paid"]).optional(),
          vendorId: z.string().uuid().optional(),
        })
        .parse(request.query);

      const opts: { status?: string; vendorId?: string } = {};
      if (query.status !== undefined) opts.status = query.status;
      if (query.vendorId !== undefined) opts.vendorId = query.vendorId;

      const settlements = await MarketplaceService.listSettlements(
        app.db,
        request.storeAccount.id,
        opts,
      );
      return reply.send(settlements);
    },
  );

  // POST /api/marketplace/settlements
  app.post(
    "/api/marketplace/settlements",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createSettlementSchema.parse(request.body);
      const settlement = await MarketplaceService.createSettlement(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(settlement);
    },
  );

  // GET /api/marketplace/settlements/:id
  app.get(
    "/api/marketplace/settlements/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const settlement = await MarketplaceService.getSettlement(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!settlement) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Settlement not found",
        });
      }
      return reply.send(settlement);
    },
  );

  // POST /api/marketplace/settlements/:id/close
  app.post(
    "/api/marketplace/settlements/:id/close",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const settlement = await MarketplaceService.closeSettlement(
        app.db,
        id,
        request.storeAccount.id,
      );
      return reply.send(settlement);
    },
  );

  // ── Payouts ─────────────────────────────────────────────────────────────────

  // GET /api/marketplace/payouts/export  (must be before /:id to avoid conflict)
  app.get(
    "/api/marketplace/payouts/export",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = exportPayoutsQuerySchema.parse(request.query);

      const opts: { statusFilter?: string } = {};
      if (query.status !== undefined) opts.statusFilter = query.status;

      const content = await MarketplaceService.exportPayouts(
        app.db,
        request.storeAccount.id,
        query.format,
        opts.statusFilter,
      );

      if (query.format === "csv") {
        return reply
          .header("Content-Type", "text/csv")
          .header("Content-Disposition", "attachment; filename=payouts.csv")
          .send(content);
      }

      // bgmax
      return reply
        .header("Content-Type", "text/plain")
        .header("Content-Disposition", "attachment; filename=payouts.bgmax")
        .send(content);
    },
  );

  // GET /api/marketplace/payouts
  app.get(
    "/api/marketplace/payouts",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          status: z.enum(["pending", "processing", "paid", "failed"]).optional(),
          vendorId: z.string().uuid().optional(),
        })
        .parse(request.query);

      const opts: {
        page: number;
        limit: number;
        status?: string;
        vendorId?: string;
      } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.vendorId !== undefined) opts.vendorId = query.vendorId;

      const result = await MarketplaceService.listPayouts(
        app.db,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  // POST /api/marketplace/payouts
  app.post(
    "/api/marketplace/payouts",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createPayoutSchema.parse(request.body);
      const payout = await MarketplaceService.createPayout(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(payout);
    },
  );

  // PATCH /api/marketplace/payouts/:id
  app.patch(
    "/api/marketplace/payouts/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updatePayoutSchema.parse(request.body);

      const data: {
        status?: "pending" | "processing" | "paid" | "failed";
        paymentReference?: string;
        paidAt?: string;
        notes?: string;
      } = {};
      if (body.status !== undefined) data.status = body.status;
      if (body.paymentReference !== undefined) data.paymentReference = body.paymentReference;
      if (body.paidAt !== undefined) data.paidAt = body.paidAt;
      if (body.notes !== undefined) data.notes = body.notes;

      const payout = await MarketplaceService.updatePayout(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      return reply.send(payout);
    },
  );

  // ── Vendor Dashboard ────────────────────────────────────────────────────────

  // GET /api/marketplace/vendors/:vendorId/dashboard
  app.get(
    "/api/marketplace/vendors/:vendorId/dashboard",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { vendorId } = vendorIdParamSchema.parse(request.params);
      const dashboard = await MarketplaceService.getVendorDashboard(
        app.db,
        request.storeAccount.id,
        vendorId,
      );
      return reply.send(dashboard);
    },
  );
}
