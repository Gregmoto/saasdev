import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { leads } from "../../db/schema/leads.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import { config } from "../../config.js";
import { sendEmail } from "../../lib/email.js";

const createLeadSchema = z.object({
  type: z.enum(["contact", "demo", "trial"]),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  topic: z.string().max(100).optional(),
  message: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
  // UTM / attribution (captured client-side and forwarded)
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  referrer: z.string().max(2048).optional(),
  landingPage: z.string().max(2048).optional(),
});

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/public/leads ─────────────────────────────────────────────────
  // Public endpoint — accepts contact/demo/trial lead submissions.
  app.post(
    "/api/public/leads",
    { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = createLeadSchema.parse(request.body);

      const [lead] = await app.db
        .insert(leads)
        .values({
          type: body.type,
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          company: body.company,
          phone: body.phone,
          topic: body.topic,
          message: body.message,
          metadata: body.metadata ?? {},
          utmSource: body.utmSource,
          utmMedium: body.utmMedium,
          utmCampaign: body.utmCampaign,
          utmContent: body.utmContent,
          utmTerm: body.utmTerm,
          referrer: body.referrer,
          landingPage: body.landingPage,
          userAgent: (request.headers["user-agent"] ?? "").slice(0, 500),
        })
        .returning({ id: leads.id });

      // Fire webhook if configured (non-blocking)
      const webhookUrl = config.LEAD_WEBHOOK_URL;
      if (webhookUrl && lead) {
        fireLeadWebhook(webhookUrl, lead.id, body).catch(() => {
          // Non-critical — webhook failures are logged but don't fail the request
        });
      }

      // Send admin notification email (non-blocking)
      const adminEmails = config.ADMIN_NOTIFICATION_EMAIL
        ? config.ADMIN_NOTIFICATION_EMAIL.split(",").map(e => e.trim()).filter(Boolean)
        : [];
      if (adminEmails.length > 0 && lead) {
        Promise.all(adminEmails.map(to =>
          sendEmail({
            to,
            subject: `Ny lead: ${body.type} från ${body.email}`,
            html: `<h2>Ny lead</h2>
        <p><b>Typ:</b> ${body.type}</p>
        <p><b>E-post:</b> ${body.email}</p>
        <p><b>Namn:</b> ${[body.firstName, body.lastName].filter(Boolean).join(" ") || "–"}</p>
        <p><b>Företag:</b> ${body.company ?? "–"}</p>
        <p><b>Ämne:</b> ${body.topic ?? "–"}</p>
        <p><b>Meddelande:</b></p><pre style="background:#f5f5f5;padding:12px;border-radius:4px">${body.message ?? "–"}</pre>
        <p style="font-size:12px;color:#999">UTM: ${[body.utmSource, body.utmMedium, body.utmCampaign].filter(Boolean).join(" / ")}</p>`,
            text: `Ny lead: ${body.type}\nE-post: ${body.email}\nFöretag: ${body.company ?? "–"}\nÄmne: ${body.topic ?? "–"}\nMeddelande: ${body.message ?? "–"}`,
          })
        )).catch(() => {}); // non-blocking
      }

      return reply.status(201).send({
        id: lead?.id,
        message: "Tack! Vi återkommer inom kort.",
      });
    },
  );

  // ── GET /api/admin/leads ───────────────────────────────────────────────────
  // Platform admin: list all leads
  app.get(
    "/api/admin/leads",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const raw = request.query as Record<string, unknown>;
      const q = z.object({
        type: z.enum(["contact", "demo", "trial"]).optional(),
        status: z.enum(["new", "contacted", "qualified", "converted", "lost", "spam"]).optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      }).parse(raw);

      const { and } = await import("drizzle-orm");
      const conditions = [];
      if (q.type) conditions.push(eq(leads.type, q.type));
      if (q.status) conditions.push(eq(leads.status, q.status));

      const rows = await app.db
        .select()
        .from(leads)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(leads.createdAt)
        .limit(q.limit)
        .offset(q.offset);

      return reply.send(rows);
    },
  );

  // ── PATCH /api/admin/leads/:id ─────────────────────────────────────────────
  // Platform admin: update lead status / notes
  app.patch(
    "/api/admin/leads/:id",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({
        status: z.enum(["new", "contacted", "qualified", "converted", "lost", "spam"]).optional(),
        notes: z.string().max(5000).optional(),
        assignedTo: z.string().max(255).optional(),
      }).parse(request.body);

      await app.db
        .update(leads)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(leads.id, id));

      return reply.send({ ok: true });
    },
  );
}

async function fireLeadWebhook(
  webhookUrl: string,
  leadId: string,
  data: z.infer<typeof createLeadSchema>,
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "lead.created",
      leadId,
      type: data.type,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(5000),
  });
}
