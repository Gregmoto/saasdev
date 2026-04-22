import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { portalRoutes } from "./routes.js";

export default fp(async function portalModule(app: FastifyInstance) {
  await app.register(portalRoutes);
});
