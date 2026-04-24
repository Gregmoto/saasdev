import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import jobQueuePlugin from "./plugin.js";
import { jobRoutes } from "./routes.js";

export default fp(async function jobsModule(app: FastifyInstance) {
  await app.register(jobQueuePlugin);
  await app.register(jobRoutes);
});
