import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { suppliersRoutes } from "./routes.js";

export default fp(async function suppliersModule(app: FastifyInstance) {
  await app.register(suppliersRoutes);
});
