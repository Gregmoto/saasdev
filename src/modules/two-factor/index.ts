import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { twoFactorRoutes } from "./routes.js";

export default fp(async function twoFactorModule(app: FastifyInstance) {
  await app.register(twoFactorRoutes);
});
