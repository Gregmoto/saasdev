import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as AffiliateService from "./service.js";
import {
  createAffiliateSchema,
  updateAffiliateSchema,
  createAffiliateLinkSchema,
  updateAffiliateLinkSchema,
  recordClickSchema,
  attributeOrderSchema,
  createPayoutSchema,
  updatePayoutSchema,
  affiliateQuerySchema,
  conversionQuerySchema,
  payoutQuerySchema,
  exportPayoutsQuerySchema,
} from "./schemas.js";
import { z } from "zod";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const idParamSchema = z.object({ id: z.string().uuid() });

export async function affiliateRoutes(app: FastifyInstance): Promise<void> {
  // ── Admin: Affiliates ────────────────────────────────────────────────────────

  // GET /api/affiliates
  app.get("/api/affiliates", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const query = affiliateQuerySchema.parse(request.query);
    const opts: { page: number; limit: number; status?: string } = {
      page: query.page,
      limit: query.limit,
    };
    if (query.status !== undefined) opts.status = query.status;

    const result = await AffiliateService.listAffiliates(
      app.db,
      request.storeAccount.id,
      opts,
    );
    return reply.send(result);
  });

  // POST /api/affiliates
  app.post("/api/affiliates", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const body = createAffiliateSchema.parse(request.body);
    const data: {
      name: string;
      email: string;
      companyName?: string;
      website?: string;
      commissionType?: "percentage" | "flat";
      commissionValue?: number;
      cookieWindowDays?: number;
      paymentMethod?: string;
      notes?: string;
    } = {
      name: body.name,
      email: body.email,
    };
    if (body.companyName !== undefined) data.companyName = body.companyName;
    if (body.website !== undefined) data.website = body.website;
    if (body.commissionType !== undefined) data.commissionType = body.commissionType;
    if (body.commissionValue !== undefined) data.commissionValue = body.commissionValue;
    if (body.cookieWindowDays !== undefined) data.cookieWindowDays = body.cookieWindowDays;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) data.notes = body.notes;

    const result = await AffiliateService.createAffiliate(
      app.db,
      request.storeAccount.id,
      data,
    );
    return reply.status(201).send(result);
  });

  // GET /api/affiliates/admin-overview — must be before /:id
  app.get(
    "/api/affiliates/admin-overview",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const overview = await AffiliateService.getAdminOverview(app.db, request.storeAccount.id);
      return reply.send(overview);
    },
  );

  // GET /api/affiliates/:id
  app.get("/api/affiliates/:id", { preHandler: [...storePreHandler] }, async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const affiliate = await AffiliateService.getAffiliate(app.db, id, request.storeAccount.id);
    if (!affiliate) {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate not found" });
    }
    return reply.send(affiliate);
  });

  // PATCH /api/affiliates/:id
  app.patch(
    "/api/affiliates/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateAffiliateSchema.parse(request.body);

      const data: {
        name?: string;
        email?: string;
        companyName?: string;
        website?: string;
        commissionType?: "percentage" | "flat";
        commissionValue?: number;
        cookieWindowDays?: number;
        paymentMethod?: string;
        notes?: string;
        status?: "pending" | "approved" | "paused" | "rejected" | "terminated";
      } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.email !== undefined) data.email = body.email;
      if (body.companyName !== undefined) data.companyName = body.companyName;
      if (body.website !== undefined) data.website = body.website;
      if (body.commissionType !== undefined) data.commissionType = body.commissionType;
      if (body.commissionValue !== undefined) data.commissionValue = body.commissionValue;
      if (body.cookieWindowDays !== undefined) data.cookieWindowDays = body.cookieWindowDays;
      if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.status !== undefined) data.status = body.status;

      const affiliate = await AffiliateService.updateAffiliate(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      if (!affiliate) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate not found" });
      }
      return reply.send(affiliate);
    },
  );

  // POST /api/affiliates/:id/approve
  app.post(
    "/api/affiliates/:id/approve",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const affiliate = await AffiliateService.approveAffiliate(
        app.db,
        id,
        request.storeAccount.id,
        request.currentUser.id,
      );
      if (!affiliate) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate not found" });
      }
      return reply.send(affiliate);
    },
  );

  // POST /api/affiliates/:id/reject
  app.post(
    "/api/affiliates/:id/reject",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const affiliate = await AffiliateService.rejectAffiliate(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!affiliate) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate not found" });
      }
      return reply.send(affiliate);
    },
  );

  // GET /api/affiliates/:id/dashboard
  app.get(
    "/api/affiliates/:id/dashboard",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const dashboard = await AffiliateService.getAffiliateDashboard(
        app.db,
        request.storeAccount.id,
        id,
      );
      if (!dashboard) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate not found" });
      }
      return reply.send(dashboard);
    },
  );

  // ── Admin: Affiliate Links ─────────────────────────────────────────────────

  // GET /api/affiliate-links — query: affiliateId
  app.get(
    "/api/affiliate-links",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = z.object({ affiliateId: z.string().uuid() }).parse(request.query);
      const links = await AffiliateService.listAffiliateLinks(
        app.db,
        query.affiliateId,
        request.storeAccount.id,
      );
      return reply.send(links);
    },
  );

  // POST /api/affiliate-links
  app.post(
    "/api/affiliate-links",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createAffiliateLinkSchema.parse(request.body);
      const data: {
        affiliateId: string;
        code: string;
        targetUrl?: string;
        label?: string;
      } = {
        affiliateId: body.affiliateId,
        code: body.code,
      };
      if (body.targetUrl !== undefined) data.targetUrl = body.targetUrl;
      if (body.label !== undefined) data.label = body.label;

      const link = await AffiliateService.createAffiliateLink(
        app.db,
        request.storeAccount.id,
        data,
      );
      return reply.status(201).send(link);
    },
  );

  // PATCH /api/affiliate-links/:id
  app.patch(
    "/api/affiliate-links/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateAffiliateLinkSchema.parse(request.body);

      const data: { targetUrl?: string; label?: string; enabled?: boolean } = {};
      if (body.targetUrl !== undefined) data.targetUrl = body.targetUrl;
      if (body.label !== undefined) data.label = body.label;
      if (body.enabled !== undefined) data.enabled = body.enabled;

      const link = await AffiliateService.updateAffiliateLink(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      if (!link) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Affiliate link not found" });
      }
      return reply.send(link);
    },
  );

  // DELETE /api/affiliate-links/:id
  app.delete(
    "/api/affiliate-links/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      await AffiliateService.deleteAffiliateLink(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // ── Admin: Conversions ────────────────────────────────────────────────────

  // GET /api/affiliate-conversions
  app.get(
    "/api/affiliate-conversions",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = conversionQuerySchema.parse(request.query);
      const opts: { page: number; limit: number; status?: string; affiliateId?: string } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.affiliateId !== undefined) opts.affiliateId = query.affiliateId;

      const result = await AffiliateService.listConversions(
        app.db,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  // POST /api/affiliate-conversions/:id/confirm
  app.post(
    "/api/affiliate-conversions/:id/confirm",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      // Verify conversion belongs to this store
      const existing = await AffiliateService.getConversion(app.db, id, request.storeAccount.id);
      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Conversion not found" });
      }
      const conversion = await AffiliateService.confirmConversion(app.db, id);
      return reply.send(conversion);
    },
  );

  // POST /api/affiliate-conversions/:id/cancel
  app.post(
    "/api/affiliate-conversions/:id/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      // Verify conversion belongs to this store
      const existing = await AffiliateService.getConversion(app.db, id, request.storeAccount.id);
      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Conversion not found" });
      }
      const conversion = await AffiliateService.cancelConversion(app.db, id);
      return reply.send(conversion);
    },
  );

  // ── Admin: Payouts ────────────────────────────────────────────────────────

  // GET /api/affiliate-payouts/export — must be before /:id
  app.get(
    "/api/affiliate-payouts/export",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = exportPayoutsQuerySchema.parse(request.query);
      const csv = await AffiliateService.exportPayouts(
        app.db,
        request.storeAccount.id,
        query.format,
      );
      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", "attachment; filename=payouts.csv")
        .send(csv);
    },
  );

  // GET /api/affiliate-payouts
  app.get(
    "/api/affiliate-payouts",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = payoutQuerySchema.parse(request.query);
      const opts: { page: number; limit: number; status?: string; affiliateId?: string } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.affiliateId !== undefined) opts.affiliateId = query.affiliateId;

      const result = await AffiliateService.listPayouts(app.db, request.storeAccount.id, opts);
      return reply.send(result);
    },
  );

  // POST /api/affiliate-payouts
  app.post(
    "/api/affiliate-payouts",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createPayoutSchema.parse(request.body);
      const data: {
        affiliateId: string;
        amountCents: number;
        paymentMethod?: string;
        notes?: string;
      } = {
        affiliateId: body.affiliateId,
        amountCents: body.amountCents,
      };
      if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
      if (body.notes !== undefined) data.notes = body.notes;

      const payout = await AffiliateService.createPayout(app.db, request.storeAccount.id, data);
      return reply.status(201).send(payout);
    },
  );

  // PATCH /api/affiliate-payouts/:id
  app.patch(
    "/api/affiliate-payouts/:id",
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

      const payout = await AffiliateService.updatePayout(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      if (!payout) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Payout not found" });
      }
      return reply.send(payout);
    },
  );

  // POST /api/affiliate-payouts/:id/mark-paid
  app.post(
    "/api/affiliate-payouts/:id/mark-paid",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = z.object({ paymentReference: z.string().min(1) }).parse(request.body);

      const payout = await AffiliateService.markPayoutPaid(
        app.db,
        id,
        request.storeAccount.id,
        body.paymentReference,
      );
      if (!payout) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Payout not found" });
      }
      return reply.send(payout);
    },
  );

  // ── Public routes ─────────────────────────────────────────────────────────

  // GET /api/public/affiliate/redirect/:code
  app.get("/api/public/affiliate/redirect/:code", async (request, reply) => {
    const { code } = z.object({ code: z.string().min(1) }).parse(request.params);

    // Resolve storeAccountId from hostname
    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);

    if (!storeAccountId) {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Store not found" });
    }

    const clickData: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      referer?: string;
      landingUrl?: string;
    } = {};

    const rawQuery = request.query as Record<string, unknown>;
    if (typeof rawQuery["sessionId"] === "string") clickData.sessionId = rawQuery["sessionId"];
    const ip = request.ip;
    if (ip) clickData.ipAddress = ip;
    const ua = request.headers["user-agent"];
    if (ua) clickData.userAgent = ua;
    const referer = request.headers["referer"];
    if (referer) clickData.referer = referer;
    const url = request.url;
    if (url) clickData.landingUrl = url;

    try {
      const result = await AffiliateService.recordClick(app.db, storeAccountId, code, clickData);
      if (result.targetUrl) {
        return reply.send({ targetUrl: result.targetUrl, cookieExpiresAt: result.cookieExpiresAt });
      }
      return reply.send({ targetUrl: "/", cookieExpiresAt: result.cookieExpiresAt });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 404) {
        return reply.redirect("/");
      }
      throw err;
    }
  });

  // POST /api/public/affiliate/attribute
  app.post("/api/public/affiliate/attribute", async (request, reply) => {
    const body = attributeOrderSchema.parse(request.body);

    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);

    if (!storeAccountId) {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Store not found" });
    }

    const conversion = await AffiliateService.attributeOrder(
      app.db,
      storeAccountId,
      body.orderId,
      body.sessionId,
      body.affiliateCode,
    );

    return reply.send({ conversion: conversion ?? null });
  });
}
