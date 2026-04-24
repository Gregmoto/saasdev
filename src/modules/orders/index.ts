import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { ordersRoutes } from "./routes.js";

export default fp(async function ordersModule(app: FastifyInstance) {
  await app.register(ordersRoutes);
});
