import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { integrationsRoutes } from "./routes.js";
import { fortnoxRoutes } from "./fortnox/routes.js";

export default fp(async function integrationsModule(app: FastifyInstance) {
  await app.register(integrationsRoutes);
  await app.register(fortnoxRoutes);
});
