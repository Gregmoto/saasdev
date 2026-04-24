import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import { storeJobs } from "../../db/schema/jobs.js";
import { eq } from "drizzle-orm";

const storePreHandler = [requireAuth, requireStoreAccountContext];
const adminPreHandler = [requireAuth, requirePlatformAdmin];

export async function cacheRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/store/cache/purge ───────────────────────────────────────────
  app.post(
    "/api/store/cache/purge",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      const [job] = await app.db
        .insert(storeJobs)
        .values({
          storeAccountId: storeId,
          type: "cache_purge",
          status: "pending",
          payload: {},
          triggeredBy: request.currentUser.email,
        })
        .returning();

      if (!job) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to create job" });
      }

      const bullJob = await app.jobQueue.add("cache_purge", {
        dbJobId: job.id,
        storeAccountId: storeId,
        type: "cache_purge",
        payload: {},
      });

      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eq(storeJobs.id, job.id));

      return reply.status(201).send({ jobId: job.id });
    },
  );

  // ── POST /api/admin/cache/purge ───────────────────────────────────────────
  app.post(
    "/api/admin/cache/purge",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = z.object({
        storeAccountId: z.string().uuid().optional(),
      }).parse(request.body);

      const [job] = await app.db
        .insert(storeJobs)
        .values({
          storeAccountId: body.storeAccountId ?? null,
          type: "cache_purge",
          status: "pending",
          payload: { platformWide: !body.storeAccountId, storeAccountId: body.storeAccountId },
          triggeredBy: request.currentUser.email,
        })
        .returning();

      if (!job) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to create job" });
      }

      const bullJob = await app.jobQueue.add("cache_purge", {
        dbJobId: job.id,
        storeAccountId: body.storeAccountId ?? null,
        type: "cache_purge",
        payload: { platformWide: !body.storeAccountId, storeAccountId: body.storeAccountId },
      });

      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eq(storeJobs.id, job.id));

      return reply.status(201).send({ jobId: job.id });
    },
  );
}
