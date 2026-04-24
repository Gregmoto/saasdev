import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Queue } from "bullmq";
import { config } from "../../config.js";
import { registerJobWorkers } from "./workers.js";

export const JOB_QUEUE_NAME = "store-jobs";

// Sentinel value used in cron-triggered demo_reseed jobs.
// The worker detects this and creates a fresh DB tracking row at runtime.
export const CRON_JOB_DB_ID = "__cron__";

declare module "fastify" {
  interface FastifyInstance {
    jobQueue: Queue;
  }
}

export default fp(async function jobQueuePlugin(app: FastifyInstance) {
  const connection = { url: config.REDIS_URL };

  const queue = new Queue(JOB_QUEUE_NAME, { connection });

  app.decorate("jobQueue", queue);

  registerJobWorkers(app);

  // ── Daily demo reseed cron ─────────────────────────────────────────────────
  // Runs at 02:00 UTC every day.
  // We pass a sentinel dbJobId so the worker creates a fresh DB tracking row
  // on each execution (the repeatable job data is fixed at registration time).
  await queue.add(
    "demo_reseed",
    { dbJobId: CRON_JOB_DB_ID, storeAccountId: null, type: "demo_reseed" },
    {
      jobId: "demo_reseed_daily",
      repeat: {
        pattern: "0 2 * * *",   // daily at 02:00 UTC
        tz: "UTC",
      },
      removeOnComplete: { count: 7 },
      removeOnFail: { count: 14 },
    },
  ).catch((err) => {
    // Non-fatal: registered again on next startup.
    app.log.warn({ err }, "Could not register demo_reseed repeatable job");
  });

  app.addHook("onClose", async () => {
    await queue.close();
  });
});
