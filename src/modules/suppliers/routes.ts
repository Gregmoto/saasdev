import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as SupplierService from "./service.js";
import * as ReviewService from "./review.js";
import type { SupplierFeed, FeedRunLogEntry, ReviewItemStatus } from "../../db/schema/suppliers.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierIdParamSchema,
  createFeedSchema,
  updateFeedSchema,
  feedIdParamSchema,
  runIdParamSchema,
  runQuerySchema,
  triggerManualRunSchema,
  triggerDryRunSchema,
  createSkuMappingSchema,
  updateSkuMappingSchema,
  skuMappingIdParamSchema,
  reviewQuerySchema,
  reviewItemIdParamSchema,
  resolveReviewItemSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

// Strip credentialsEncrypted from all feed responses
function sanitizeFeed(feed: SupplierFeed): Omit<SupplierFeed, "credentialsEncrypted"> {
  const { credentialsEncrypted: _, ...rest } = feed;
  return rest;
}

// CSV field quoting helper
function csvField(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\r") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function suppliersRoutes(app: FastifyInstance): Promise<void> {

  // ── Suppliers CRUD ────────────────────────────────────────────────────────────

  app.get(
    "/api/suppliers",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = request.query as { includeInactive?: string };
      const includeInactive =
        query.includeInactive === "true" || query.includeInactive === "1";
      const list = await SupplierService.listSuppliers(
        app.db,
        request.storeAccount.id,
        includeInactive,
      );
      return reply.send(list);
    },
  );

  app.post(
    "/api/suppliers",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createSupplierSchema.parse(request.body);
      const data: { name: string; slug: string; notes?: string; isActive?: boolean } = {
        name: body.name,
        slug: body.slug,
      };
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.isActive !== undefined) data.isActive = body.isActive;

      const supplier = await SupplierService.createSupplier(
        app.db,
        request.storeAccount.id,
        data,
      );
      return reply.status(201).send(supplier);
    },
  );

  app.get(
    "/api/suppliers/:supplierId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { supplierId } = supplierIdParamSchema.parse(request.params);
      const supplier = await SupplierService.getSupplier(
        app.db,
        supplierId,
        request.storeAccount.id,
      );
      if (!supplier) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Supplier not found",
        });
      }
      return reply.send(supplier);
    },
  );

  app.patch(
    "/api/suppliers/:supplierId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { supplierId } = supplierIdParamSchema.parse(request.params);
      const body = updateSupplierSchema.parse(request.body);
      const data: { name?: string; slug?: string; notes?: string; isActive?: boolean } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.notes !== undefined) data.notes = body.notes;
      if (body.isActive !== undefined) data.isActive = body.isActive;

      const supplier = await SupplierService.updateSupplier(
        app.db,
        supplierId,
        request.storeAccount.id,
        data,
      );
      return reply.send(supplier);
    },
  );

  app.delete(
    "/api/suppliers/:supplierId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { supplierId } = supplierIdParamSchema.parse(request.params);
      const deleted = await SupplierService.deleteSupplier(
        app.db,
        supplierId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Supplier not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Feeds CRUD ────────────────────────────────────────────────────────────────

  app.get(
    "/api/suppliers/:supplierId/feeds",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { supplierId } = supplierIdParamSchema.parse(request.params);
      // listFeeds already strips credentialsEncrypted in the service layer
      const feeds = await SupplierService.listFeeds(
        app.db,
        request.storeAccount.id,
        supplierId,
      );
      return reply.send(feeds);
    },
  );

  app.post(
    "/api/suppliers/:supplierId/feeds",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { supplierId } = supplierIdParamSchema.parse(request.params);
      const body = createFeedSchema.parse(request.body);

      const opts: SupplierService.CreateFeedOpts = {
        supplierId,
        targetWarehouseId: body.targetWarehouseId,
        name: body.name,
        connectorType: body.connectorType,
        format: body.format,
        mappingConfig: body.mappingConfig,
      };
      if (body.description !== undefined) opts.description = body.description;
      if (body.credentials !== undefined) opts.credentials = body.credentials;
      if (body.remoteConfig !== undefined) opts.remoteConfig = body.remoteConfig;
      if (body.apiConfig !== undefined) opts.apiConfig = body.apiConfig;
      if (body.matchRules !== undefined) opts.matchRules = body.matchRules;
      if (body.schedule !== undefined) opts.schedule = body.schedule;
      if (body.unknownSkuBehavior !== undefined) opts.unknownSkuBehavior = body.unknownSkuBehavior;
      if (body.isActive !== undefined) opts.isActive = body.isActive;

      const feed = await SupplierService.createFeed(app.db, request.storeAccount.id, opts);
      return reply.status(201).send(sanitizeFeed(feed));
    },
  );

  app.get(
    "/api/suppliers/:supplierId/feeds/:feedId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const feed = await SupplierService.getFeed(
        app.db,
        feedId,
        request.storeAccount.id,
      );
      if (!feed) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Feed not found",
        });
      }
      return reply.send(sanitizeFeed(feed));
    },
  );

  app.patch(
    "/api/suppliers/:supplierId/feeds/:feedId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const body = updateFeedSchema.parse(request.body);

      const data: Partial<SupplierService.CreateFeedOpts> = {};
      if (body.targetWarehouseId !== undefined) data.targetWarehouseId = body.targetWarehouseId;
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.connectorType !== undefined) data.connectorType = body.connectorType;
      if (body.format !== undefined) data.format = body.format;
      if (body.credentials !== undefined) data.credentials = body.credentials;
      if (body.remoteConfig !== undefined) data.remoteConfig = body.remoteConfig;
      if (body.apiConfig !== undefined) data.apiConfig = body.apiConfig;
      if (body.mappingConfig !== undefined) data.mappingConfig = body.mappingConfig;
      if (body.matchRules !== undefined) data.matchRules = body.matchRules;
      if (body.schedule !== undefined) data.schedule = body.schedule;
      if (body.unknownSkuBehavior !== undefined) data.unknownSkuBehavior = body.unknownSkuBehavior;
      if (body.isActive !== undefined) data.isActive = body.isActive;

      const feed = await SupplierService.updateFeed(
        app.db,
        feedId,
        request.storeAccount.id,
        data,
      );
      return reply.send(sanitizeFeed(feed));
    },
  );

  app.delete(
    "/api/suppliers/:supplierId/feeds/:feedId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const deleted = await SupplierService.deleteFeed(
        app.db,
        feedId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Feed not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Runs ──────────────────────────────────────────────────────────────────────

  app.get(
    "/api/suppliers/:supplierId/feeds/:feedId/runs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const query = runQuerySchema.parse(request.query);
      const result = await SupplierService.listRuns(
        app.db,
        request.storeAccount.id,
        feedId,
        { page: query.page, limit: query.limit },
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/:runId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { runId } = runIdParamSchema.parse(request.params);
      const run = await SupplierService.getRun(
        app.db,
        runId,
        request.storeAccount.id,
      );
      if (!run) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Run not found",
        });
      }
      return reply.send(run);
    },
  );

  // ── Trigger routes ────────────────────────────────────────────────────────────

  app.post(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/trigger",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);

      const run = await SupplierService.createRun(
        app.db,
        request.storeAccount.id,
        feedId,
        "manual",
      );

      await app.supplierQueue.add(
        "run-feed",
        { runId: run.id, storeAccountId: request.storeAccount.id },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      );

      return reply.status(202).send(run);
    },
  );

  app.post(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/trigger-csv",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const body = triggerManualRunSchema.parse(request.body);

      // Verify the feed is a manual_csv connector
      const feed = await SupplierService.getFeed(
        app.db,
        feedId,
        request.storeAccount.id,
      );
      if (!feed) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Feed not found",
        });
      }
      if (feed.connectorType !== "manual_csv") {
        return reply.status(422).send({
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "This endpoint is only available for feeds with connectorType 'manual_csv'",
        });
      }

      const createRunOpts: Parameters<typeof SupplierService.createRun> = [
        app.db,
        request.storeAccount.id,
        feedId,
        "manual",
      ];
      if (body.fileName !== undefined) {
        createRunOpts.push(body.fileName);
      }
      const run = await SupplierService.createRun(...createRunOpts);

      await app.supplierQueue.add(
        "run-feed",
        {
          runId: run.id,
          storeAccountId: request.storeAccount.id,
          rawContent: body.content,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      );

      return reply.status(202).send(run);
    },
  );

  // ── Dry-run preview ───────────────────────────────────────────────────────────

  app.post(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/preview",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const body = triggerDryRunSchema.parse(request.body);

      // Verify feed exists and belongs to this store
      const feed = await SupplierService.getFeed(
        app.db,
        feedId,
        request.storeAccount.id,
      );
      if (!feed) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Feed not found",
        });
      }

      const run = await SupplierService.createRun(
        app.db,
        request.storeAccount.id,
        feedId,
        "manual",
        body.fileName,
        true, // isDryRun
      );

      await app.supplierQueue.add(
        "run-feed",
        {
          runId: run.id,
          storeAccountId: request.storeAccount.id,
          rawContent: body.content,
          isDryRun: true,
        },
        { attempts: 1 },
      );

      return reply.status(202).send({ ...run, isDryRun: true });
    },
  );

  app.post(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/:runId/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { runId } = runIdParamSchema.parse(request.params);
      const cancelled = await SupplierService.cancelRun(
        app.db,
        runId,
        request.storeAccount.id,
      );
      if (!cancelled) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Run not found or not in a cancellable state",
        });
      }
      return reply.send({ cancelled: true });
    },
  );

  // ── Error report CSV download ─────────────────────────────────────────────────

  app.get(
    "/api/suppliers/:supplierId/feeds/:feedId/runs/:runId/errors.csv",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { runId } = runIdParamSchema.parse(request.params);

      const run = await SupplierService.getRun(
        app.db,
        runId,
        request.storeAccount.id,
      );
      if (!run) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Run not found",
        });
      }

      // Gather error log entries
      const errorEntries = (run.logEntries ?? []).filter(
        (e: FeedRunLogEntry) => e.level === "error",
      );

      // Also fetch review items for this run (unmatched rows flagged for review)
      const { items: reviewItems } = await ReviewService.listReviewItems(
        app.db,
        request.storeAccount.id,
        { feedId: run.feedId, page: 1, limit: 1000 },
      );
      const runReviewItems = reviewItems.filter((ri) => ri.runId === runId);

      // Build CSV with \r\n line endings
      const lines: string[] = [
        ["rowIndex", "supplierSku", "supplierEan", "supplierQty", "reason"].join(","),
      ];

      for (const entry of errorEntries) {
        const rowIdx = entry.rowIndex ?? "";
        lines.push(
          [
            csvField(rowIdx),
            csvField(""),
            csvField(""),
            csvField(""),
            csvField(entry.message),
          ].join(","),
        );
      }

      for (const ri of runReviewItems) {
        lines.push(
          [
            csvField(""),
            csvField(ri.supplierSku),
            csvField(ri.supplierEan),
            csvField(ri.supplierQty),
            csvField("Flagged for review"),
          ].join(","),
        );
      }

      const csvBody = lines.join("\r\n");

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="errors-${runId}.csv"`)
        .send(csvBody);
    },
  );

  // ── SKU Mappings (feed-scoped) ────────────────────────────────────────────────

  app.get(
    "/api/suppliers/:supplierId/feeds/:feedId/sku-mappings",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const mappings = await ReviewService.listSkuMappings(
        app.db,
        request.storeAccount.id,
        feedId,
      );
      return reply.send(mappings);
    },
  );

  app.post(
    "/api/suppliers/:supplierId/feeds/:feedId/sku-mappings",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { feedId } = feedIdParamSchema.parse(request.params);
      const body = createSkuMappingSchema.parse(request.body);

      const data: { feedId: string; supplierSku: string; internalSku: string; notes?: string } = {
        feedId,
        supplierSku: body.supplierSku,
        internalSku: body.internalSku,
      };
      if (body.notes !== undefined) data.notes = body.notes;

      const mapping = await ReviewService.createSkuMapping(
        app.db,
        request.storeAccount.id,
        data,
      );
      return reply.status(201).send(mapping);
    },
  );

  app.patch(
    "/api/suppliers/:supplierId/feeds/:feedId/sku-mappings/:mappingId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { mappingId } = skuMappingIdParamSchema.parse(request.params);
      const body = updateSkuMappingSchema.parse(request.body);

      const data: { internalSku?: string; notes?: string } = {};
      if (body.internalSku !== undefined) data.internalSku = body.internalSku;
      if (body.notes !== undefined) data.notes = body.notes;

      const mapping = await ReviewService.updateSkuMapping(
        app.db,
        mappingId,
        request.storeAccount.id,
        data,
      );
      return reply.send(mapping);
    },
  );

  app.delete(
    "/api/suppliers/:supplierId/feeds/:feedId/sku-mappings/:mappingId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { mappingId } = skuMappingIdParamSchema.parse(request.params);
      const deleted = await ReviewService.deleteSkuMapping(
        app.db,
        mappingId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "SKU mapping not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── SKU Mappings (store-level, no feed filter) ────────────────────────────────

  app.get(
    "/api/suppliers/sku-mappings",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const mappings = await ReviewService.listSkuMappings(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(mappings);
    },
  );

  // ── Review queue ──────────────────────────────────────────────────────────────

  app.get(
    "/api/suppliers/review-queue",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = reviewQuerySchema.parse(request.query);
      const opts: { feedId?: string; status?: ReviewItemStatus; page: number; limit: number } = {
        page: query.page,
        limit: query.limit,
      };
      if (query.feedId !== undefined) opts.feedId = query.feedId;
      if (query.status !== undefined) opts.status = query.status;

      const result = await ReviewService.listReviewItems(
        app.db,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/suppliers/review-queue/:itemId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { itemId } = reviewItemIdParamSchema.parse(request.params);
      const item = await ReviewService.getReviewItem(
        app.db,
        itemId,
        request.storeAccount.id,
      );
      if (!item) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Review item not found",
        });
      }
      return reply.send(item);
    },
  );

  app.post(
    "/api/suppliers/review-queue/:itemId/resolve",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { itemId } = reviewItemIdParamSchema.parse(request.params);
      const body = resolveReviewItemSchema.parse(request.body);

      const resolveData: { internalSku?: string; notes?: string } = {};
      if (body.internalSku !== undefined) resolveData.internalSku = body.internalSku;
      if (body.notes !== undefined) resolveData.notes = body.notes;

      const item = await ReviewService.resolveReviewItem(
        app.db,
        itemId,
        request.storeAccount.id,
        body.action,
        resolveData,
      );
      return reply.send(item);
    },
  );
}
