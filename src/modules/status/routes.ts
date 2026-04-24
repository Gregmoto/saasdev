import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  statusComponents,
  statusIncidents,
  statusIncidentUpdates,
  statusMaintenances,
  statusSubscriptions,
} from "../../db/schema/status.js";
import { requireAuth } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";

// preHandler array — must be mutable (Fastify doesn't accept readonly tuples)
const adminPreHandler = [requireAuth, requirePlatformAdmin];

// Overall system status derived from component statuses
function deriveOverallStatus(components: Array<{ status: string }>): string {
  if (components.some((c) => c.status === "major_outage")) return "major_outage";
  if (components.some((c) => c.status === "partial_outage")) return "partial_outage";
  if (components.some((c) => c.status === "degraded_performance")) return "degraded_performance";
  if (components.some((c) => c.status === "under_maintenance")) return "under_maintenance";
  return "operational";
}

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/public/status ─────────────────────────────────────────────────
  // Returns current component statuses, active incidents, and upcoming maintenance
  app.get("/api/public/status", async (_request, reply) => {
    const [components, activeIncidents, upcomingMaintenance] = await Promise.all([
      app.db
        .select()
        .from(statusComponents)
        .where(eq(statusComponents.enabled, true))
        .orderBy(statusComponents.sortOrder),

      app.db
        .select()
        .from(statusIncidents)
        .where(
          and(
            isNull(statusIncidents.resolvedAt),
          )
        )
        .orderBy(desc(statusIncidents.startedAt))
        .limit(10),

      app.db
        .select()
        .from(statusMaintenances)
        .where(
          and(
            eq(statusMaintenances.status, "scheduled"),
            gte(statusMaintenances.scheduledEnd, new Date()),
          )
        )
        .orderBy(statusMaintenances.scheduledStart)
        .limit(5),
    ]);

    // Fetch updates for active incidents
    const incidentIds = activeIncidents.map((i) => i.id);
    const updates =
      incidentIds.length > 0
        ? await app.db
            .select()
            .from(statusIncidentUpdates)
            .where(
              incidentIds.length === 1
                ? eq(statusIncidentUpdates.incidentId, incidentIds[0]!)
                : undefined,
            )
            .orderBy(desc(statusIncidentUpdates.createdAt))
        : [];

    const incidentsWithUpdates = activeIncidents.map((incident) => ({
      ...incident,
      updates: updates.filter((u) => u.incidentId === incident.id),
    }));

    return reply.send({
      status: deriveOverallStatus(components),
      components,
      incidents: incidentsWithUpdates,
      maintenances: upcomingMaintenance,
      updatedAt: new Date().toISOString(),
    });
  });

  // ── GET /api/public/status/history ────────────────────────────────────────
  // Returns resolved incidents from the past 90 days
  app.get("/api/public/status/history", async (_request, reply) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const resolvedIncidents = await app.db
      .select()
      .from(statusIncidents)
      .where(gte(statusIncidents.startedAt, ninetyDaysAgo))
      .orderBy(desc(statusIncidents.startedAt))
      .limit(50);

    return reply.send(resolvedIncidents);
  });

  // ── POST /api/public/status/subscribe ─────────────────────────────────────
  // Subscribe email to status updates
  app.post(
    "/api/public/status/subscribe",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const { email } = z.object({ email: z.string().email().max(255) }).parse(request.body);
      const token = randomBytes(32).toString("hex");

      await app.db
        .insert(statusSubscriptions)
        .values({ email, token })
        .onConflictDoNothing();

      return reply.status(201).send({ message: "Prenumeration registrerad." });
    },
  );

  // ── GET /api/public/status/unsubscribe ────────────────────────────────────
  // Unsubscribe via token (linked from email)
  app.get("/api/public/status/unsubscribe", async (request, reply) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(request.query);

    await app.db
      .update(statusSubscriptions)
      .set({ unsubscribedAt: new Date() })
      .where(eq(statusSubscriptions.token, token));

    return reply.send({ message: "Du har avregistrerats från statusuppdateringar." });
  });

  // ── Admin: Manage components ───────────────────────────────────────────────

  app.post(
    "/api/admin/status/components",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      const body = z.object({
        name: z.string().max(200),
        slug: z.string().max(100).regex(/^[a-z0-9-]+$/),
        description: z.string().max(500).optional(),
        groupName: z.string().max(100).optional(),
        status: z.enum(["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"]).default("operational"),
        sortOrder: z.number().int().default(0),
      }).parse(request.body);

      const [row] = await app.db.insert(statusComponents).values(body).returning();
      return reply.status(201).send(row);
    },
  );

  app.patch(
    "/api/admin/status/components/:id",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({
        name: z.string().max(200).optional(),
        status: z.enum(["operational", "degraded_performance", "partial_outage", "major_outage", "under_maintenance"]).optional(),
        description: z.string().max(500).optional(),
        enabled: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }).parse(request.body);

      await app.db.update(statusComponents).set({ ...body, updatedAt: new Date() }).where(eq(statusComponents.id, id));
      return reply.send({ ok: true });
    },
  );

  // ── Admin: Manage incidents ────────────────────────────────────────────────

  app.post(
    "/api/admin/status/incidents",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      const body = z.object({
        title: z.string().max(255),
        impact: z.enum(["none", "minor", "major", "critical"]).default("minor"),
        affectedComponents: z.string().default(""),
        initialMessage: z.string().max(2000),
      }).parse(request.body);

      const [incident] = await app.db
        .insert(statusIncidents)
        .values({
          title: body.title,
          impact: body.impact,
          affectedComponents: body.affectedComponents,
        })
        .returning();

      if (incident) {
        await app.db.insert(statusIncidentUpdates).values({
          incidentId: incident.id,
          status: "investigating",
          message: body.initialMessage,
        });
      }

      return reply.status(201).send(incident);
    },
  );

  app.post(
    "/api/admin/status/incidents/:id/updates",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({
        status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
        message: z.string().max(2000),
      }).parse(request.body);

      const [update] = await app.db
        .insert(statusIncidentUpdates)
        .values({ incidentId: id, ...body })
        .returning();

      // If resolved, set resolvedAt on the incident
      if (body.status === "resolved") {
        await app.db
          .update(statusIncidents)
          .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
          .where(eq(statusIncidents.id, id));
      } else {
        await app.db
          .update(statusIncidents)
          .set({ status: body.status, updatedAt: new Date() })
          .where(eq(statusIncidents.id, id));
      }

      return reply.status(201).send(update);
    },
  );

  // ── Admin: Manage maintenances ─────────────────────────────────────────────

  app.post(
    "/api/admin/status/maintenances",
    { preHandler: adminPreHandler },
    async (request, reply) => {
      const body = z.object({
        title: z.string().max(255),
        description: z.string().max(2000).optional(),
        affectedComponents: z.string().default(""),
        scheduledStart: z.string().datetime(),
        scheduledEnd: z.string().datetime(),
      }).parse(request.body);

      const [row] = await app.db
        .insert(statusMaintenances)
        .values({
          ...body,
          scheduledStart: new Date(body.scheduledStart),
          scheduledEnd: new Date(body.scheduledEnd),
        })
        .returning();

      return reply.status(201).send(row);
    },
  );
}
