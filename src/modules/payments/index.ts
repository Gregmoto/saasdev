import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { paymentRoutes } from "./routes.js";

export default fp(async function paymentsModule(app: FastifyInstance) {
  await app.register(paymentRoutes);
});
