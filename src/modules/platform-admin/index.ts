import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { platformAdminRoutes } from "./routes.js";

export default fp(async function platformAdminModule(app: FastifyInstance) {
  await app.register(platformAdminRoutes);
});
