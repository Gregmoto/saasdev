import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { fulfillmentRoutes } from "./routes.js";

export const fulfillmentModule = fp(async function fulfillmentModule(app: FastifyInstance) {
  await app.register(fulfillmentRoutes);
});

export default fulfillmentModule;
