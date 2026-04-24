import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { securityRoutes } from "./routes.js";

export default fp(async function securityModule(app: FastifyInstance) {
  await app.register(securityRoutes);
});
