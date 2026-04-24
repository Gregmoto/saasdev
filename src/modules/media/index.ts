import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { mediaRoutes } from "./routes.js";

export default fp(async function mediaModule(app: FastifyInstance) {
  await app.register(mediaRoutes);
});
