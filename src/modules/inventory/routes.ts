import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { recordAuditEvent } from "../security/service.js";
import * as InventoryService from "./service.js";
import * as ReservationService from "./reservations.js";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  warehouseIdParamSchema,
  adjustInventorySchema,
  setInventorySchema,
  transferInventorySchema,
  inventoryQuerySchema,
  inventoryEventsQuerySchema,
  skuParamSchema,
  allocateInventorySchema,
  commitReservationSchema,
  releaseReservationOrderSchema,
  reservationQuerySchema,
  updateInventoryConfigSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {

  // ── Warehouses ──────────────────────────────────────────────────────────────

  app.get(
    "/api/inventory/warehouses",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { includeInactive } = request.query as { includeInactive?: string };
      const list = await InventoryService.listWarehouses(
        app.db,
        request.storeAccount.id,
        includeInactive === "true" || includeInactive === "1",
      );
      return reply.send(list);
    },
  );

  app.post(
    "/api/inventory/warehouses",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createWarehouseSchema.parse(request.body);

      const warehouse = await InventoryService.createWarehouse(
        app.db,
        request.storeAccount.id,
        {
          name: body.name,
          ...(body.type !== undefined && { type: body.type }),
          ...(body.address !== undefined && { address: body.address as Record<string, string> }),
          ...(body.priority !== undefined && { priority: body.priority }),
          ...(body.isEnabledForCheckout !== undefined && { isEnabledForCheckout: body.isEnabledForCheckout }),
          ...(body.leadTimeDays !== undefined && { leadTimeDays: body.leadTimeDays }),
        },
      );

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "warehouse",
        entityId: warehouse.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { name: warehouse.name, type: warehouse.type },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(warehouse);
    },
  );

  app.get(
    "/api/inventory/warehouses/:warehouseId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { warehouseId } = warehouseIdParamSchema.parse(request.params);
      const warehouse = await InventoryService.getWarehouse(
        app.db,
        warehouseId,
        request.storeAccount.id,
      );
      if (!warehouse) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Warehouse not found",
        });
      }
      return reply.send(warehouse);
    },
  );

  app.patch(
    "/api/inventory/warehouses/:warehouseId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { warehouseId } = warehouseIdParamSchema.parse(request.params);
      const body = updateWarehouseSchema.parse(request.body);

      const updated = await InventoryService.updateWarehouse(
        app.db,
        warehouseId,
        request.storeAccount.id,
        {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.type !== undefined && { type: body.type }),
          ...(body.address !== undefined && { address: body.address as Record<string, string> }),
          ...(body.priority !== undefined && { priority: body.priority }),
          ...(body.isEnabledForCheckout !== undefined && { isEnabledForCheckout: body.isEnabledForCheckout }),
          ...(body.leadTimeDays !== undefined && { leadTimeDays: body.leadTimeDays }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      );

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "warehouse",
        entityId: warehouseId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  app.delete(
    "/api/inventory/warehouses/:warehouseId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { warehouseId } = warehouseIdParamSchema.parse(request.params);
      const deleted = await InventoryService.deleteWarehouse(
        app.db,
        warehouseId,
        request.storeAccount.id,
      );

      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Warehouse not found",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "warehouse",
        entityId: warehouseId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  // ── Inventory Levels ────────────────────────────────────────────────────────

  app.get(
    "/api/inventory/levels",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = inventoryQuerySchema.parse(request.query);
      const result = await InventoryService.listInventoryLevels(
        app.db,
        request.storeAccount.id,
        {
          page: query.page,
          limit: query.limit,
          ...(query.warehouseId !== undefined && { warehouseId: query.warehouseId }),
          ...(query.sku !== undefined && { sku: query.sku }),
          ...(query.variantId !== undefined && { variantId: query.variantId }),
        },
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/inventory/summary",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { warehouseId } = request.query as { warehouseId?: string };
      const summary = await InventoryService.getTotalInventorySummary(
        app.db,
        request.storeAccount.id,
        warehouseId,
      );
      return reply.send(summary);
    },
  );

  app.get(
    "/api/inventory/levels/:warehouseId/:sku",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { warehouseId, sku } = skuParamSchema.parse(request.params);
      const level = await InventoryService.getInventoryLevel(
        app.db,
        warehouseId,
        sku,
        request.storeAccount.id,
      );
      if (!level) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Inventory level not found",
        });
      }
      return reply.send(level);
    },
  );

  app.get(
    "/api/inventory/available/:sku",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sku } = request.params as { sku: string };
      const qtyAvailable = await InventoryService.getAvailableQtyAcrossWarehouses(
        app.db,
        sku,
        request.storeAccount.id,
      );
      return reply.send({ sku, qtyAvailable });
    },
  );

  // ── Adjustments ─────────────────────────────────────────────────────────────

  app.post(
    "/api/inventory/adjust",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = adjustInventorySchema.parse(request.body);

      const result = await InventoryService.adjustInventory(
        app.db,
        request.storeAccount.id,
        {
          warehouseId: body.warehouseId,
          sku: body.sku,
          delta: body.delta,
          reason: body.reason,
          ...(body.variantId !== undefined && { variantId: body.variantId }),
          ...(body.referenceType !== undefined && { referenceType: body.referenceType }),
          ...(body.referenceId !== undefined && { referenceId: body.referenceId }),
          createdBy: request.currentUser.id,
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      );

      return reply.send(result);
    },
  );

  app.post(
    "/api/inventory/set",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = setInventorySchema.parse(request.body);

      const level = await InventoryService.setInventoryLevel(
        app.db,
        request.storeAccount.id,
        {
          warehouseId: body.warehouseId,
          sku: body.sku,
          qtyAvailable: body.qtyAvailable,
          ...(body.qtyReserved !== undefined && { qtyReserved: body.qtyReserved }),
          ...(body.qtyIncoming !== undefined && { qtyIncoming: body.qtyIncoming }),
          ...(body.variantId !== undefined && { variantId: body.variantId }),
        },
      );

      return reply.send(level);
    },
  );

  app.post(
    "/api/inventory/transfer",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = transferInventorySchema.parse(request.body);

      const result = await InventoryService.transferInventory(
        app.db,
        request.storeAccount.id,
        {
          fromWarehouseId: body.fromWarehouseId,
          toWarehouseId: body.toWarehouseId,
          sku: body.sku,
          qty: body.qty,
          ...(body.variantId !== undefined && { variantId: body.variantId }),
          ...(body.notes !== undefined && { notes: body.notes }),
        },
      );

      return reply.send(result);
    },
  );

  // ── Events ──────────────────────────────────────────────────────────────────

  app.get(
    "/api/inventory/events",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = inventoryEventsQuerySchema.parse(request.query);

      const result = await InventoryService.listInventoryEvents(
        app.db,
        request.storeAccount.id,
        {
          page: query.page,
          limit: query.limit,
          ...(query.warehouseId !== undefined && { warehouseId: query.warehouseId }),
          ...(query.sku !== undefined && { sku: query.sku }),
          ...(query.reason !== undefined && { reason: query.reason }),
          ...(query.referenceType !== undefined && { referenceType: query.referenceType }),
          ...(query.referenceId !== undefined && { referenceId: query.referenceId }),
          ...(query.from !== undefined && { from: query.from }),
          ...(query.to !== undefined && { to: query.to }),
        },
      );

      return reply.send(result);
    },
  );

  // ── Reservations ─────────────────────────────────────────────────────────────

  app.post(
    "/api/inventory/reservations/allocate",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = allocateInventorySchema.parse(request.body);

      const opts: {
        orderId: string;
        items: Array<{ sku: string; qty: number; variantId?: string }>;
        shopId?: string;
        strategy?: "priority" | "lowest_lead_time" | "manual";
        warehouseId?: string;
        expiresInMinutes?: number;
      } = {
        orderId: body.orderId,
        items: body.items.map((item) => {
          const i: { sku: string; qty: number; variantId?: string } = { sku: item.sku, qty: item.qty };
          if (item.variantId !== undefined) i.variantId = item.variantId;
          return i;
        }),
      };
      if (body.shopId !== undefined) opts.shopId = body.shopId;
      if (body.strategy !== undefined) opts.strategy = body.strategy;
      if (body.warehouseId !== undefined) opts.warehouseId = body.warehouseId;
      if (body.expiresInMinutes !== undefined) opts.expiresInMinutes = body.expiresInMinutes;

      const reservations = await ReservationService.allocateInventory(
        app.db,
        request.storeAccount.id,
        opts,
      );

      return reply.status(201).send(reservations);
    },
  );

  app.post(
    "/api/inventory/reservations/commit",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = commitReservationSchema.parse(request.body);

      const reservations = await ReservationService.commitReservationsForOrder(
        app.db,
        request.storeAccount.id,
        body.orderId,
      );

      return reply.send(reservations);
    },
  );

  app.post(
    "/api/inventory/reservations/release",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = releaseReservationOrderSchema.parse(request.body);

      const reservations = await ReservationService.releaseReservationsForOrder(
        app.db,
        request.storeAccount.id,
        body.orderId,
      );

      return reply.send(reservations);
    },
  );

  app.post(
    "/api/inventory/reservations/expire",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const count = await ReservationService.expireStaleReservations(
        app.db,
        request.storeAccount.id,
      );

      return reply.send({ expired: count });
    },
  );

  app.get(
    "/api/inventory/reservations",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = reservationQuerySchema.parse(request.query);

      const opts: {
        page: number;
        limit: number;
        orderId?: string;
        status?: "pending" | "committed" | "released" | "cancelled";
        warehouseId?: string;
        sku?: string;
      } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.orderId !== undefined) opts.orderId = query.orderId;
      if (query.status !== undefined) opts.status = query.status;
      if (query.warehouseId !== undefined) opts.warehouseId = query.warehouseId;
      if (query.sku !== undefined) opts.sku = query.sku;

      const result = await ReservationService.listReservations(
        app.db,
        request.storeAccount.id,
        opts,
      );

      return reply.send(result);
    },
  );

  // ── Inventory Config ──────────────────────────────────────────────────────────

  app.get(
    "/api/inventory/config",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const config = await ReservationService.getStoreInventoryConfig(
        app.db,
        request.storeAccount.id,
      );

      return reply.send(config);
    },
  );

  app.patch(
    "/api/inventory/config",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = updateInventoryConfigSchema.parse(request.body);

      const data: {
        commitTrigger?: "payment" | "fulfillment";
        allocationStrategy?: "priority" | "lowest_lead_time" | "manual";
        reservationTimeoutMinutes?: number;
        autoExpire?: boolean;
      } = {};
      if (body.commitTrigger !== undefined) data.commitTrigger = body.commitTrigger;
      if (body.allocationStrategy !== undefined) data.allocationStrategy = body.allocationStrategy;
      if (body.reservationTimeoutMinutes !== undefined) data.reservationTimeoutMinutes = body.reservationTimeoutMinutes;
      if (body.autoExpire !== undefined) data.autoExpire = body.autoExpire;

      const config = await ReservationService.updateStoreInventoryConfig(
        app.db,
        request.storeAccount.id,
        data,
      );

      return reply.send(config);
    },
  );
}
