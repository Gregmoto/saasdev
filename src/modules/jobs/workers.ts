import type { FastifyInstance } from "fastify";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { config } from "../../config.js";
import { storeJobs, storeJobLogs } from "../../db/schema/jobs.js";
import type { JobType } from "../../db/schema/jobs.js";
import { aggregateAnalytics, purgeStoreCache, generateSitemap } from "./handlers.js";
import { JOB_QUEUE_NAME, CRON_JOB_DB_ID } from "./plugin.js";
import { runDemoSeed } from "../../db/seed-demos.js";

export function registerJobWorkers(app: FastifyInstance): void {
  const connection = { url: config.REDIS_URL };

  const worker = new Worker(
    JOB_QUEUE_NAME,
    async (job) => {
      let { dbJobId, storeAccountId } = job.data as {
        dbJobId: string;
        storeAccountId: string | null;
        type: JobType;
        payload?: Record<string, unknown>;
      };
      const jobType = job.data.type as JobType;
      const db = app.db;

      // Cron-triggered jobs arrive with a sentinel dbJobId.
      // Create a fresh DB tracking row so the run is visible in the Jobs panel.
      if (dbJobId === CRON_JOB_DB_ID) {
        const newRows = await db
          .insert(storeJobs)
          .values({
            type: jobType,
            status: "pending",
            triggeredBy: "system:cron",
          })
          .returning({ id: storeJobs.id })
          .catch(() => [] as Array<{ id: string }>);
        dbJobId = newRows[0]?.id ?? CRON_JOB_DB_ID;
      }

      // Mark running
      await db
        .update(storeJobs)
        .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(storeJobs.id, dbJobId))
        .catch(() => {});

      await db.insert(storeJobLogs).values({
        jobId: dbJobId,
        level: "info",
        message: `Job started: ${jobType}`,
      }).catch(() => {});

      try {
        switch (jobType) {
          case "analytics_aggregate":
            await aggregateAnalytics(db, storeAccountId);
            break;

          case "cache_purge":
            if (storeAccountId) {
              await purgeStoreCache(db, storeAccountId);
            }
            break;

          case "sitemap_generate":
            if (storeAccountId) {
              await generateSitemap(db, storeAccountId);
            }
            break;

          case "demo_reseed":
            app.log.info("Demo reseed triggered — running seed-demos…");
            await db.insert(storeJobLogs).values({
              jobId: dbJobId,
              level: "info",
              message: "Demo reseed started",
            }).catch(() => {});
            await runDemoSeed();
            await db.insert(storeJobLogs).values({
              jobId: dbJobId,
              level: "info",
              message: "Demo reseed completed successfully",
            }).catch(() => {});
            break;

          default:
            await db.insert(storeJobLogs).values({
              jobId: dbJobId,
              level: "info",
              message: "Job type handled by dedicated worker",
            });
            break;
        }

        // Mark completed
        await db
          .update(storeJobs)
          .set({ status: "completed", completedAt: new Date(), progress: 100, updatedAt: new Date() })
          .where(eq(storeJobs.id, dbJobId))
          .catch(() => {});

        await db.insert(storeJobLogs).values({
          jobId: dbJobId,
          level: "info",
          message: `Job completed: ${jobType}`,
        }).catch(() => {});
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        await db
          .update(storeJobs)
          .set({
            status: "failed",
            lastError: message,
            updatedAt: new Date(),
          })
          .where(eq(storeJobs.id, dbJobId))
          .catch(() => {});

        await db.insert(storeJobLogs).values({
          jobId: dbJobId,
          level: "error",
          message: `Job failed: ${message}`,
        }).catch(() => {});

        throw err;
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    app.log.error({ jobId: job?.id, err }, "Store job failed");
  });

  app.addHook("onClose", async () => {
    await worker.close();
  });
}
