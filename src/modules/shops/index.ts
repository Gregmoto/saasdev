import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { shopsRoutes } from "./routes.js";

export default fp(async function shopsModule(app: FastifyInstance) {
  await app.register(shopsRoutes);
});
