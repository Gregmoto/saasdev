import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";

export default fp(async function rateLimitPlugin(app: FastifyInstance) {
  // Use Redis for distributed rate-limiting when available; fall back to
  // in-memory store (single-instance only) if Redis is not connected yet.
  const useRedis = app.redis.status === "ready";

  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: "1 minute",
    ...(useRedis ? { redis: app.redis } : {}),
    keyGenerator(request) {
      // Prefer real IP if behind proxy; fall back to Fastify's detected IP.
      return (
        (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        request.ip
      );
    },
    errorResponseBuilder(_request, context) {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Retry after ${context.after}.`,
      };
    },
  });
});
