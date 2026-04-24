import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ReviewsService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  reviewIdParamSchema,
  replyParamSchema,
  productIdParamSchema,
  createReviewSchema,
  updateReviewSchema,
  moderateReviewSchema,
  voteReviewSchema,
  createReplySchema,
  updateReplySchema,
  reviewQuerySchema,
  invitationConfigSchema,
  listInvitationsQuerySchema,
} from "./schemas.js";

const adminPreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function reviewsRoutes(app: FastifyInstance): Promise<void> {

  // ── Admin routes ──────────────────────────────────────────────────────────

  // GET /api/reviews — list all reviews (all filters)
  app.get(
    "/api/reviews",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const query = reviewQuerySchema.parse(request.query);
      const result = await ReviewsService.listReviews(
        app.db,
        request.storeAccount.id,
        query,
      );
      return reply.send(result);
    },
  );

  // GET /api/reviews/:id — get single review with media/replies/votes
  app.get(
    "/api/reviews/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const review = await ReviewsService.getReview(app.db, id, request.storeAccount.id);
      if (!review) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Review not found" });
      }
      return reply.send(review);
    },
  );

  // PATCH /api/reviews/:id — update content (title, body, status, rejectedReason)
  app.patch(
    "/api/reviews/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const data = updateReviewSchema.parse(request.body);
      const updated = await ReviewsService.updateReview(
        app.db,
        id,
        request.storeAccount.id,
        data,
      );
      if (!updated) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Review not found" });
      }

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "review",
        entityId: id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: data as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // POST /api/reviews/:id/moderate — publish/reject/flag/archive
  app.post(
    "/api/reviews/:id/moderate",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const data = moderateReviewSchema.parse(request.body);
      const updated = await ReviewsService.moderateReview(
        app.db,
        id,
        request.storeAccount.id,
        request.currentUser.id,
        data,
      );
      if (!updated) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Review not found" });
      }

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "review",
        entityId: id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { status: data.status } as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // DELETE /api/reviews/:id — hard delete
  app.delete(
    "/api/reviews/:id",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const deleted = await ReviewsService.deleteReview(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Review not found" });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "review",
        entityId: id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  // POST /api/reviews/:id/replies — create reply
  app.post(
    "/api/reviews/:id/replies",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const data = createReplySchema.parse(request.body);
      const reply_ = await ReviewsService.createReply(
        app.db,
        id,
        request.storeAccount.id,
        request.currentUser.id,
        data,
      );
      return reply.status(201).send(reply_);
    },
  );

  // PATCH /api/reviews/:id/replies/:replyId — update reply
  app.patch(
    "/api/reviews/:id/replies/:replyId",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { replyId } = replyParamSchema.parse(request.params);
      const data = updateReplySchema.parse(request.body);
      const updated = await ReviewsService.updateReply(
        app.db,
        replyId,
        request.storeAccount.id,
        data,
      );
      if (!updated) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Reply not found" });
      }
      return reply.send(updated);
    },
  );

  // DELETE /api/reviews/:id/replies/:replyId — delete reply
  app.delete(
    "/api/reviews/:id/replies/:replyId",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { replyId } = replyParamSchema.parse(request.params);
      const deleted = await ReviewsService.deleteReply(
        app.db,
        replyId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Reply not found" });
      }
      return reply.status(204).send();
    },
  );

  // GET /api/review-invitations — list invitations
  app.get(
    "/api/review-invitations",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const query = listInvitationsQuerySchema.parse(request.query);
      const result = await ReviewsService.listInvitations(
        app.db,
        request.storeAccount.id,
        query,
      );
      return reply.send(result);
    },
  );

  // POST /api/review-invitations/process — trigger processDueInvitations
  app.post(
    "/api/review-invitations/process",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const count = await ReviewsService.processDueInvitations(
        app.db,
        request.storeAccount.id,
      );
      return reply.send({ processed: count });
    },
  );

  // GET /api/review-invitation-config — get config
  app.get(
    "/api/review-invitation-config",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const cfg = await ReviewsService.getInvitationConfig(
        app.db,
        request.storeAccount.id,
        request.currentShopId ?? undefined,
      );
      return reply.send(cfg);
    },
  );

  // PUT /api/review-invitation-config — upsert config
  app.put(
    "/api/review-invitation-config",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const data = invitationConfigSchema.parse(request.body);
      const cfg = await ReviewsService.upsertInvitationConfig(
        app.db,
        request.storeAccount.id,
        request.currentShopId ?? null,
        data,
      );
      return reply.send(cfg);
    },
  );

  // ── Public / storefront routes (no auth) ──────────────────────────────────

  // GET /api/public/products/:productId/reviews — published reviews + schema.org
  app.get(
    "/api/public/products/:productId/reviews",
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const query = reviewQuerySchema.parse({
        ...(request.query as Record<string, unknown>),
        status: "published",
      });

      // Resolve storeAccountId from host
      const { resolveStoreAccountIdFromRequest } = await import(
        "../../hooks/require-store-account.js"
      );
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);
      if (!storeAccountId) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Store not found" });
      }

      const [result, aggregate] = await Promise.all([
        ReviewsService.listReviews(app.db, storeAccountId, {
          ...query,
          status: "published",
          productId,
        }),
        ReviewsService.buildSchemaOrgAggregate(app.db, storeAccountId, productId),
      ]);

      const schemaOrgReviews = result.items.map((r) =>
        ReviewsService.buildSchemaOrgReview(r),
      );

      return reply.send({
        ...result,
        schemaOrg: {
          "@context": "https://schema.org",
          ...aggregate,
          review: schemaOrgReviews,
        },
      });
    },
  );

  // POST /api/public/reviews — submit a review
  app.post(
    "/api/public/reviews",
    async (request, reply) => {
      const data = createReviewSchema.parse(request.body);

      const { resolveStoreAccountIdFromRequest } = await import(
        "../../hooks/require-store-account.js"
      );
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);
      if (!storeAccountId) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Store not found" });
      }

      // Optional customerId from session/cookie (if storefront has auth)
      const sessionData = request.session as unknown as Record<string, unknown>;
      const customerId: string | null =
        typeof sessionData["customerId"] === "string"
          ? sessionData["customerId"]
          : null;

      const review = await ReviewsService.createReview(
        app.db,
        storeAccountId,
        customerId,
        request.ip,
        data,
      );

      return reply.status(201).send(review);
    },
  );

  // POST /api/public/reviews/:id/vote — helpful/not helpful
  app.post(
    "/api/public/reviews/:id/vote",
    async (request, reply) => {
      const { id } = reviewIdParamSchema.parse(request.params);
      const { voteType } = voteReviewSchema.parse(request.body);

      const { resolveStoreAccountIdFromRequest } = await import(
        "../../hooks/require-store-account.js"
      );
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);
      if (!storeAccountId) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Store not found" });
      }

      const sessionData2 = request.session as unknown as Record<string, unknown>;
      const customerId: string | null =
        typeof sessionData2["customerId"] === "string"
          ? sessionData2["customerId"]
          : null;

      const counts = await ReviewsService.voteReview(
        app.db,
        id,
        storeAccountId,
        customerId,
        request.ip,
        voteType,
      );

      return reply.send(counts);
    },
  );

  // GET /api/public/reviews/schema-org/:productId — AggregateRating JSON-LD
  app.get(
    "/api/public/reviews/schema-org/:productId",
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);

      const { resolveStoreAccountIdFromRequest } = await import(
        "../../hooks/require-store-account.js"
      );
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);
      if (!storeAccountId) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Store not found" });
      }

      const aggregate = await ReviewsService.buildSchemaOrgAggregate(
        app.db,
        storeAccountId,
        productId,
      );

      return reply.send({
        "@context": "https://schema.org",
        ...aggregate,
      });
    },
  );
}
