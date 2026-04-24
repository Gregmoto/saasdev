import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { checkPlanLimit } from "../../hooks/check-plan-limit.js";
import * as OrdersService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  updateFulfillmentStatusSchema,
  orderQuerySchema,
  orderIdParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function ordersRoutes(app: FastifyInstance): Promise<void> {

  // ── List orders ─────────────────────────────────────────────────────────────
  app.get(
    "/api/orders",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const opts = orderQuerySchema.parse(request.query);
      const shopId = opts.shopId ?? request.currentShopId ?? undefined;
      const result = await OrdersService.listOrders(
        app.db,
        request.storeAccount.id,
        { ...opts, ...(shopId !== undefined && { shopId }) },
      );
      return reply.send(result);
    },
  );

  // ── Create order ────────────────────────────────────────────────────────────
  app.post(
    "/api/orders",
    {
      preHandler: [
        ...storePreHandler,
        checkPlanLimit("maxOrders", (db, storeId) =>
          OrdersService.countOrders(db, storeId),
        ),
      ],
    },
    async (request, reply) => {
      const body = createOrderSchema.parse(request.body);
      const shopId = body.shopId ?? request.currentShopId ?? undefined;
      const order = await OrdersService.createOrder(
        app.db,
        request.storeAccount.id,
        body,
        shopId,
      );
      return reply.status(201).send(order);
    },
  );

  // ── Get order ───────────────────────────────────────────────────────────────
  app.get(
    "/api/orders/:orderId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const order = await OrdersService.getOrder(
        app.db,
        orderId,
        request.storeAccount.id,
      );
      if (!order) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Order not found",
        });
      }
      return reply.send(order);
    },
  );

  // ── Update order status ─────────────────────────────────────────────────────
  app.patch(
    "/api/orders/:orderId/status",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const { status } = updateOrderStatusSchema.parse(request.body);
      const updated = await OrdersService.updateOrderStatus(
        app.db,
        orderId,
        request.storeAccount.id,
        status,
      );
      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "order",
        entityId: orderId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { status },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
      return reply.send(updated);
    },
  );

  // ── Update payment status ───────────────────────────────────────────────────
  app.patch(
    "/api/orders/:orderId/payment-status",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const { paymentStatus } = updatePaymentStatusSchema.parse(request.body);
      const updated = await OrdersService.updatePaymentStatus(
        app.db,
        orderId,
        request.storeAccount.id,
        paymentStatus,
      );
      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "order",
        entityId: orderId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { paymentStatus },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
      return reply.send(updated);
    },
  );

  // ── Update fulfillment status ───────────────────────────────────────────────
  app.patch(
    "/api/orders/:orderId/fulfillment-status",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const { fulfillmentStatus } = updateFulfillmentStatusSchema.parse(request.body);
      const updated = await OrdersService.updateFulfillmentStatus(
        app.db,
        orderId,
        request.storeAccount.id,
        fulfillmentStatus,
      );
      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "order",
        entityId: orderId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { fulfillmentStatus },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
      return reply.send(updated);
    },
  );

  // ── Cancel order ────────────────────────────────────────────────────────────
  app.post(
    "/api/orders/:orderId/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);

      // Pre-check: 409 if already cancelled
      const existing = await OrdersService.getOrder(
        app.db,
        orderId,
        request.storeAccount.id,
      );
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Order not found",
        });
      }
      if (existing.status === "cancelled") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Order is already cancelled",
        });
      }

      const cancelled = await OrdersService.cancelOrder(
        app.db,
        orderId,
        request.storeAccount.id,
      );
      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "order",
        entityId: orderId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { status: "cancelled" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });
      return reply.send(cancelled);
    },
  );
}
