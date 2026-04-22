import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { authRoutes } from "./routes.js";

export default fp(async function authModule(app: FastifyInstance) {
  await app.register(authRoutes);
});
