import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { b2bRoutes } from "./routes.js";

export const b2bModule = fp(async function b2bModule(app: FastifyInstance) {
  await app.register(b2bRoutes);
});

export default b2bModule;
