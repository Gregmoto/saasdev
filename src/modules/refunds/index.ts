import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { refundRoutes } from "./routes.js";

export const refundsModule = fp(async function refundsModule(app: FastifyInstance) {
  await app.register(refundRoutes);
});

export default refundsModule;
