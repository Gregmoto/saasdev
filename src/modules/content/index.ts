import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { contentRoutes } from "./routes.js";

export default fp(async function contentModule(app: FastifyInstance) {
  await app.register(contentRoutes);
});
