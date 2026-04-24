import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { registerCacheMiddleware } from "./middleware.js";
import { cacheRoutes } from "./routes.js";

export default fp(async function cacheModule(app: FastifyInstance) {
  registerCacheMiddleware(app);
  await app.register(cacheRoutes);
});
