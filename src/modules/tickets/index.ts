import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { ticketsRoutes } from "./routes.js";

export const ticketsModule = fp(async function ticketsModule(app: FastifyInstance) {
  await app.register(ticketsRoutes);
});

export default ticketsModule;
