import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { seoRoutes } from "./routes.js";

export default fp(async function seoModule(app: FastifyInstance) {
  await app.register(seoRoutes);
});
