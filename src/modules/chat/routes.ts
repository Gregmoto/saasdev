import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ChatService from "./service.js";
import {
  createThreadSchema,
  sendMessageSchema,
  updateThreadSchema,
  businessHoursSchema,
  widgetConfigSchema,
  offlineFormSchema,
  threadsQuerySchema,
  threadIdParamSchema,
  assignThreadSchema,
  markReadSchema,
} from "./schemas.js";
import { z } from "zod";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

// ── Widget public query schema ─────────────────────────────────────────────────
const widgetConfigQuerySchema = z.object({
  shopId: z.string().uuid().optional(),
});

export async function chatAdminRoutes(app: FastifyInstance): Promise<void> {
  // ── Threads ────────────────────────────────────────────────────────────────

  app.get(
    "/api/chat/threads",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = threadsQuerySchema.parse(request.query);
      const result = await ChatService.listThreads(
        app.db,
        request.storeAccount.id,
        query,
      );
      return reply.send(result);
    },
  );

  app.post(
    "/api/chat/threads",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createThreadSchema.parse(request.body);
      const thread = await ChatService.createThread(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(thread);
    },
  );

  app.get(
    "/api/chat/threads/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = threadIdParamSchema.parse(request.params);
      const thread = await ChatService.getThread(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!thread) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Thread not found",
        });
      }
      return reply.send(thread);
    },
  );

  app.patch(
    "/api/chat/threads/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = threadIdParamSchema.parse(request.params);
      const body = updateThreadSchema.parse(request.body);
      const thread = await ChatService.updateThread(
        app.db,
        id,
        request.storeAccount.id,
        body,
      );
      return reply.send(thread);
    },
  );

  app.post(
    "/api/chat/threads/:id/messages",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = threadIdParamSchema.parse(request.params);
      const body = sendMessageSchema.parse(request.body);
      const message = await ChatService.sendMessage(
        app.db,
        id,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(message);
    },
  );

  app.post(
    "/api/chat/threads/:id/read",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = threadIdParamSchema.parse(request.params);
      const body = markReadSchema.parse(request.body);
      await ChatService.markMessagesRead(
        app.db,
        id,
        request.storeAccount.id,
        body.beforeMessageId,
      );
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/api/chat/threads/:id/assign",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = threadIdParamSchema.parse(request.params);
      const body = assignThreadSchema.parse(request.body);
      const thread = await ChatService.assignThread(
        app.db,
        id,
        request.storeAccount.id,
        body.assignedToUserId,
      );
      return reply.send(thread);
    },
  );

  // ── Widget Config ──────────────────────────────────────────────────────────

  app.get(
    "/api/chat/config",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const config = await ChatService.getWidgetConfig(
        app.db,
        request.storeAccount.id,
        request.currentShopId ?? undefined,
      );
      return reply.send(config);
    },
  );

  app.put(
    "/api/chat/config",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = widgetConfigSchema.parse(request.body);
      const config = await ChatService.upsertWidgetConfig(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.send(config);
    },
  );

  // ── Business Hours ─────────────────────────────────────────────────────────

  app.get(
    "/api/chat/hours",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const hours = await ChatService.getBusinessHours(
        app.db,
        request.storeAccount.id,
        request.currentShopId ?? undefined,
      );
      return reply.send(hours);
    },
  );

  app.put(
    "/api/chat/hours",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = businessHoursSchema.parse(request.body);
      const shopId = body.shopId ?? request.currentShopId ?? undefined;
      const hours = await ChatService.upsertBusinessHours(
        app.db,
        request.storeAccount.id,
        shopId,
        body.hours,
      );
      return reply.send(hours);
    },
  );

  // ── Offline Submissions ────────────────────────────────────────────────────

  app.get(
    "/api/chat/offline",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const submissions = await ChatService.listOfflineSubmissions(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(submissions);
    },
  );
}

// ── Public / Widget routes ────────────────────────────────────────────────────

export async function chatWidgetRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/widget/chat/thread — start new thread
  app.post("/api/widget/chat/thread", async (request, reply) => {
    const body = createThreadSchema.parse(request.body);

    // Resolve storeAccountId from shopId or host — require shopId for widget
    const shopId = body.shopId;
    if (!shopId) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "shopId is required for widget thread creation",
      });
    }

    // Look up the store account that owns this shop
    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    const thread = await ChatService.createThread(app.db, storeAccountId, body);
    return reply.status(201).send(thread);
  });

  // POST /api/widget/chat/threads/:id/messages — customer sends message
  app.post("/api/widget/chat/threads/:id/messages", async (request, reply) => {
    const { id } = threadIdParamSchema.parse(request.params);

    // Resolve store from thread's storeAccountId (no auth — use thread isolation)
    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    const rawBody = sendMessageSchema.parse(request.body);
    // Widget messages are always from customer
    const body = { ...rawBody, authorType: "customer" as const };

    const message = await ChatService.sendMessage(
      app.db,
      id,
      storeAccountId,
      body,
    );
    return reply.status(201).send(message);
  });

  // GET /api/widget/chat/threads/:id — customer reads thread
  app.get("/api/widget/chat/threads/:id", async (request, reply) => {
    const { id } = threadIdParamSchema.parse(request.params);

    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    const thread = await ChatService.getThread(app.db, id, storeAccountId);
    if (!thread) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Thread not found",
      });
    }
    return reply.send(thread);
  });

  // GET /api/widget/chat/config?shopId= — get widget config + isCurrentlyOpen
  app.get("/api/widget/chat/config", async (request, reply) => {
    const query = widgetConfigQuerySchema.parse(request.query);

    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    const [config, hours] = await Promise.all([
      ChatService.getWidgetConfig(app.db, storeAccountId, query.shopId),
      ChatService.getBusinessHours(app.db, storeAccountId, query.shopId),
    ]);

    const open = ChatService.isCurrentlyOpen(hours);

    return reply.send({ ...config, isCurrentlyOpen: open });
  });

  // POST /api/widget/chat/offline — submit offline form
  app.post("/api/widget/chat/offline", async (request, reply) => {
    const body = offlineFormSchema.parse(request.body);

    const { resolveStoreAccountIdFromRequest } = await import(
      "../../hooks/require-store-account.js"
    );
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Store not found",
      });
    }

    const result = await ChatService.submitOfflineForm(
      app.db,
      storeAccountId,
      body,
    );
    return reply.status(201).send(result);
  });
}
