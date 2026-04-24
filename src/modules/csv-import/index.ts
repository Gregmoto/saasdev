import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { csvImportRoutes } from "./routes.js";

export default fp(async function csvImportModule(app: FastifyInstance) {
  await app.register(csvImportRoutes);
});
