import fp from "fastify-plugin";
import { Queue, Worker } from "bullmq";
import { config } from "../config.js";
import { executeValidation, executeImportJob } from "../modules/import-center/runner.js";

declare module "fastify" {
  interface FastifyInstance {
    importQueue: Queue;
  }
}

const QUEUE_NAME = "import-jobs";

export default fp(async function importQueuePlugin(app) {
  const connection = { url: config.REDIS_URL };

  const queue = new Queue(QUEUE_NAME, { connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { jobId, storeAccountId } = job.data as {
        jobId: string;
        storeAccountId: string;
      };
      try {
        if (job.name === "validate") {
          await executeValidation(app.db, jobId, storeAccountId);
        } else {
          await executeImportJob(app.db, jobId, storeAccountId);
        }
      } catch (err) {
        // Errors are written internally to logEntries; log at worker level too
        app.log.error({ jobId, err }, "Unhandled error in import worker");
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    app.log.error({ jobId: job?.id, err }, "Import job failed");
  });

  app.decorate("importQueue", queue);

  app.addHook("onClose", async () => {
    await worker.close();
    await queue.close();
  });
});
