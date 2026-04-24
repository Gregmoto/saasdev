import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { chatAdminRoutes, chatWidgetRoutes } from "./routes.js";

export const chatModule = fp(async function chatModule(app: FastifyInstance) {
  await app.register(chatAdminRoutes);
  await app.register(chatWidgetRoutes);
});

export default chatModule;
