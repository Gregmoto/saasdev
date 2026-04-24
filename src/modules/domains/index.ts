import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { domainsRoutes } from "./routes.js";

export default fp(async function domainsModule(app: FastifyInstance) {
  await app.register(domainsRoutes);
});
