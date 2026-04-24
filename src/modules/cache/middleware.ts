import type { FastifyInstance } from "fastify";

export function registerCacheMiddleware(app: FastifyInstance): void {
  app.addHook("onSend", async (request, reply) => {
    const method = request.method.toUpperCase();
    const url = request.url;

    if (method !== "GET") {
      // POST/PUT/PATCH/DELETE
      reply.header("Cache-Control", "no-store");
      return;
    }

    // GET requests
    if (url.startsWith("/api/products") || url.startsWith("/api/inventory")) {
      reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    } else if (url.startsWith("/api/cms/")) {
      reply.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
    } else {
      // All other GET routes with auth
      reply.header("Cache-Control", "private, no-store");
    }
  });
}
