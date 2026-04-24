import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { checkPlanLimit } from "../../hooks/check-plan-limit.js";
import * as ShopsService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createShopSchema,
  updateShopSchema,
  shopIdParamSchema,
  addShopDomainSchema,
  domainIdParamSchema,
  shopProductQuerySchema,
  setVisibilitySchema,
  bulkVisibilitySchema,
  setShopPriceSchema,
  bulkShopPriceSchema,
  variantPriceParamSchema,
  addShopWarehouseSchema,
  updateShopWarehouseSchema,
  shopWarehouseParamSchema,
  shopStockQuerySchema,
} from "./schemas.js";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

export async function shopsRoutes(app: FastifyInstance): Promise<void> {

  // ── Shop CRUD ───────────────────────────────────────────────────────────────

  app.get(
    "/api/shops",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const shops = await ShopsService.listShops(app.db, request.storeAccount.id);
      return reply.send(shops);
    },
  );

  app.post(
    "/api/shops",
    {
      preHandler: [
        ...preHandler,
        checkPlanLimit("maxStorefronts", (db, storeAccountId) =>
          ShopsService.countShops(db, storeAccountId),
        ),
      ],
    },
    async (request, reply) => {
      const body = createShopSchema.parse(request.body);

      const data: {
        name: string;
        slug: string;
        defaultLanguage?: string;
        defaultCurrency?: string;
        themeId?: string;
        sortOrder?: number;
      } = {
        name: body.name,
        slug: body.slug,
      };
      if (body.defaultLanguage !== undefined) data.defaultLanguage = body.defaultLanguage;
      if (body.defaultCurrency !== undefined) data.defaultCurrency = body.defaultCurrency;
      if (body.themeId !== undefined) data.themeId = body.themeId;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

      let shop;
      try {
        shop = await ShopsService.createShop(app.db, request.storeAccount.id, data);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 409) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: (err as Error).message,
          });
        }
        throw err;
      }

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "shop",
        entityId: shop.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { name: shop.name, slug: shop.slug },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(shop);
    },
  );

  app.get(
    "/api/shops/:shopId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      return reply.send(shop);
    },
  );

  app.patch(
    "/api/shops/:shopId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const body = updateShopSchema.parse(request.body);

      const data: {
        name?: string;
        defaultLanguage?: string;
        defaultCurrency?: string;
        themeId?: string;
        sortOrder?: number;
        isActive?: boolean;
      } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.defaultLanguage !== undefined) data.defaultLanguage = body.defaultLanguage;
      if (body.defaultCurrency !== undefined) data.defaultCurrency = body.defaultCurrency;
      if (body.themeId !== undefined) data.themeId = body.themeId;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
      if (body.isActive !== undefined) data.isActive = body.isActive;

      let shop;
      try {
        shop = await ShopsService.updateShop(app.db, shopId, request.storeAccount.id, data);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "Shop not found",
          });
        }
        throw err;
      }

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "shop",
        entityId: shopId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: data as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(shop);
    },
  );

  app.delete(
    "/api/shops/:shopId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const deleted = await ShopsService.deleteShop(app.db, shopId, request.storeAccount.id);
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "shop",
        entityId: shopId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  // ── Shop Domains ─────────────────────────────────────────────────────────────

  app.get(
    "/api/shops/:shopId/domains",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const domains = await ShopsService.listShopDomains(
        app.db,
        shopId,
        request.storeAccount.id,
      );
      return reply.send(domains);
    },
  );

  app.post(
    "/api/shops/:shopId/domains",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const body = addShopDomainSchema.parse(request.body);

      let domain;
      try {
        domain = await ShopsService.addShopDomain(
          app.db,
          shopId,
          request.storeAccount.id,
          body.hostname,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 409) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: (err as Error).message,
          });
        }
        throw err;
      }

      return reply.status(201).send(domain);
    },
  );

  app.post(
    "/api/shops/:shopId/domains/:domainId/verify",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId, domainId } = domainIdParamSchema.parse(request.params);
      const ok = await ShopsService.verifyShopDomain(
        app.db,
        domainId,
        shopId,
        request.storeAccount.id,
      );
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Domain not found",
        });
      }
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/shops/:shopId/domains/:domainId/set-primary",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId, domainId } = domainIdParamSchema.parse(request.params);
      const ok = await ShopsService.setPrimaryShopDomain(
        app.db,
        domainId,
        shopId,
        request.storeAccount.id,
      );
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Domain not found",
        });
      }
      return reply.send({ ok: true });
    },
  );

  app.delete(
    "/api/shops/:shopId/domains/:domainId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId, domainId } = domainIdParamSchema.parse(request.params);
      const ok = await ShopsService.removeShopDomain(
        app.db,
        domainId,
        shopId,
        request.storeAccount.id,
      );
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Domain not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Product Visibility ────────────────────────────────────────────────────────

  app.get(
    "/api/shops/:shopId/products",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const opts = shopProductQuerySchema.parse(request.query);
      const result = await ShopsService.listShopProducts(
        app.db,
        shopId,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  app.post(
    "/api/shops/:shopId/products/:productId/visibility",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const { productId } = request.params as { productId: string };
      const body = setVisibilitySchema.parse(request.body);

      const row = await ShopsService.setProductVisibility(
        app.db,
        shopId,
        request.storeAccount.id,
        productId,
        body.isPublished,
      );
      return reply.send(row);
    },
  );

  app.post(
    "/api/shops/:shopId/products/bulk-visibility",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const body = bulkVisibilitySchema.parse(request.body);

      const updated = await ShopsService.bulkSetProductVisibility(
        app.db,
        shopId,
        request.storeAccount.id,
        body.productIds,
        body.isPublished,
      );
      return reply.send({ updated });
    },
  );

  // ── Shop Prices ───────────────────────────────────────────────────────────────

  app.get(
    "/api/shops/:shopId/prices",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const prices = await ShopsService.listShopPrices(
        app.db,
        shopId,
        request.storeAccount.id,
      );
      return reply.send(prices);
    },
  );

  app.put(
    "/api/shops/:shopId/prices/:variantId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId, variantId } = variantPriceParamSchema.parse(request.params);
      const body = setShopPriceSchema.parse(request.body);

      const data: {
        priceCents: number;
        currency: string;
        compareAtPriceCents?: number;
      } = {
        priceCents: body.priceCents,
        currency: body.currency,
      };
      if (body.compareAtPriceCents !== undefined) {
        data.compareAtPriceCents = body.compareAtPriceCents;
      }

      const row = await ShopsService.setShopPrice(
        app.db,
        shopId,
        request.storeAccount.id,
        variantId,
        data,
      );
      return reply.send(row);
    },
  );

  app.delete(
    "/api/shops/:shopId/prices/:variantId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId, variantId } = variantPriceParamSchema.parse(request.params);
      const ok = await ShopsService.deleteShopPrice(
        app.db,
        shopId,
        request.storeAccount.id,
        variantId,
      );
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Price override not found",
        });
      }
      return reply.status(204).send();
    },
  );

  app.post(
    "/api/shops/:shopId/prices/bulk",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const body = bulkShopPriceSchema.parse(request.body);

      const prices = body.prices.map((p) => {
        const entry: {
          variantId: string;
          priceCents: number;
          compareAtPriceCents?: number;
          currency?: string;
        } = {
          variantId: p.variantId,
          priceCents: p.priceCents,
        };
        if (p.compareAtPriceCents !== undefined) entry.compareAtPriceCents = p.compareAtPriceCents;
        if (p.currency !== undefined) entry.currency = p.currency;
        return entry;
      });

      const updated = await ShopsService.bulkSetShopPrices(
        app.db,
        shopId,
        request.storeAccount.id,
        prices,
      );
      return reply.send({ updated });
    },
  );

  // ── Shop Warehouses ───────────────────────────────────────────────────────────

  app.get(
    "/api/shops/:shopId/warehouses",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      const linked = await ShopsService.listShopWarehouses(
        app.db,
        shopId,
        request.storeAccount.id,
      );
      return reply.send(linked);
    },
  );

  app.post(
    "/api/shops/:shopId/warehouses",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      const body = addShopWarehouseSchema.parse(request.body);

      const data: { warehouseId: string; priority?: number } = {
        warehouseId: body.warehouseId,
      };
      if (body.priority !== undefined) data.priority = body.priority;

      let linked;
      try {
        linked = await ShopsService.addShopWarehouse(
          app.db,
          shopId,
          request.storeAccount.id,
          data.warehouseId,
          data.priority,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: (err as Error).message,
          });
        }
        throw err;
      }

      return reply.status(201).send(linked);
    },
  );

  app.patch(
    "/api/shops/:shopId/warehouses/:warehouseId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const { warehouseId } = shopWarehouseParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      const body = updateShopWarehouseSchema.parse(request.body);

      let updated;
      try {
        updated = await ShopsService.updateShopWarehousePriority(
          app.db,
          shopId,
          request.storeAccount.id,
          warehouseId,
          body.priority,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: (err as Error).message,
          });
        }
        throw err;
      }

      return reply.send(updated);
    },
  );

  app.delete(
    "/api/shops/:shopId/warehouses/:warehouseId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const { warehouseId } = shopWarehouseParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      const ok = await ShopsService.removeShopWarehouse(
        app.db,
        shopId,
        request.storeAccount.id,
        warehouseId,
      );
      if (!ok) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop warehouse link not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Shop Stock ────────────────────────────────────────────────────────────────

  app.get(
    "/api/shops/:shopId/stock",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { shopId } = shopIdParamSchema.parse(request.params);
      const shop = await ShopsService.getShop(app.db, shopId, request.storeAccount.id);
      if (!shop) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Shop not found",
        });
      }
      const query = shopStockQuerySchema.parse(request.query);

      const opts: { sku?: string; page: number; limit: number } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.sku !== undefined) opts.sku = query.sku;

      const result = await ShopsService.getShopStock(
        app.db,
        shopId,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );
}
