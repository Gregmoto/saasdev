import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as PaymentsService from "./service.js";
import {
  createProviderSchema,
  updateProviderSchema,
  createPaymentIntentSchema,
  providerIdParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function paymentRoutes(app: FastifyInstance): Promise<void> {

  // ── Payment Providers ─────────────────────────────────────────────────────

  // GET /api/payment-providers — list providers (publicConfig only)
  app.get(
    "/api/payment-providers",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const providers = await PaymentsService.listProviders(app.db, request.storeAccount.id);
      return reply.send(providers);
    },
  );

  // POST /api/payment-providers — create provider
  app.post(
    "/api/payment-providers",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createProviderSchema.parse(request.body);
      const config: Record<string, unknown> = { secretKey: body.config.secretKey, webhookSecret: body.config.webhookSecret };
      if (body.config.publishableKey !== undefined) {
        config["publishableKey"] = body.config.publishableKey;
      }
      const provider = await PaymentsService.createProvider(app.db, request.storeAccount.id, {
        type: body.type,
        name: body.name,
        isTestMode: body.isTestMode,
        config,
        publicConfig: body.publicConfig,
        supportedCurrencies: body.supportedCurrencies,
        sortOrder: body.sortOrder,
      });
      return reply.status(201).send(provider);
    },
  );

  // GET /api/payment-providers/:id — get one provider (publicConfig only)
  app.get(
    "/api/payment-providers/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = providerIdParamSchema.parse(request.params);
      const provider = await PaymentsService.getProvider(app.db, id, request.storeAccount.id);
      if (!provider) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Payment provider not found",
        });
      }
      return reply.send(provider);
    },
  );

  // PATCH /api/payment-providers/:id — update provider
  app.patch(
    "/api/payment-providers/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = providerIdParamSchema.parse(request.params);
      const body = updateProviderSchema.parse(request.body);

      const updateData: Partial<{
        type: "stripe" | "paypal" | "swish" | "klarna" | "manual";
        name: string;
        isTestMode: boolean;
        config: Record<string, unknown>;
        publicConfig: Record<string, unknown>;
        supportedCurrencies: string[];
        sortOrder: number;
        isActive: boolean;
      }> = {};

      if (body.type !== undefined) updateData.type = body.type;
      if (body.name !== undefined) updateData.name = body.name;
      if (body.isTestMode !== undefined) updateData.isTestMode = body.isTestMode;
      if (body.publicConfig !== undefined) updateData.publicConfig = body.publicConfig;
      if (body.supportedCurrencies !== undefined) updateData.supportedCurrencies = body.supportedCurrencies;
      if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
      if (body.config !== undefined) {
        const config: Record<string, unknown> = {
          secretKey: body.config.secretKey,
          webhookSecret: body.config.webhookSecret,
        };
        if (body.config.publishableKey !== undefined) {
          config["publishableKey"] = body.config.publishableKey;
        }
        updateData.config = config;
      }

      const provider = await PaymentsService.updateProvider(
        app.db,
        id,
        request.storeAccount.id,
        updateData,
      );
      if (!provider) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Payment provider not found",
        });
      }
      return reply.send(provider);
    },
  );

  // DELETE /api/payment-providers/:id — delete provider
  app.delete(
    "/api/payment-providers/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = providerIdParamSchema.parse(request.params);
      const deleted = await PaymentsService.deleteProvider(app.db, id, request.storeAccount.id);
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Payment provider not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Payment Intents ───────────────────────────────────────────────────────

  // POST /api/payments/intent — create Stripe PaymentIntent
  app.post(
    "/api/payments/intent",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createPaymentIntentSchema.parse(request.body);
      const shopId = request.currentShopId ?? undefined;
      const opts: {
        storeAccountId: string;
        checkoutSessionId: string;
        providerId: string;
        idempotencyKey: string;
        shopId?: string;
      } = {
        storeAccountId: request.storeAccount.id,
        checkoutSessionId: body.checkoutSessionId,
        providerId: body.providerId,
        idempotencyKey: body.idempotencyKey,
      };
      if (shopId !== undefined) opts.shopId = shopId;

      const result = await PaymentsService.initiateStripePayment(app.db, opts);
      return reply.status(201).send(result);
    },
  );

  // ── Stripe Webhooks ───────────────────────────────────────────────────────
  // Registered in a scoped sub-plugin so the content-type parser is scoped only here.

  await app.register(async (scope: FastifyInstance) => {
    // Parse body as raw Buffer — MUST be registered before the route.
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => {
        done(null, body);
      },
    );

    // POST /api/webhooks/stripe/:storeAccountId — Stripe webhook (no auth)
    scope.post<{ Params: { storeAccountId: string } }>(
      "/api/webhooks/stripe/:storeAccountId",
      async (request, reply) => {
        const { storeAccountId } = request.params;
        const signature = request.headers["stripe-signature"];

        if (!signature || typeof signature !== "string") {
          return reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "Missing stripe-signature header",
          });
        }

        // Look up the store's active Stripe provider
        const provider = await PaymentsService.lookupProviderByWebhook(
          app.db,
          storeAccountId,
          "stripe",
        );
        if (!provider) {
          return reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: "No active Stripe provider found for this store",
          });
        }

        try {
          await PaymentsService.processStripeWebhook(app.db, {
            storeAccountId,
            providerId: provider.id,
            rawBody: request.body as Buffer,
            signature,
          });
        } catch (err) {
          // Stripe signature verification failure → 400
          if (err instanceof Error && err.message.includes("signature")) {
            return reply.status(400).send({
              statusCode: 400,
              error: "Bad Request",
              message: "Webhook signature verification failed",
            });
          }
          throw err;
        }

        return reply.send({ received: true });
      },
    );
  });
}
