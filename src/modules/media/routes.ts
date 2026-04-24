import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { storeMedia } from "../../db/schema/media.js";

const storePreHandler = [requireAuth, requireStoreAccountContext];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/media ────────────────────────────────────────────────────────
  app.get(
    "/api/media",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = z.object({
        folder: z.string().optional(),
        shopId: z.string().uuid().optional(),
        status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
        limit: z.coerce.number().min(1).max(200).default(50),
        offset: z.coerce.number().min(0).default(0),
      }).parse(request.query);

      const storeId = request.storeAccount.id;
      const conditions = [eq(storeMedia.storeAccountId, storeId)];
      if (q.folder !== undefined) conditions.push(eq(storeMedia.folder, q.folder));
      if (q.shopId) conditions.push(eq(storeMedia.shopId, q.shopId));
      if (q.status) conditions.push(eq(storeMedia.status, q.status));

      const rows = await app.db
        .select()
        .from(storeMedia)
        .where(and(...conditions))
        .orderBy(desc(storeMedia.createdAt))
        .limit(q.limit)
        .offset(q.offset);

      return reply.send(rows);
    },
  );

  // ── POST /api/media/upload ────────────────────────────────────────────────
  app.post(
    "/api/media/upload",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      // @fastify/multipart must be registered
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "No file uploaded" });
      }

      // Validate mime type
      if (!data.mimetype.startsWith("image/")) {
        // Consume stream to avoid leaks
        data.file.resume();
        return reply.status(400).send({ statusCode: 400, error: "Bad Request", message: "Only image/* mimetypes are allowed" });
      }

      // Read file buffer to check size
      const chunks: Buffer[] = [];
      let totalSize = 0;
      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          return reply.status(413).send({ statusCode: 413, error: "Payload Too Large", message: "File exceeds maximum size of 20MB" });
        }
        chunks.push(chunk as Buffer);
      }

      const originalFilename = data.filename;

      // Insert record — actual S3 upload handled by worker
      const [media] = await app.db
        .insert(storeMedia)
        .values({
          storeAccountId: storeId,
          originalFilename,
          mimeType: data.mimetype,
          sizeBytes: totalSize,
          storagePath: `${storeId}/pending/${originalFilename}`,
          publicUrl: null,
          status: "pending",
          uploadedBy: request.currentUser.email,
        })
        .returning();

      if (!media) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to save media record" });
      }

      // Update storagePath to include the media id
      const storagePath = `${storeId}/${media.id}/${originalFilename}`;
      const [updated] = await app.db
        .update(storeMedia)
        .set({ storagePath, updatedAt: new Date() })
        .where(eq(storeMedia.id, media.id))
        .returning();

      return reply.status(201).send(updated);
    },
  );

  // ── PATCH /api/media/:id ──────────────────────────────────────────────────
  app.patch(
    "/api/media/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({
        altText: z.string().optional(),
        title: z.string().max(255).optional().nullable(),
        caption: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        folder: z.string().max(255).optional(),
      }).parse(request.body);

      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select({ id: storeMedia.id })
        .from(storeMedia)
        .where(and(eq(storeMedia.id, id), eq(storeMedia.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Media not found" });
      }

      const [updated] = await app.db
        .update(storeMedia)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(storeMedia.id, id))
        .returning();

      return reply.send(updated);
    },
  );

  // ── DELETE /api/media/:id ─────────────────────────────────────────────────
  app.delete(
    "/api/media/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select({ id: storeMedia.id })
        .from(storeMedia)
        .where(and(eq(storeMedia.id, id), eq(storeMedia.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Media not found" });
      }

      // Soft-delete: set status to failed with processingError='deleted'
      await app.db
        .update(storeMedia)
        .set({ status: "failed", processingError: "deleted", updatedAt: new Date() })
        .where(eq(storeMedia.id, id));

      return reply.status(204).send();
    },
  );

  // ── POST /api/media/:id/process ───────────────────────────────────────────
  app.post(
    "/api/media/:id/process",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select({ id: storeMedia.id })
        .from(storeMedia)
        .where(and(eq(storeMedia.id, id), eq(storeMedia.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Media not found" });
      }

      // Enqueue media_process job
      const { storeJobs } = await import("../../db/schema/jobs.js");
      const [job] = await app.db
        .insert(storeJobs)
        .values({
          storeAccountId: storeId,
          type: "media_process",
          status: "pending",
          payload: { mediaId: id },
          triggeredBy: request.currentUser.email,
        })
        .returning();

      if (!job) {
        return reply.status(500).send({ statusCode: 500, error: "Internal Server Error", message: "Failed to create job" });
      }

      const bullJob = await app.jobQueue.add("media_process", {
        dbJobId: job.id,
        storeAccountId: storeId,
        type: "media_process",
        payload: { mediaId: id },
      });

      const { eq: eqFn } = await import("drizzle-orm");
      await app.db
        .update(storeJobs)
        .set({ bullJobId: bullJob.id?.toString() ?? null, updatedAt: new Date() })
        .where(eqFn(storeJobs.id, job.id));

      return reply.status(201).send({ jobId: job.id });
    },
  );
}
