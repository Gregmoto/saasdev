import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { rmaRoutes } from "./routes.js";

export const rmaModule = fp(async function rmaModule(app: FastifyInstance) {
  await app.register(rmaRoutes);
});

export default rmaModule;
