import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { analyticsRoutes } from "./routes.js";

export default fp(async function analyticsModule(app: FastifyInstance) {
  await app.register(analyticsRoutes);
});
