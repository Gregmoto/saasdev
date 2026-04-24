import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { launchRoutes } from "./routes.js";

export default fp(async function launchModule(app: FastifyInstance) {
  await app.register(launchRoutes);
});
