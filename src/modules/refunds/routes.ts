import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as RefundsService from "./service.js";
import {
  createRefundSchema,
  updateRefundSchema,
  refundIdParamSchema,
  orderIdParamSchema,
  listRefundsQuerySchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function refundRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/refunds?orderId=&status=
  app.get(
    "/api/refunds",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = listRefundsQuerySchema.parse(request.query);
      const opts: { orderId?: string; status?: string } = {};
      if (query.orderId !== undefined) opts.orderId = query.orderId;
      if (query.status !== undefined) opts.status = query.status;
      const result = await RefundsService.listRefunds(app.db, request.storeAccount.id, opts);
      return reply.send(result);
    },
  );

  // POST /api/refunds
  app.post(
    "/api/refunds",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createRefundSchema.parse(request.body);

      const data: {
        orderId: string;
        paymentId?: string;
        method: "original_payment" | "manual_bank" | "manual_cash" | "store_credit" | "other";
        amountCents: number;
        reason: string;
        isPartial: boolean;
        items?: Array<{ orderItemId: string; quantity: number; amountCents: number }>;
        notes?: string;
        actorUserId?: string;
      } = {
        orderId: body.orderId,
        method: body.method,
        amountCents: body.amountCents,
        reason: body.reason,
        isPartial: body.isPartial,
      };
      if (body.paymentId !== undefined) data.paymentId = body.paymentId;
      if (body.items !== undefined) data.items = body.items;
      if (body.notes !== undefined) data.notes = body.notes;
      if (request.currentUser?.id !== undefined) data.actorUserId = request.currentUser.id;

      const refund = await RefundsService.createRefund(app.db, request.storeAccount.id, data);
      return reply.status(201).send(refund);
    },
  );

  // GET /api/refunds/:id
  app.get(
    "/api/refunds/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = refundIdParamSchema.parse(request.params);
      const refund = await RefundsService.getRefund(app.db, id, request.storeAccount.id);
      if (!refund) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Refund not found",
        });
      }
      return reply.send(refund);
    },
  );

  // PATCH /api/refunds/:id
  app.patch(
    "/api/refunds/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = refundIdParamSchema.parse(request.params);
      const body = updateRefundSchema.parse(request.body);

      const data: {
        status?: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
        providerRefundId?: string;
        notes?: string;
        failureReason?: string;
        actorUserId?: string;
      } = {};
      if (body.status !== undefined) data.status = body.status;
      if (body.providerRefundId !== undefined) data.providerRefundId = body.providerRefundId;
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.failureReason !== undefined) data.failureReason = body.failureReason;
      if (request.currentUser?.id !== undefined) data.actorUserId = request.currentUser.id;

      const refund = await RefundsService.updateRefund(app.db, id, request.storeAccount.id, data);
      return reply.send(refund);
    },
  );

  // POST /api/refunds/:id/cancel
  app.post(
    "/api/refunds/:id/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = refundIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser?.id;
      const refund = await RefundsService.cancelRefund(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
      );
      return reply.send(refund);
    },
  );

  // GET /api/orders/:orderId/refunds
  app.get(
    "/api/orders/:orderId/refunds",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const result = await RefundsService.getRefundsByOrder(
        app.db,
        orderId,
        request.storeAccount.id,
      );
      return reply.send(result);
    },
  );
}
