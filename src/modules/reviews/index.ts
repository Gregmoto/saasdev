import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { reviewsRoutes } from "./routes.js";

export default fp(async function reviewsModule(app: FastifyInstance) {
  await app.register(reviewsRoutes);
});
