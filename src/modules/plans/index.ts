import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { plansRoutes } from "./routes.js";

export default fp(async function plansModule(app: FastifyInstance) {
  await app.register(plansRoutes);
});
