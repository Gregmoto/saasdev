import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, or, desc, asc } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import { storeFaqs, storeFaqVersions, storeFaqAudit } from "../../db/schema/store-faqs.js";

// ── Param / query schemas ─────────────────────────────────────────────────────

const idParam = z.object({ id: z.string().uuid() });
const versionParam = z.object({ id: z.string().uuid(), version: z.coerce.number().int().positive() });

const listQuerySchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
  category: z.string().optional(),
});

const createFaqSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().default(""),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().default(0),
  visibleToRoles: z.array(z.string()).default([]),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

const updateFaqSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.string().optional(),
  category: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional(),
  visibleToRoles: z.array(z.string()).optional(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  scheduledArchiveAt: z.string().datetime().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  editSummary: z.string().max(500).optional(),
});

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

const globalCreateSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().default(""),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().default(0),
});

const globalPatchSchema = z.object({
  isGlobal: z.boolean(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOT_FOUND = { statusCode: 404, error: "Not Found" } as const;

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const adminPreHandler = [requireAuth, requirePlatformAdmin] as const;

// ── Routes ────────────────────────────────────────────────────────────────────

export async function storeFaqsRoutes(app: FastifyInstance): Promise<void> {
  // ── Store admin: list ─────────────────────────────────────────────────────

  app.get(
    "/api/faqs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query);
      const storeId = request.storeAccount.id;

      const conditions = [
        or(
          eq(storeFaqs.storeAccountId, storeId),
          eq(storeFaqs.isGlobal, true),
        ),
      ];
      if (query.status) {
        conditions.push(eq(storeFaqs.status, query.status));
      }
      if (query.category) {
        conditions.push(eq(storeFaqs.category, query.category));
      }

      const rows = await app.db
        .select()
        .from(storeFaqs)
        .where(and(...conditions))
        .orderBy(asc(storeFaqs.sortOrder), desc(storeFaqs.createdAt));

      return reply.send(rows);
    },
  );

  // ── Store admin: get single ───────────────────────────────────────────────

  app.get(
    "/api/faqs/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const storeId = request.storeAccount.id;

      const [faq] = await app.db
        .select()
        .from(storeFaqs)
        .where(
          and(
            eq(storeFaqs.id, id),
            or(
              eq(storeFaqs.storeAccountId, storeId),
              eq(storeFaqs.isGlobal, true),
            ),
          ),
        )
        .limit(1);

      if (!faq) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      // Increment view count
      await app.db
        .update(storeFaqs)
        .set({ viewCount: faq.viewCount + 1, updatedAt: new Date() })
        .where(eq(storeFaqs.id, id));

      return reply.send({ ...faq, viewCount: faq.viewCount + 1 });
    },
  );

  // ── Store admin: create ───────────────────────────────────────────────────

  app.post(
    "/api/faqs",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createFaqSchema.parse(request.body);
      const storeId = request.storeAccount.id;

      const created = await app.db
        .insert(storeFaqs)
        .values({
          storeAccountId: storeId,
          title: body.title,
          body: body.body,
          category: body.category ?? null,
          sortOrder: body.sortOrder,
          visibleToRoles: body.visibleToRoles,
          scheduledPublishAt: body.scheduledPublishAt
            ? new Date(body.scheduledPublishAt)
            : null,
          status: body.status,
          isGlobal: false,
        })
        .returning();

      const faq = created[0]!;

      await app.db.insert(storeFaqAudit).values({
        faqId: faq.id,
        action: "created",
        actorEmail: request.currentUser.email,
        actorRole: request.memberRole ?? "unknown",
        metadata: { status: faq.status },
      });

      return reply.status(201).send(faq);
    },
  );

  // ── Store admin: update (creates version snapshot) ────────────────────────

  app.put(
    "/api/faqs/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = updateFaqSchema.parse(request.body);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select()
        .from(storeFaqs)
        .where(and(eq(storeFaqs.id, id), eq(storeFaqs.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      // Save version snapshot before applying changes
      await app.db.insert(storeFaqVersions).values({
        faqId: id,
        version: existing.currentVersion,
        title: existing.title,
        body: existing.body,
        editedBy: request.currentUser.email,
        editSummary: body.editSummary ?? null,
      });

      const nextVersion = existing.currentVersion + 1;

      const updateValues: Partial<typeof storeFaqs.$inferInsert> = {
        currentVersion: nextVersion,
        updatedAt: new Date(),
      };
      if (body.title !== undefined) updateValues.title = body.title;
      if (body.body !== undefined) updateValues.body = body.body;
      if ("category" in body) updateValues.category = body.category ?? null;
      if (body.sortOrder !== undefined) updateValues.sortOrder = body.sortOrder;
      if (body.visibleToRoles !== undefined) updateValues.visibleToRoles = body.visibleToRoles;
      if ("scheduledPublishAt" in body)
        updateValues.scheduledPublishAt = body.scheduledPublishAt
          ? new Date(body.scheduledPublishAt)
          : null;
      if ("scheduledArchiveAt" in body)
        updateValues.scheduledArchiveAt = body.scheduledArchiveAt
          ? new Date(body.scheduledArchiveAt)
          : null;
      if (body.status !== undefined) updateValues.status = body.status;

      const [updated] = await app.db
        .update(storeFaqs)
        .set(updateValues)
        .where(eq(storeFaqs.id, id))
        .returning();

      await app.db.insert(storeFaqAudit).values({
        faqId: id,
        action: "updated",
        actorEmail: request.currentUser.email,
        actorRole: request.memberRole ?? "unknown",
        metadata: { fromVersion: existing.currentVersion, toVersion: nextVersion },
      });

      return reply.send(updated);
    },
  );

  // ── Store admin: publish ──────────────────────────────────────────────────

  app.post(
    "/api/faqs/:id/publish",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select()
        .from(storeFaqs)
        .where(and(eq(storeFaqs.id, id), eq(storeFaqs.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const [updated] = await app.db
        .update(storeFaqs)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(storeFaqs.id, id))
        .returning();

      await app.db.insert(storeFaqAudit).values({
        faqId: id,
        action: "published",
        actorEmail: request.currentUser.email,
        actorRole: request.memberRole ?? "unknown",
        metadata: {},
      });

      return reply.send(updated);
    },
  );

  // ── Store admin: archive ──────────────────────────────────────────────────

  app.post(
    "/api/faqs/:id/archive",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select()
        .from(storeFaqs)
        .where(and(eq(storeFaqs.id, id), eq(storeFaqs.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const [updated] = await app.db
        .update(storeFaqs)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(storeFaqs.id, id))
        .returning();

      await app.db.insert(storeFaqAudit).values({
        faqId: id,
        action: "archived",
        actorEmail: request.currentUser.email,
        actorRole: request.memberRole ?? "unknown",
        metadata: {},
      });

      return reply.send(updated);
    },
  );

  // ── Store admin: list version history ─────────────────────────────────────

  app.get(
    "/api/faqs/:id/versions",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const storeId = request.storeAccount.id;

      const [faq] = await app.db
        .select({ id: storeFaqs.id })
        .from(storeFaqs)
        .where(
          and(
            eq(storeFaqs.id, id),
            or(eq(storeFaqs.storeAccountId, storeId), eq(storeFaqs.isGlobal, true)),
          ),
        )
        .limit(1);

      if (!faq) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const versions = await app.db
        .select()
        .from(storeFaqVersions)
        .where(eq(storeFaqVersions.faqId, id))
        .orderBy(desc(storeFaqVersions.version));

      return reply.send(versions);
    },
  );

  // ── Store admin: revert to version ───────────────────────────────────────

  app.post(
    "/api/faqs/:id/revert/:version",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id, version } = versionParam.parse(request.params);
      const storeId = request.storeAccount.id;

      const [existing] = await app.db
        .select()
        .from(storeFaqs)
        .where(and(eq(storeFaqs.id, id), eq(storeFaqs.storeAccountId, storeId)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const [versionRow] = await app.db
        .select()
        .from(storeFaqVersions)
        .where(
          and(
            eq(storeFaqVersions.faqId, id),
            eq(storeFaqVersions.version, version),
          ),
        )
        .limit(1);

      if (!versionRow) {
        return reply.status(404).send({ ...NOT_FOUND, message: "Version not found" });
      }

      // Snapshot current state before reverting
      await app.db.insert(storeFaqVersions).values({
        faqId: id,
        version: existing.currentVersion,
        title: existing.title,
        body: existing.body,
        editedBy: request.currentUser.email,
        editSummary: `Reverted to version ${version}`,
      });

      const nextVersion = existing.currentVersion + 1;

      const [updated] = await app.db
        .update(storeFaqs)
        .set({
          title: versionRow.title,
          body: versionRow.body,
          currentVersion: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(storeFaqs.id, id))
        .returning();

      await app.db.insert(storeFaqAudit).values({
        faqId: id,
        action: "reverted",
        actorEmail: request.currentUser.email,
        actorRole: request.memberRole ?? "unknown",
        metadata: { revertedToVersion: version, newVersion: nextVersion },
      });

      return reply.send(updated);
    },
  );

  // ── Store admin: feedback ─────────────────────────────────────────────────

  app.post(
    "/api/faqs/:id/feedback",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = feedbackSchema.parse(request.body);
      const storeId = request.storeAccount.id;

      const [faq] = await app.db
        .select()
        .from(storeFaqs)
        .where(
          and(
            eq(storeFaqs.id, id),
            or(eq(storeFaqs.storeAccountId, storeId), eq(storeFaqs.isGlobal, true)),
          ),
        )
        .limit(1);

      if (!faq) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const updateValues = body.helpful
        ? { helpfulCount: faq.helpfulCount + 1 }
        : { notHelpfulCount: faq.notHelpfulCount + 1 };

      await app.db
        .update(storeFaqs)
        .set({ ...updateValues, updatedAt: new Date() })
        .where(eq(storeFaqs.id, id));

      return reply.send({ ok: true });
    },
  );

  // ── Platform admin: list global FAQs ─────────────────────────────────────

  app.get(
    "/api/admin/faqs/global",
    { preHandler: [...adminPreHandler] },
    async (_request, reply) => {
      const rows = await app.db
        .select()
        .from(storeFaqs)
        .where(eq(storeFaqs.isGlobal, true))
        .orderBy(asc(storeFaqs.sortOrder), desc(storeFaqs.createdAt));

      return reply.send(rows);
    },
  );

  // ── Platform admin: create global FAQ ────────────────────────────────────

  app.post(
    "/api/admin/faqs/global",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const body = globalCreateSchema.parse(request.body);
      const homeStoreId = request.currentUser.homeStoreAccountId;

      if (!homeStoreId) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Platform admin has no home store account",
        });
      }

      const globalCreated = await app.db
        .insert(storeFaqs)
        .values({
          storeAccountId: homeStoreId,
          title: body.title,
          body: body.body,
          category: body.category ?? null,
          sortOrder: body.sortOrder,
          isGlobal: true,
          status: "draft",
        })
        .returning();

      const faq = globalCreated[0]!;

      await app.db.insert(storeFaqAudit).values({
        faqId: faq.id,
        action: "created_global",
        actorEmail: request.currentUser.email,
        actorRole: "platform_admin",
        metadata: {},
      });

      return reply.status(201).send(faq);
    },
  );

  // ── Platform admin: toggle isGlobal on any FAQ ────────────────────────────

  app.patch(
    "/api/admin/faqs/:id/global",
    { preHandler: [...adminPreHandler] },
    async (request, reply) => {
      const { id } = idParam.parse(request.params);
      const body = globalPatchSchema.parse(request.body);

      const [existing] = await app.db
        .select()
        .from(storeFaqs)
        .where(eq(storeFaqs.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ ...NOT_FOUND, message: "FAQ not found" });
      }

      const [updated] = await app.db
        .update(storeFaqs)
        .set({ isGlobal: body.isGlobal, updatedAt: new Date() })
        .where(eq(storeFaqs.id, id))
        .returning();

      await app.db.insert(storeFaqAudit).values({
        faqId: id,
        action: body.isGlobal ? "set_global" : "unset_global",
        actorEmail: request.currentUser.email,
        actorRole: "platform_admin",
        metadata: {},
      });

      return reply.send(updated);
    },
  );
}
