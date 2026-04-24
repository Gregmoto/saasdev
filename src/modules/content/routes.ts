import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ContentService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createPageSchema,
  updatePageSchema,
  createBlogPostSchema,
  updateBlogPostSchema,
  contentQuerySchema,
  pageIdParamSchema,
  postIdParamSchema,
} from "./schemas.js";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

export async function contentRoutes(app: FastifyInstance): Promise<void> {

  // ── Pages ──────────────────────────────────────────────────────────────────

  app.get(
    "/api/content/pages",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = contentQuerySchema.parse(request.query);
      const result = await ContentService.listPages(app.db, request.storeAccount.id, query);
      return reply.send(result);
    },
  );

  app.post(
    "/api/content/pages",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createPageSchema.parse(request.body);
      const page = await ContentService.createPage(app.db, request.storeAccount.id, body);

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "page",
        entityId: page.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { title: page.title, slug: page.slug },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(page);
    },
  );

  app.get(
    "/api/content/pages/:pageId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { pageId } = pageIdParamSchema.parse(request.params);
      const page = await ContentService.getPage(app.db, pageId, request.storeAccount.id);
      if (!page) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Page not found" });
      }
      return reply.send(page);
    },
  );

  app.patch(
    "/api/content/pages/:pageId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { pageId } = pageIdParamSchema.parse(request.params);
      const body = updatePageSchema.parse(request.body);
      const page = await ContentService.updatePage(app.db, pageId, request.storeAccount.id, body);

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "page",
        entityId: pageId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(page);
    },
  );

  app.delete(
    "/api/content/pages/:pageId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { pageId } = pageIdParamSchema.parse(request.params);
      const deleted = await ContentService.deletePage(app.db, pageId, request.storeAccount.id);
      if (!deleted) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Page not found" });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "page",
        entityId: pageId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  // ── Blog Posts ─────────────────────────────────────────────────────────────

  app.get(
    "/api/content/blog",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = contentQuerySchema.parse(request.query);
      const result = await ContentService.listBlogPosts(app.db, request.storeAccount.id, query);
      return reply.send(result);
    },
  );

  app.post(
    "/api/content/blog",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createBlogPostSchema.parse(request.body);
      const post = await ContentService.createBlogPost(app.db, request.storeAccount.id, {
        ...body,
        authorId: request.currentUser.id,
      });

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "blog_post",
        entityId: post.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { title: post.title, slug: post.slug },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(post);
    },
  );

  app.get(
    "/api/content/blog/:postId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { postId } = postIdParamSchema.parse(request.params);
      const post = await ContentService.getBlogPost(app.db, postId, request.storeAccount.id);
      if (!post) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Blog post not found" });
      }
      return reply.send(post);
    },
  );

  app.patch(
    "/api/content/blog/:postId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { postId } = postIdParamSchema.parse(request.params);
      const body = updateBlogPostSchema.parse(request.body);
      const post = await ContentService.updateBlogPost(app.db, postId, request.storeAccount.id, body);

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "blog_post",
        entityId: postId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(post);
    },
  );

  app.delete(
    "/api/content/blog/:postId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { postId } = postIdParamSchema.parse(request.params);
      const deleted = await ContentService.deleteBlogPost(app.db, postId, request.storeAccount.id);
      if (!deleted) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Blog post not found" });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "blog_post",
        entityId: postId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );
}
