import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { statusRoutes } from "./routes.js";

export const statusModule = fp(async function statusModule(app: FastifyInstance) {
  await app.register(statusRoutes);
});

export default statusModule;
