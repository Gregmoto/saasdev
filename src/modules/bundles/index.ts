import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { bundleRoutes } from "./routes.js";

export default fp(async function bundlesModule(app: FastifyInstance) {
  app.register(bundleRoutes);
});
