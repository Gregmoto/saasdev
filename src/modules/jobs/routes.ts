import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import { storeJobs, storeJobLogs, jobTypeEnum } from "../../db/schema/jobs.js";
import { JOB_QUEUE_NAME } from "./plugin.js";

const storePreHandler = [requireAuth, requireStoreAccountContext];
const adminPreHandler = [requireAuth, requirePlatformAdmin];

const jobTypeSchema = z.enum(jobTypeEnum.enumValues);
const jobStatusSchema = z.enum(["pending", "running", "completed", "failed", "cancelled", "retrying"]);

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/jobs ─────────────────────────────────────────────────────────
  app.get(
    "/api/jobs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = z.object({
        type: jobTypeSchema.optional(),
        status: jobStatusSchema.optional(),
        limit: z.coerce.number().min(1).max(200).default(50),
        offset: z.coerce.number().min(0).default(0),
      }).parse(request.query);

      const storeId = request.storeAccount.id;
      const conditions = [eq(storeJobs.storeAccountId, storeId)];
      if (q.type) conditions.push(eq(storeJobs.type, q.type));
      if (q.status) conditions.push(eq(storeJobs.status, q.status));

      const rows = await app.db
        .select()
        .from(storeJobs)
        .where(and(...conditions))
        .orderBy(desc(storeJobs.createdAt))
        .limit(q.limit)
        .offset(q.offset);

      return reply.send(rows);
    },
  );

  // ── POST /api/jobs ────────────────────────────────────────────────────────
  app.post(
    "/api/jobs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = z.object({
        type: jobTypeSchema,
        payload: z.record(z.unknown()).optional(),
      }).parse(request.body);

      const storeId = request.storeAccount.id;

      const [job] = await app.db
        .insert(storeJobs)
        .values({
          storeAccountId: storeId,
          type: body.type,
          status: "pending",
          payload: body.payload ?? {},
          triggeredBy: request.currentUser.email,
        })
        .returning();

      if (!job) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to create job" });
      }

      const bullJob = await app.jobQueue.add(body.type, {
        dbJobId: job.id,
        storeAccountId: storeId,
        type: body.type,
        payload: body.payload ?? {},
      });

      // Update bullJobId on the DB row
      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eq(storeJobs.id, job.id));

      return reply.status(201).send({ jobId: job.id });
    },
  );

  // ── GET /api/jobs/:id ─────────────────────────────────────────────────────
  app.get(
    "/api/jobs/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [job] = await app.db
        .select()
        .from(storeJobs)
        .where(and(eq(storeJobs.id, id), eq(storeJobs.storeAccountId, storeId)))
        .limit(1);

      if (!job) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Job not found" });
      }

      const logs = await app.db
        .select()
        .from(storeJobLogs)
        .where(eq(storeJobLogs.jobId, id))
        .orderBy(storeJobLogs.createdAt);

      return reply.send({ ...job, logs });
    },
  );

  // ── POST /api/jobs/:id/retry ──────────────────────────────────────────────
  app.post(
    "/api/jobs/:id/retry",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [job] = await app.db
        .select()
        .from(storeJobs)
        .where(and(eq(storeJobs.id, id), eq(storeJobs.storeAccountId, storeId)))
        .limit(1);

      if (!job) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Job not found" });
      }

      if (job.status !== "failed" && job.status !== "cancelled") {
        return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Only failed or cancelled jobs can be retried" });
      }

      const newAttempts = job.attempts + 1;

      await app.db
        .update(storeJobs)
        .set({ status: "pending", attempts: newAttempts, lastError: null, updatedAt: new Date() })
        .where(eq(storeJobs.id, id));

      const bullJob = await app.jobQueue.add(job.type, {
        dbJobId: job.id,
        storeAccountId: storeId,
        type: job.type,
        payload: job.payload ?? {},
      });

      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eq(storeJobs.id, id));

      return reply.send({ jobId: id });
    },
  );

  // ── POST /api/jobs/:id/cancel ─────────────────────────────────────────────
  app.post(
    "/api/jobs/:id/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [job] = await app.db
        .select()
        .from(storeJobs)
        .where(and(eq(storeJobs.id, id), eq(storeJobs.storeAccountId, storeId)))
        .limit(1);

      if (!job) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Job not found" });
      }

      if (job.status !== "pending" && job.status !== "running") {
        return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Only pending or running jobs can be cancelled" });
      }

      await app.db
        .update(storeJobs)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(storeJobs.id, id));

      return reply.send({ ok: true });
    },
  );

  // ── GET /api/admin/jobs ───────────────────────────────────────────────────
  app.get(
    "/api/admin/jobs",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const q = z.object({
        storeAccountId: z.string().uuid().optional(),
        type: jobTypeSchema.optional(),
        status: jobStatusSchema.optional(),
        limit: z.coerce.number().min(1).max(500).default(100),
        offset: z.coerce.number().min(0).default(0),
      }).parse(request.query);

      const conditions = [];
      if (q.storeAccountId) conditions.push(eq(storeJobs.storeAccountId, q.storeAccountId));
      if (q.type) conditions.push(eq(storeJobs.type, q.type));
      if (q.status) conditions.push(eq(storeJobs.status, q.status));

      const rows = await app.db
        .select()
        .from(storeJobs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(storeJobs.createdAt))
        .limit(q.limit)
        .offset(q.offset);

      return reply.send(rows);
    },
  );

  // ── POST /api/admin/jobs/demo-reseed ──────────────────────────────────────
  app.post(
    "/api/admin/jobs/demo-reseed",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const [job] = await app.db
        .insert(storeJobs)
        .values({
          storeAccountId: null,
          type: "demo_reseed",
          status: "pending",
          payload: {},
          triggeredBy: request.currentUser.email,
        })
        .returning();

      if (!job) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to create job" });
      }

      const bullJob = await app.jobQueue.add("demo_reseed", {
        dbJobId: job.id,
        storeAccountId: null,
        type: "demo_reseed",
        payload: {},
      });

      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eq(storeJobs.id, job.id));

      return reply.status(201).send({ jobId: job.id });
    },
  );
}

// Re-export for convenience
export { JOB_QUEUE_NAME };
