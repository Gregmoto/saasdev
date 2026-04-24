import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { storeFaqsRoutes } from "./routes.js";
import { storeFaqsAiRoutes } from "./ai-routes.js";

export const storeFaqsModule = fp(async function storeFaqsModule(app: FastifyInstance) {
  await app.register(storeFaqsRoutes);
  await app.register(storeFaqsAiRoutes);
});

export default storeFaqsModule;
