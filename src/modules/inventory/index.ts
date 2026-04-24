import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { inventoryRoutes } from "./routes.js";

export default fp(async function inventoryModule(app: FastifyInstance) {
  await app.register(inventoryRoutes);
});
