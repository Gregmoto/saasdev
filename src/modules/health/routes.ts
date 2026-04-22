import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const checks = await Promise.allSettled([
      app.db.execute("SELECT 1" as never),
      app.redis.ping(),
    ]);

    const db = checks[0]?.status === "fulfilled";
    const redis = checks[1]?.status === "fulfilled";
    const ok = db && redis;

    return reply.status(ok ? 200 : 503).send({
      status: ok ? "ok" : "degraded",
      checks: { db, redis },
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    return reply.send({ ready: true });
  });
}
