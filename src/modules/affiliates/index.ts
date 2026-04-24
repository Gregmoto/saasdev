import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { affiliateRoutes } from "./routes.js";

export const affiliatesModule = fp(async function affiliatesModule(app: FastifyInstance) {
  await app.register(affiliateRoutes);
});

export default affiliatesModule;
