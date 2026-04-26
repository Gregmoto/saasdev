import { buildApp } from "./app.js";
import { config } from "./config.js";
import { runStartupSeed } from "./db/startup-seed.js";
import { runMigrations } from "./db/run-migrations.js";

const app = buildApp();

const start = async () => {
  try {
    // 1. Apply any pending DB migrations (idempotent — safe to run every boot).
    await runMigrations();

    // 2. Upsert seed accounts + clear lockouts on every boot.
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
