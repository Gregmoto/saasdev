import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { marketingCmsRoutes } from "./routes.js";

export const marketingCmsModule = fp(async function marketingCmsModule(app: FastifyInstance) {
  await app.register(marketingCmsRoutes);
});

export default marketingCmsModule;
