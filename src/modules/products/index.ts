import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { productsRoutes } from "./routes.js";

export default fp(async function productsModule(app: FastifyInstance) {
  await app.register(productsRoutes);
});
