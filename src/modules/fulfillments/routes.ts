import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import {
  fulfillmentItems,
  fulfillmentTrackingEvents,
} from "../../db/schema/fulfillments.js";
import * as FulfillmentsService from "./service.js";
import {
  createFulfillmentSchema,
  updateFulfillmentSchema,
  addTrackingEventSchema,
  fulfillmentIdParamSchema,
  orderIdParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function fulfillmentRoutes(app: FastifyInstance): Promise<void> {

  // ── Order fulfillments ──────────────────────────────────────────────────────
  // Note: PATCH /api/orders/:orderId/status and POST /api/orders/:orderId/cancel
  // are owned by ordersModule — not duplicated here.

  // GET /api/orders/:orderId/fulfillments — full order with fulfillments
  app.get(
    "/api/orders/:orderId/fulfillments",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);

      const result = await FulfillmentsService.getOrderWithFulfillments(
        app.db,
        orderId,
        request.storeAccount.id,
      );

      if (!result) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Order not found",
        });
      }

      return reply.send(result);
    },
  );

  // POST /api/orders/:orderId/fulfillments — create fulfillment
  app.post(
    "/api/orders/:orderId/fulfillments",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const body = createFulfillmentSchema.parse(request.body);

      if (body.orderId !== orderId) {
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "orderId in body must match URL parameter",
        });
      }

      // Build data imperatively to satisfy exactOptionalPropertyTypes
      const createData: {
        orderId: string;
        items: Array<{ orderItemId: string; sku?: string; quantity: number }>;
        trackingNumber?: string;
        trackingCarrier?: string;
        trackingUrl?: string;
        shippingMethodName?: string;
        estimatedDeliveryAt?: string;
        notes?: string;
      } = {
        orderId: body.orderId,
        items: body.items.map((item) => {
          const mapped: { orderItemId: string; sku?: string; quantity: number } = {
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          };
          if (item.sku !== undefined) mapped.sku = item.sku;
          return mapped;
        }),
      };

      if (body.trackingNumber !== undefined) createData.trackingNumber = body.trackingNumber;
      if (body.trackingCarrier !== undefined) createData.trackingCarrier = body.trackingCarrier;
      if (body.trackingUrl !== undefined) createData.trackingUrl = body.trackingUrl;
      if (body.shippingMethodName !== undefined) createData.shippingMethodName = body.shippingMethodName;
      if (body.estimatedDeliveryAt !== undefined) createData.estimatedDeliveryAt = body.estimatedDeliveryAt;
      if (body.notes !== undefined) createData.notes = body.notes;

      try {
        const fulfillment = await FulfillmentsService.createFulfillment(
          app.db,
          request.storeAccount.id,
          createData,
        );
        return reply.status(201).send(fulfillment);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create fulfillment";
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message,
        });
      }
    },
  );

  // ── Single fulfillment ──────────────────────────────────────────────────────

  // GET /api/fulfillments/:id — get single fulfillment with items + tracking
  app.get(
    "/api/fulfillments/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = fulfillmentIdParamSchema.parse(request.params);

      const fulfillment = await FulfillmentsService.getFulfillment(
        app.db,
        id,
        request.storeAccount.id,
      );

      if (!fulfillment) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Fulfillment not found",
        });
      }

      const items = await app.db
        .select()
        .from(fulfillmentItems)
        .where(eq(fulfillmentItems.fulfillmentId, id));

      const trackingEvents = await app.db
        .select()
        .from(fulfillmentTrackingEvents)
        .where(eq(fulfillmentTrackingEvents.fulfillmentId, id));

      return reply.send({ ...fulfillment, items, trackingEvents });
    },
  );

  // PATCH /api/fulfillments/:id — update status/tracking
  app.patch(
    "/api/fulfillments/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = fulfillmentIdParamSchema.parse(request.params);
      const body = updateFulfillmentSchema.parse(request.body);

      // Build data imperatively to satisfy exactOptionalPropertyTypes
      const updateData: {
        status?: string;
        trackingNumber?: string;
        trackingCarrier?: string;
        trackingUrl?: string;
        shippingMethodName?: string;
        estimatedDeliveryAt?: string;
        notes?: string;
      } = {};

      if (body.status !== undefined) updateData.status = body.status;
      if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
      if (body.trackingCarrier !== undefined) updateData.trackingCarrier = body.trackingCarrier;
      if (body.trackingUrl !== undefined) updateData.trackingUrl = body.trackingUrl;
      if (body.shippingMethodName !== undefined) updateData.shippingMethodName = body.shippingMethodName;
      if (body.estimatedDeliveryAt !== undefined) updateData.estimatedDeliveryAt = body.estimatedDeliveryAt;
      if (body.notes !== undefined) updateData.notes = body.notes;

      try {
        await FulfillmentsService.updateFulfillment(
          app.db,
          id,
          request.storeAccount.id,
          updateData,
        );
        return reply.send({ ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update fulfillment";
        if (message === "Fulfillment not found") {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message,
          });
        }
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message,
        });
      }
    },
  );

  // POST /api/fulfillments/:id/cancel
  app.post(
    "/api/fulfillments/:id/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = fulfillmentIdParamSchema.parse(request.params);

      try {
        await FulfillmentsService.cancelFulfillment(
          app.db,
          id,
          request.storeAccount.id,
        );
        return reply.send({ ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel fulfillment";
        if (message === "Fulfillment not found") {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message,
          });
        }
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message,
        });
      }
    },
  );

  // ── Tracking events ─────────────────────────────────────────────────────────

  // GET /api/fulfillments/:id/tracking — list tracking events
  app.get(
    "/api/fulfillments/:id/tracking",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = fulfillmentIdParamSchema.parse(request.params);

      // Verify store access
      const fulfillment = await FulfillmentsService.getFulfillment(
        app.db,
        id,
        request.storeAccount.id,
      );

      if (!fulfillment) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Fulfillment not found",
        });
      }

      const events = await FulfillmentsService.listTrackingEvents(app.db, id);
      return reply.send(events);
    },
  );

  // POST /api/fulfillments/:id/tracking — add tracking event
  app.post(
    "/api/fulfillments/:id/tracking",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = fulfillmentIdParamSchema.parse(request.params);
      const body = addTrackingEventSchema.parse(request.body);

      // Build data imperatively to satisfy exactOptionalPropertyTypes
      const eventData: {
        status: string;
        occurredAt: string;
        description?: string;
        location?: string;
      } = {
        status: body.status,
        occurredAt: body.occurredAt,
      };

      if (body.description !== undefined) eventData.description = body.description;
      if (body.location !== undefined) eventData.location = body.location;

      try {
        await FulfillmentsService.addTrackingEvent(
          app.db,
          id,
          request.storeAccount.id,
          eventData,
        );
        return reply.status(201).send({ ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add tracking event";
        if (message === "Fulfillment not found") {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message,
          });
        }
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message,
        });
      }
    },
  );
}
