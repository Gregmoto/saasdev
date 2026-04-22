import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { storeAccountRoutes } from "./routes.js";

export default fp(async function storeAccountsModule(app: FastifyInstance) {
  await app.register(storeAccountRoutes);
});
