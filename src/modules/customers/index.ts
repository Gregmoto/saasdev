import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { customersRoutes } from "./routes.js";

export default fp(async function customersModule(app: FastifyInstance) {
  await app.register(customersRoutes);
});
