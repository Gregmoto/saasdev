import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { marketplaceRoutes } from "./routes.js";

export const marketplaceModule = fp(async function marketplaceModule(app: FastifyInstance) {
  await app.register(marketplaceRoutes);
});

export default marketplaceModule;
