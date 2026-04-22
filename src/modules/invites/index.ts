import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { inviteRoutes } from "./routes.js";

export default fp(async function invitesModule(app: FastifyInstance) {
  await app.register(inviteRoutes);
});
