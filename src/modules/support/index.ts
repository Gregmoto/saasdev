import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { supportRoutes } from "./routes.js";

export default fp(async function supportModule(app: FastifyInstance) {
  await app.register(supportRoutes);
});
