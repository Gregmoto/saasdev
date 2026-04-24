import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { importCenterRoutes } from "./routes.js";

export default fp(async function importCenterModule(app: FastifyInstance) {
  await app.register(importCenterRoutes);
});
