import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { onboardingRoutes } from "./routes.js";

export default fp(async function onboardingModule(app: FastifyInstance) {
  await app.register(onboardingRoutes);
});
