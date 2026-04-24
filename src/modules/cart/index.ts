import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { cartRoutes } from "./routes.js";

export default fp(async function cartModule(app: FastifyInstance) {
  await app.register(cartRoutes);
});
