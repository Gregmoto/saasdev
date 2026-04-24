import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Queue, Worker } from "bullmq";
import { config } from "../config.js";
import { executeFeedRun } from "../modules/suppliers/runner.js";

declare module "fastify" {
  interface FastifyInstance {
    supplierQueue: Queue;
  }
}

const QUEUE_NAME = "supplier-feed-runs";

export default fp(async function supplierQueuePlugin(app: FastifyInstance) {
  const connection = { url: config.REDIS_URL };

  const queue = new Queue(QUEUE_NAME, { connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { runId, storeAccountId, rawContent } = job.data as {
        runId: string;
        storeAccountId: string;
        rawContent?: string;
      };
      await executeFeedRun(app.db, runId, storeAccountId, rawContent);
    },
    {
      connection,
      concurrency: 3,
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on("failed", (job, err) => {
    app.log.error({ jobId: job?.id, err }, "Supplier feed run failed");
  });

  app.decorate("supplierQueue", queue);

  app.addHook("onClose", async () => {
    await worker.close();
    await queue.close();
  });
});
