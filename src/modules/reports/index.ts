import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { reportsRoutes } from "./routes.js";

export default fp(async function reportsModule(app: FastifyInstance) {
  await app.register(reportsRoutes);
});
