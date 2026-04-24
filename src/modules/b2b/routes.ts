import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as B2bService from "./service.js";
import {
  createB2bCompanySchema,
  updateB2bCompanySchema,
  approveCompanySchema,
  createPriceListSchema,
  updatePriceListSchema,
  upsertPriceListItemSchema,
  createPaymentTermsSchema,
  updatePaymentTermsSchema,
  createMinimumOrderSchema,
  updateMinimumOrderSchema,
  createReorderTemplateSchema,
  updateReorderTemplateSchema,
  addCreditEventSchema,
  companyQuerySchema,
  priceListQuerySchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const idParamSchema = z.object({ id: z.string().uuid() });

export async function b2bRoutes(app: FastifyInstance): Promise<void> {
  // ── Companies ────────────────────────────────────────────────────────────────

  // GET /api/b2b/companies
  app.get("/api/b2b/companies", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const query = companyQuerySchema.parse(request.query);
    const opts: { page: number; limit: number; status?: string; search?: string } = {
      page: query.page,
      limit: query.limit,
    };
    if (query.status !== undefined) opts.status = query.status;
    if (query.search !== undefined) opts.search = query.search;

    const result = await B2bService.listB2bCompanies(app.db, request.storeAccount.id, opts);
    return reply.send(result);
  });

  // POST /api/b2b/companies
  app.post("/api/b2b/companies", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = createB2bCompanySchema.parse(request.body);
    const company = await B2bService.createB2bCompany(app.db, request.storeAccount.id, body);
    return reply.status(201).send(company);
  });

  // GET /api/b2b/companies/:id
  app.get("/api/b2b/companies/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const company = await B2bService.getB2bCompany(app.db, id, request.storeAccount.id);
    if (!company) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });
    return reply.send(company);
  });

  // PATCH /api/b2b/companies/:id
  app.patch("/api/b2b/companies/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateB2bCompanySchema.parse(request.body);
    const company = await B2bService.updateB2bCompany(app.db, id, request.storeAccount.id, body);
    if (!company) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });
    return reply.send(company);
  });

  // POST /api/b2b/companies/:id/approve
  app.post("/api/b2b/companies/:id/approve", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    approveCompanySchema.parse(request.body);
    const company = await B2bService.approveB2bCompany(
      app.db,
      id,
      request.storeAccount.id,
      request.currentUser.id,
    );
    if (!company) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });
    return reply.send(company);
  });

  // POST /api/b2b/companies/:id/suspend
  app.post("/api/b2b/companies/:id/suspend", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const company = await B2bService.suspendB2bCompany(app.db, id, request.storeAccount.id);
    if (!company) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });
    return reply.send(company);
  });

  // GET /api/b2b/companies/:id/credit
  app.get("/api/b2b/companies/:id/credit", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const balance = await B2bService.getCompanyCreditBalance(app.db, id, request.storeAccount.id);
    if (!balance) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });

    const events = await B2bService.listCreditEvents(app.db, request.storeAccount.id, id);
    return reply.send({ ...balance, events });
  });

  // POST /api/b2b/companies/:id/credit
  app.post("/api/b2b/companies/:id/credit", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = addCreditEventSchema.parse(request.body);
    const event = await B2bService.addCreditEvent(app.db, request.storeAccount.id, id, body);
    return reply.status(201).send(event);
  });

  // ── Price Lists ──────────────────────────────────────────────────────────────

  // GET /api/b2b/price-lists
  app.get("/api/b2b/price-lists", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const query = priceListQuerySchema.parse(request.query);
    const opts: { page: number; limit: number; enabled?: boolean } = {
      page: query.page,
      limit: query.limit,
    };
    if (query.enabled !== undefined) opts.enabled = query.enabled;

    const result = await B2bService.listPriceLists(app.db, request.storeAccount.id, opts);
    return reply.send(result);
  });

  // POST /api/b2b/price-lists
  app.post("/api/b2b/price-lists", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = createPriceListSchema.parse(request.body);
    const pl = await B2bService.createPriceList(app.db, request.storeAccount.id, body);
    return reply.status(201).send(pl);
  });

  // PATCH /api/b2b/price-lists/:id
  app.patch("/api/b2b/price-lists/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updatePriceListSchema.parse(request.body);
    const pl = await B2bService.updatePriceList(app.db, id, request.storeAccount.id, body);
    if (!pl) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Price list not found" });
    return reply.send(pl);
  });

  // DELETE /api/b2b/price-lists/:id
  app.delete("/api/b2b/price-lists/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const pl = await B2bService.deletePriceList(app.db, id, request.storeAccount.id);
      if (!pl) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Price list not found" });
      return reply.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cannot delete price list";
      return reply.status(409).send({ statusCode: 409, error: "Conflict", message });
    }
  });

  // GET /api/b2b/price-lists/:id/items
  app.get("/api/b2b/price-lists/:id/items", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const items = await B2bService.listPriceListItems(app.db, id, request.storeAccount.id);
    return reply.send(items);
  });

  // PUT /api/b2b/price-lists/:id/items
  app.put("/api/b2b/price-lists/:id/items", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = upsertPriceListItemSchema.parse(request.body);
    const item = await B2bService.upsertPriceListItem(app.db, id, request.storeAccount.id, body);
    return reply.send(item);
  });

  // DELETE /api/b2b/price-lists/:id/items/:itemId
  app.delete(
    "/api/b2b/price-lists/:id/items/:itemId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { itemId } = z.object({ id: z.string().uuid(), itemId: z.string().uuid() }).parse(request.params);
      const deleted = await B2bService.removePriceListItem(app.db, itemId, request.storeAccount.id);
      if (!deleted) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Item not found" });
      return reply.status(204).send();
    },
  );

  // ── Payment Terms ────────────────────────────────────────────────────────────

  // GET /api/b2b/payment-terms
  app.get("/api/b2b/payment-terms", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const terms = await B2bService.listPaymentTerms(app.db, request.storeAccount.id);
    return reply.send(terms);
  });

  // POST /api/b2b/payment-terms
  app.post("/api/b2b/payment-terms", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = createPaymentTermsSchema.parse(request.body);
    const pt = await B2bService.createPaymentTerms(app.db, request.storeAccount.id, body);
    return reply.status(201).send(pt);
  });

  // PATCH /api/b2b/payment-terms/:id
  app.patch("/api/b2b/payment-terms/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updatePaymentTermsSchema.parse(request.body);
    const pt = await B2bService.updatePaymentTerms(app.db, id, request.storeAccount.id, body);
    if (!pt) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Payment terms not found" });
    return reply.send(pt);
  });

  // DELETE /api/b2b/payment-terms/:id
  app.delete("/api/b2b/payment-terms/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const deleted = await B2bService.deletePaymentTerms(app.db, id, request.storeAccount.id);
      if (!deleted) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Payment terms not found" });
      return reply.status(204).send();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cannot delete payment terms";
      return reply.status(409).send({ statusCode: 409, error: "Conflict", message });
    }
  });

  // ── Minimum Orders ───────────────────────────────────────────────────────────

  // GET /api/b2b/minimum-orders
  app.get("/api/b2b/minimum-orders", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const rules = await B2bService.listMinimumOrders(app.db, request.storeAccount.id);
    return reply.send(rules);
  });

  // POST /api/b2b/minimum-orders
  app.post("/api/b2b/minimum-orders", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = createMinimumOrderSchema.parse(request.body);
    const mo = await B2bService.createMinimumOrder(app.db, request.storeAccount.id, body);
    return reply.status(201).send(mo);
  });

  // PATCH /api/b2b/minimum-orders/:id
  app.patch("/api/b2b/minimum-orders/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateMinimumOrderSchema.parse(request.body);
    const mo = await B2bService.updateMinimumOrder(app.db, id, request.storeAccount.id, body);
    if (!mo) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Minimum order rule not found" });
    return reply.send(mo);
  });

  // DELETE /api/b2b/minimum-orders/:id
  app.delete("/api/b2b/minimum-orders/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await B2bService.deleteMinimumOrder(app.db, id, request.storeAccount.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Minimum order rule not found" });
    return reply.status(204).send();
  });

  // ── Reorder Templates ────────────────────────────────────────────────────────

  // GET /api/b2b/reorder-templates — query: companyId (required)
  app.get("/api/b2b/reorder-templates", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { companyId } = z.object({ companyId: z.string().uuid() }).parse(request.query);
    const templates = await B2bService.listReorderTemplates(app.db, request.storeAccount.id, companyId);
    return reply.send(templates);
  });

  // POST /api/b2b/reorder-templates
  app.post("/api/b2b/reorder-templates", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = z
      .object({ companyId: z.string().uuid() })
      .merge(createReorderTemplateSchema)
      .parse(request.body);
    const template = await B2bService.createReorderTemplate(
      app.db,
      request.storeAccount.id,
      body.companyId,
      { name: body.name, items: body.items },
    );
    return reply.status(201).send(template);
  });

  // PATCH /api/b2b/reorder-templates/:id
  app.patch("/api/b2b/reorder-templates/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateReorderTemplateSchema.parse(request.body);
    const template = await B2bService.updateReorderTemplate(app.db, id, request.storeAccount.id, body);
    if (!template) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Template not found" });
    return reply.send(template);
  });

  // DELETE /api/b2b/reorder-templates/:id
  app.delete("/api/b2b/reorder-templates/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const deleted = await B2bService.deleteReorderTemplate(app.db, id, request.storeAccount.id);
    if (!deleted) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Template not found" });
    return reply.status(204).send();
  });

  // POST /api/b2b/reorder-templates/:id/use
  app.post("/api/b2b/reorder-templates/:id/use", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const items = await B2bService.useReorderTemplate(app.db, id, request.storeAccount.id);
    if (!items) return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Template not found" });
    return reply.send({ items });
  });

  // ── Warehouse Availability ────────────────────────────────────────────────────

  // GET /api/b2b/warehouse-availability/:productId
  app.get(
    "/api/b2b/warehouse-availability/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
      const query = z
        .object({
          variantId: z.string().uuid().optional(),
          companyId: z.string().uuid(),
        })
        .parse(request.query);

      // Check showWarehouseAvailability flag for the company
      const company = await B2bService.getB2bCompany(app.db, query.companyId, request.storeAccount.id);
      if (!company) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Company not found" });
      }
      if (!company.showWarehouseAvailability) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Warehouse availability not enabled for this company",
        });
      }

      const availability = await B2bService.getWarehouseAvailability(
        app.db,
        request.storeAccount.id,
        productId,
        query.variantId,
      );
      return reply.send(availability);
    },
  );

  // ── Price Resolution ──────────────────────────────────────────────────────────

  // GET /api/b2b/resolve-price
  app.get("/api/b2b/resolve-price", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const query = z
      .object({
        companyId: z.string().uuid(),
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.coerce.number().int().min(1).optional(),
      })
      .parse(request.query);

    const result = await B2bService.resolveB2bPrice(
      app.db,
      request.storeAccount.id,
      query.companyId,
      query.productId,
      query.variantId,
      query.quantity,
    );

    if (!result) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "No price list configured for this company",
      });
    }

    return reply.send(result);
  });
}
