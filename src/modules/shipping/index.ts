import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { shippingRoutes } from "./routes.js";

export default fp(async function shippingModule(app: FastifyInstance) {
  await app.register(shippingRoutes);
});
