import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createDbClient, type Db } from "../db/client.js";
import { config } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export default fp(async function dbPlugin(app: FastifyInstance) {
  const { db, sql } = createDbClient(config.DATABASE_URL);

  app.decorate("db", db);

  app.addHook("onClose", async () => {
    await sql.end();
  });
});
