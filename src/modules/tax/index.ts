import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { taxRoutes } from "./routes.js";

export const taxModule = fp(async function taxModule(app: FastifyInstance) {
  await app.register(taxRoutes);
});

export default taxModule;
