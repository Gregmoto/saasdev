import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { leadsRoutes } from "./routes.js";

export const leadsModule = fp(async function leadsModule(app: FastifyInstance) {
  await app.register(leadsRoutes);
});

export default leadsModule;
