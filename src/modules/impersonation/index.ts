import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { impersonationRoutes } from "./routes.js";

export default fp(async function impersonationModule(app: FastifyInstance) {
  await app.register(impersonationRoutes);
});
