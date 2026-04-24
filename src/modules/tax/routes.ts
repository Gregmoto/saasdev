import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as TaxService from "./service.js";
import {
  taxRateSchema,
  taxConfigSchema,
  calculateTaxSchema,
  taxRateIdParamSchema,
  productIdParamSchema,
  orderIdParamSchema,
} from "./schemas.js";
import { z } from "zod";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function taxRoutes(app: FastifyInstance): Promise<void> {

  // ── Tax rates ───────────────────────────────────────────────────────────────

  // GET /api/tax/rates?countryCode= — list rates
  app.get(
    "/api/tax/rates",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = z.object({ countryCode: z.string().length(2).optional() }).parse(request.query);
      const rates = await TaxService.listTaxRates(app.db, query.countryCode);
      return reply.send(rates);
    },
  );

  // POST /api/tax/rates — upsert a rate
  app.post(
    "/api/tax/rates",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = taxRateSchema.parse(request.body);
      const upsertData: Parameters<typeof TaxService.upsertTaxRate>[1] = {
        countryCode: body.countryCode,
        category: body.category,
        ratePercent: body.ratePercent,
        name: body.name,
      };
      if (body.validFrom !== undefined) {
        upsertData.validFrom = body.validFrom;
      }
      if (body.validTo !== undefined) {
        upsertData.validTo = body.validTo;
      }
      const rate = await TaxService.upsertTaxRate(app.db, upsertData);
      return reply.status(201).send(rate);
    },
  );

  // DELETE /api/tax/rates/:id
  app.delete(
    "/api/tax/rates/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = taxRateIdParamSchema.parse(request.params);
      await TaxService.deleteTaxRate(app.db, id);
      return reply.status(204).send();
    },
  );

  // ── Store config ────────────────────────────────────────────────────────────

  // GET /api/tax/config — get store tax config
  app.get(
    "/api/tax/config",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const config = await TaxService.getStoreTaxConfig(app.db, request.storeAccount.id);
      return reply.send(config);
    },
  );

  // PUT /api/tax/config — upsert config
  app.put(
    "/api/tax/config",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = taxConfigSchema.parse(request.body);
      const config = await TaxService.upsertStoreTaxConfig(app.db, request.storeAccount.id, {
        defaultCountryCode: body.defaultCountryCode,
        pricesIncludeTax: body.pricesIncludeTax,
        defaultTaxCategory: body.defaultTaxCategory,
        b2bTaxExemptByDefault: body.b2bTaxExemptByDefault,
      });
      return reply.send(config);
    },
  );

  // ── Product tax categories ──────────────────────────────────────────────────

  // GET /api/tax/products/:productId — get product tax category
  app.get(
    "/api/tax/products/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const taxCategory = await TaxService.getProductTaxCategory(
        app.db,
        request.storeAccount.id,
        productId,
      );
      return reply.send({ productId, taxCategory });
    },
  );

  // PUT /api/tax/products/:productId — set product tax category
  app.put(
    "/api/tax/products/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const body = z
        .object({
          taxCategory: z.enum(["standard", "reduced", "super_reduced", "zero", "exempt"]),
        })
        .parse(request.body);
      const result = await TaxService.setProductTaxCategory(
        app.db,
        request.storeAccount.id,
        productId,
        body.taxCategory,
      );
      return reply.send(result);
    },
  );

  // ── Tax calculation ─────────────────────────────────────────────────────────

  // POST /api/tax/calculate — calculate tax for a set of items
  app.post(
    "/api/tax/calculate",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = calculateTaxSchema.parse(request.body);
      const items = body.items.map((item) => {
        const out: {
          amountCents: number;
          productId?: string;
          taxCategory?: string;
        } = { amountCents: item.amountCents };
        if (item.productId !== undefined) {
          out.productId = item.productId;
        }
        if (item.taxCategory !== undefined) {
          out.taxCategory = item.taxCategory;
        }
        return out;
      });

      const result = await TaxService.calculateTax(app.db, {
        countryCode: body.countryCode,
        items,
        shippingCents: body.shippingCents,
        pricesIncludeTax: body.pricesIncludeTax,
        storeAccountId: request.storeAccount.id,
      });
      return reply.send(result);
    },
  );

  // ── Tax export ──────────────────────────────────────────────────────────────

  // GET /api/tax/orders/:orderId/export — export tax data for an order
  app.get(
    "/api/tax/orders/:orderId/export",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { orderId } = orderIdParamSchema.parse(request.params);
      const exportData = await TaxService.getOrderTaxExport(
        app.db,
        orderId,
        request.storeAccount.id,
      );
      if (!exportData) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Order not found",
        });
      }
      return reply.send(exportData);
    },
  );
}
