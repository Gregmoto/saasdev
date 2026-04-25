import { buildApp } from "./app.js";
import { config } from "./config.js";
import { runStartupSeed } from "./db/startup-seed.js";

const app = buildApp();

const start = async () => {
  try {
    // Run migrations + upsert super-admin on every boot so Railway
    // deployments always have the correct credentials.
    await runStartupSeed();
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.fatal(err, "Failed to start server");
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

void start();
