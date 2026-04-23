import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async function redisPlugin(app: FastifyInstance) {
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on("error", (err: unknown) => app.log.warn({ err }, "Redis error"));

  if (config.NODE_ENV === "production") {
    // In production, fail fast if Redis is unreachable.
    await redis.connect();
    await redis.ping();
    app.log.info("Redis connected");
  } else {
    // In dev, connect in the background — degraded mode is acceptable.
    redis.connect().then(() => {
      app.log.info("Redis connected");
    }).catch((err: unknown) => {
      app.log.warn({ err }, "Redis unavailable — running degraded (non-fatal in dev)");
    });
  }

  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    await redis.quit().catch(() => undefined);
  });
});
