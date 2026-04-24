import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as RmaService from "./service.js";
import {
  createRmaSchema,
  updateRmaSchema,
  receiveRmaSchema,
  inspectRmaSchema,
  addRmaMessageSchema,
  rmaQuerySchema,
  rmaIdParamSchema,
  orderIdParamSchema,
} from "./schemas.js";
import { z } from "zod";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function rmaRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/rma — list
  app.get(
    "/api/rma",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = rmaQuerySchema.parse(request.query);
      const opts: {
        status?: string;
        orderId?: string;
        assignedToUserId?: string;
        page: number;
        limit: number;
      } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.orderId !== undefined) opts.orderId = query.orderId;
      if (query.assignedToUserId !== undefined) opts.assignedToUserId = query.assignedToUserId;

      const result = await RmaService.listRmas(app.db, request.storeAccount.id, opts);
      return reply.send(result);
    },
  );

  // POST /api/rma — create
  app.post(
    "/api/rma",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createRmaSchema.parse(request.body);
      const actorUserId = request.currentUser.id;

      const data: {
        orderId: string;
        reason: string;
        notes?: string;
        shopId?: string;
        customerEmail?: string;
        items: Array<{
          orderItemId: string;
          sku?: string;
          quantityRequested: number;
        }>;
      } = {
        orderId: body.orderId,
        reason: body.reason,
        items: body.items.map((item) => {
          const i: { orderItemId: string; sku?: string; quantityRequested: number } = {
            orderItemId: item.orderItemId,
            quantityRequested: item.quantityRequested,
          };
          if (item.sku !== undefined) i.sku = item.sku;
          return i;
        }),
      };
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.shopId !== undefined) data.shopId = body.shopId;
      if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail;

      const rma = await RmaService.createRma(
        app.db,
        request.storeAccount.id,
        actorUserId,
        data,
      );
      return reply.status(201).send(rma);
    },
  );

  // GET /api/rma/:id — get with items + messages
  app.get(
    "/api/rma/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const rma = await RmaService.getRma(app.db, id, request.storeAccount.id);
      if (!rma) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "RMA not found",
        });
      }
      return reply.send(rma);
    },
  );

  // PATCH /api/rma/:id — update notes/assignment/label info
  app.patch(
    "/api/rma/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const body = updateRmaSchema.parse(request.body);

      const data: {
        notes?: string;
        assignedToUserId?: string | null;
        returnLabelUrl?: string;
        returnLabelCarrier?: string;
        returnTrackingNumber?: string;
        refundAmountCents?: number;
      } = {};
      if (body.notes !== undefined) data.notes = body.notes;
      if ("assignedToUserId" in body && body.assignedToUserId !== undefined) {
        data.assignedToUserId = body.assignedToUserId;
      }
      if (body.returnLabelUrl !== undefined) data.returnLabelUrl = body.returnLabelUrl;
      if (body.returnLabelCarrier !== undefined)
        data.returnLabelCarrier = body.returnLabelCarrier;
      if (body.returnTrackingNumber !== undefined)
        data.returnTrackingNumber = body.returnTrackingNumber;
      if (body.refundAmountCents !== undefined) data.refundAmountCents = body.refundAmountCents;

      const rma = await RmaService.updateRma(app.db, id, request.storeAccount.id, data);
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/approve
  app.post(
    "/api/rma/:id/approve",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = z
        .object({
          returnLabelUrl: z.string().url().optional(),
          returnLabelCarrier: z.string().optional(),
        })
        .parse(request.body ?? {});

      const labelData: { returnLabelUrl?: string; returnLabelCarrier?: string } = {};
      if (body.returnLabelUrl !== undefined) labelData.returnLabelUrl = body.returnLabelUrl;
      if (body.returnLabelCarrier !== undefined)
        labelData.returnLabelCarrier = body.returnLabelCarrier;

      const rma = await RmaService.approveRma(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        Object.keys(labelData).length > 0 ? labelData : undefined,
      );
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/receive
  app.post(
    "/api/rma/:id/receive",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = receiveRmaSchema.parse(request.body);

      const data: {
        items: Array<{ rmaItemId: string; quantityReceived: number }>;
        notes?: string;
      } = {
        items: body.items,
      };
      if (body.notes !== undefined) data.notes = body.notes;

      const rma = await RmaService.receiveRma(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        data,
      );
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/inspect
  app.post(
    "/api/rma/:id/inspect",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = inspectRmaSchema.parse(request.body);

      const data: {
        items: Array<{
          rmaItemId: string;
          condition: "new" | "good" | "damaged" | "defective" | "missing_parts" | "unknown";
          disposition: "restock" | "refurbish" | "scrap" | "vendor_return" | "pending";
          restockedWarehouseId?: string;
          inspectionNotes?: string;
        }>;
      } = {
        items: body.items.map((item) => {
          const i: {
            rmaItemId: string;
            condition: "new" | "good" | "damaged" | "defective" | "missing_parts" | "unknown";
            disposition: "restock" | "refurbish" | "scrap" | "vendor_return" | "pending";
            restockedWarehouseId?: string;
            inspectionNotes?: string;
          } = {
            rmaItemId: item.rmaItemId,
            condition: item.condition,
            disposition: item.disposition,
          };
          if (item.restockedWarehouseId !== undefined)
            i.restockedWarehouseId = item.restockedWarehouseId;
          if (item.inspectionNotes !== undefined) i.inspectionNotes = item.inspectionNotes;
          return i;
        }),
      };

      const rma = await RmaService.inspectRma(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        data,
      );
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/refund
  app.post(
    "/api/rma/:id/refund",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = z
        .object({ refundAmountCents: z.number().int().nonnegative() })
        .parse(request.body);

      const result = await RmaService.resolveRmaWithRefund(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        body.refundAmountCents,
      );
      return reply.send(result);
    },
  );

  // POST /api/rma/:id/deny
  app.post(
    "/api/rma/:id/deny",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = z.object({ reason: z.string().min(1) }).parse(request.body);

      const rma = await RmaService.updateRmaStatus(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        "denied",
        body.reason,
      );
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/close
  app.post(
    "/api/rma/:id/close",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;

      const rma = await RmaService.updateRmaStatus(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        "closed",
      );
      return reply.send(rma);
    },
  );

  // POST /api/rma/:id/messages — add message
  app.post(
    "/api/rma/:id/messages",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const actorUserId = request.currentUser.id;
      const body = addRmaMessageSchema.parse(request.body);

      const data: {
        body: string;
        isInternal: boolean;
        authorType: "agent" | "customer" | "system";
        authorCustomerId?: string;
      } = {
        body: body.body,
        isInternal: body.isInternal,
        authorType: body.authorType,
      };
      if (body.authorCustomerId !== undefined)
        data.authorCustomerId = body.authorCustomerId;

      const msg = await RmaService.addRmaMessage(
        app.db,
        id,
        request.storeAccount.id,
        actorUserId,
        data,
      );
      return reply.status(201).send(msg);
    },
  );

  // GET /api/rma/:id/messages — list messages
  app.get(
    "/api/rma/:id/messages",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = rmaIdParamSchema.parse(request.params);
      const messages = await RmaService.getRmaMessages(
        app.db,
        id,
        request.storeAccount.id,
      );
      return reply.send(messages);
    },
  );

  // GET /api/orders/:orderId/rma — list RMAs for an order
  app.get(
    "/api/orders/:orderId/rma",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const result = await RmaService.listRmas(app.db, request.storeAccount.id, {
        orderId,
        page: 1,
        limit: 100,
      });
      return reply.send(result.data);
    },
  );
}
