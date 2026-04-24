import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ImportService from "./service.js";
import {
  createProfileSchema,
  updateProfileSchema,
  profileIdParamSchema,
  createJobSchema,
  updateEntitiesSchema,
  updateMappingSchema,
  jobIdParamSchema,
  jobQuerySchema,
  setModeSchema,
  resolveConflictSchema,
  bulkResolveSchema,
  conflictIdParamSchema,
  conflictsQuerySchema,
} from "./schemas.js";
import { setJobIsDryRun } from "./service.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function importCenterRoutes(app: FastifyInstance): Promise<void> {
  // ── Profile routes ─────────────────────────────────────────────────────────

  app.get(
    "/api/import/profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const list = await ImportService.listProfiles(app.db, request.storeAccount.id);
      return reply.send(list);
    },
  );

  app.post(
    "/api/import/profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createProfileSchema.parse(request.body);

      const data: ImportService.CreateProfileData = {
        name: body.name,
        platform: body.platform,
      };
      if (body.credentials !== undefined) data.credentials = body.credentials;
      if (body.defaultFieldMapping !== undefined) data.defaultFieldMapping = body.defaultFieldMapping;

      const profile = await ImportService.createProfile(app.db, request.storeAccount.id, data);
      return reply.status(201).send(profile);
    },
  );

  app.get(
    "/api/import/profiles/:profileId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { profileId } = profileIdParamSchema.parse(request.params);
      const profile = await ImportService.getProfile(app.db, profileId, request.storeAccount.id);
      if (!profile) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import profile not found",
        });
      }
      return reply.send(profile);
    },
  );

  app.patch(
    "/api/import/profiles/:profileId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { profileId } = profileIdParamSchema.parse(request.params);
      const body = updateProfileSchema.parse(request.body);

      const data: Partial<ImportService.CreateProfileData> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.platform !== undefined) data.platform = body.platform;
      if (body.credentials !== undefined) data.credentials = body.credentials;
      if (body.defaultFieldMapping !== undefined) data.defaultFieldMapping = body.defaultFieldMapping;

      try {
        const profile = await ImportService.updateProfile(
          app.db,
          profileId,
          request.storeAccount.id,
          data,
        );
        return reply.send(profile);
      } catch {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import profile not found",
        });
      }
    },
  );

  app.delete(
    "/api/import/profiles/:profileId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { profileId } = profileIdParamSchema.parse(request.params);
      const deleted = await ImportService.deleteProfile(
        app.db,
        profileId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import profile not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Job routes ─────────────────────────────────────────────────────────────

  app.get(
    "/api/import/jobs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = jobQuerySchema.parse(request.query);

      const opts: ImportService.ListJobsOpts = {
        page: query.page,
        limit: query.limit,
      };
      if (query.status !== undefined) opts.status = query.status;
      if (query.platform !== undefined) opts.platform = query.platform;

      const result = await ImportService.listJobs(app.db, request.storeAccount.id, opts);
      return reply.send(result);
    },
  );

  app.post(
    "/api/import/jobs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createJobSchema.parse(request.body);

      const data: ImportService.CreateJobData = {
        platform: body.platform,
      };
      if (body.profileId !== undefined) data.profileId = body.profileId;
      if (body.credentials !== undefined) data.credentials = body.credentials;
      if (body.isDryRun !== undefined) data.isDryRun = body.isDryRun;

      const job = await ImportService.createJob(app.db, request.storeAccount.id, data);
      return reply.status(201).send(job);
    },
  );

  app.get(
    "/api/import/jobs/:jobId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
      return reply.send(job);
    },
  );

  app.patch(
    "/api/import/jobs/:jobId/entities",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const body = updateEntitiesSchema.parse(request.body);

      try {
        const job = await ImportService.updateJobEntities(
          app.db,
          jobId,
          request.storeAccount.id,
          body.selectedEntities,
        );
        return reply.send(job);
      } catch {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
    },
  );

  app.patch(
    "/api/import/jobs/:jobId/mapping",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const body = updateMappingSchema.parse(request.body);

      try {
        const job = await ImportService.updateJobMapping(
          app.db,
          jobId,
          request.storeAccount.id,
          body.fieldMapping,
        );
        return reply.send(job);
      } catch {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
    },
  );

  // ── Wizard execution ───────────────────────────────────────────────────────

  app.post(
    "/api/import/jobs/:jobId/validate",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }

      await app.importQueue.add(
        "validate",
        { jobId, storeAccountId: request.storeAccount.id },
        { attempts: 1 },
      );

      return reply.status(202).send(job);
    },
  );

  app.post(
    "/api/import/jobs/:jobId/dry-run",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
      if (job.status !== "pending") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `Job must be in 'pending' status to start a dry-run (current: '${job.status}')`,
        });
      }

      await setJobIsDryRun(app.db, jobId, request.storeAccount.id, true);

      await app.importQueue.add(
        "import",
        { jobId, storeAccountId: request.storeAccount.id },
        { attempts: 1 },
      );

      return reply.status(202).send({ ...job, isDryRun: true });
    },
  );

  app.post(
    "/api/import/jobs/:jobId/run",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
      if (job.status !== "pending") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `Job must be in 'pending' status to run (current: '${job.status}')`,
        });
      }

      await setJobIsDryRun(app.db, jobId, request.storeAccount.id, false);

      await app.importQueue.add(
        "import",
        { jobId, storeAccountId: request.storeAccount.id },
        {
          attempts: 2,
          backoff: { type: "exponential", delay: 10_000 },
        },
      );

      return reply.status(202).send({ ...job, isDryRun: false });
    },
  );

  app.post(
    "/api/import/jobs/:jobId/cancel",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const cancelled = await ImportService.cancelJob(
        app.db,
        jobId,
        request.storeAccount.id,
      );
      if (!cancelled) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Job cannot be cancelled in its current status",
        });
      }
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      return reply.send(job);
    },
  );

  // ── Error report download ──────────────────────────────────────────────────

  app.get(
    "/api/import/jobs/:jobId/errors.csv",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      // Need raw job to read logEntries; creds are stripped by getJob so that's fine
      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }

      const errorEntries = (job.logEntries ?? []).filter((e) => e.level === "error");

      const header = "entity,externalId,message,timestamp\r\n";
      const rows = errorEntries.map((e) => {
        const entity = csvEscape(e.entity);
        const extId = csvEscape(e.externalId ?? "");
        const message = csvEscape(e.message);
        const ts = csvEscape(e.ts);
        return `${entity},${extId},${message},${ts}`;
      });
      const csv = header + rows.join("\r\n");

      void reply.header("Content-Type", "text/csv");
      void reply.header(
        "Content-Disposition",
        `attachment; filename="import-errors-${jobId}.csv"`,
      );
      return reply.send(csv);
    },
  );

  // ── Import mode ────────────────────────────────────────────────────────────

  app.patch(
    "/api/import/jobs/:jobId/mode",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const body = setModeSchema.parse(request.body);

      const job = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      if (!job) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import job not found",
        });
      }
      if (job.status !== "draft" && job.status !== "pending") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: `Job must be in 'draft' or 'pending' status to set import mode (current: '${job.status}')`,
        });
      }

      await ImportService.setJobImportMode(
        app.db,
        jobId,
        request.storeAccount.id,
        body.mode,
      );

      const updated = await ImportService.getJob(app.db, jobId, request.storeAccount.id);
      return reply.send(updated);
    },
  );

  // ── Resume ─────────────────────────────────────────────────────────────────

  app.post(
    "/api/import/jobs/:jobId/resume",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);

      const updated = await ImportService.resetJobForResume(
        app.db,
        jobId,
        request.storeAccount.id,
      );
      if (!updated) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Job must be in 'failed' status to resume",
        });
      }

      await app.importQueue.add(
        "import",
        { jobId, storeAccountId: request.storeAccount.id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 15_000 },
        },
      );

      return reply.status(202).send(updated);
    },
  );

  // ── Conflict routes ────────────────────────────────────────────────────────

  app.get(
    "/api/import/jobs/:jobId/conflicts",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const query = conflictsQuerySchema.parse(request.query);

      const opts: ImportService.ListConflictsOpts = {
        page: query.page,
        limit: query.limit,
      };
      if (query.entity !== undefined) opts.entity = query.entity;
      if (query.resolution !== undefined) opts.resolution = query.resolution;

      const result = await ImportService.listConflicts(
        app.db,
        jobId,
        request.storeAccount.id,
        opts,
      );
      return reply.send(result);
    },
  );

  app.get(
    "/api/import/jobs/:jobId/conflicts.csv",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);

      const result = await ImportService.listConflicts(
        app.db,
        jobId,
        request.storeAccount.id,
        { page: 1, limit: 10_000 },
      );

      const header =
        "entity,externalId,internalId,field,existingValue,incomingValue,resolution\r\n";

      const rows: string[] = [];
      for (const conflict of result.data) {
        for (const cf of conflict.conflictFields) {
          rows.push(
            [
              csvEscape(conflict.entity),
              csvEscape(conflict.externalId),
              csvEscape(conflict.internalId),
              csvEscape(cf.field),
              csvEscape(String(cf.existingValue ?? "")),
              csvEscape(String(cf.incomingValue ?? "")),
              csvEscape(conflict.resolution),
            ].join(","),
          );
        }
      }

      const csv = header + rows.join("\r\n");

      void reply.header("Content-Type", "text/csv");
      void reply.header(
        "Content-Disposition",
        `attachment; filename="conflicts-${jobId}.csv"`,
      );
      return reply.send(csv);
    },
  );

  app.patch(
    "/api/import/jobs/:jobId/conflicts/:conflictId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { conflictId } = conflictIdParamSchema.parse(request.params);
      const body = resolveConflictSchema.parse(request.body);

      const conflict = await ImportService.resolveConflict(
        app.db,
        conflictId,
        request.storeAccount.id,
        body.resolution,
      );
      if (!conflict) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Import conflict not found",
        });
      }
      return reply.send(conflict);
    },
  );

  app.post(
    "/api/import/jobs/:jobId/conflicts/bulk-resolve",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { jobId } = jobIdParamSchema.parse(request.params);
      const body = bulkResolveSchema.parse(request.body);

      const resolved = await ImportService.bulkResolveConflicts(
        app.db,
        jobId,
        request.storeAccount.id,
        body.entity,
        body.resolution,
      );
      return reply.send({ resolved });
    },
  );
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
