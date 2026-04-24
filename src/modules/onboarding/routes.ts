import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as OnboardingService from "./service.js";
import { signupSchema } from "./schemas.js";
import { config } from "../../config.js";
import { storeAccounts } from "../../db/schema/index.js";

// ── Setup wizard ───────────────────────────────────────────────────────────────

type WizardStep = "domain" | "theme" | "categories" | "product" | "payments" | "publish";

const WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "domain",     label: "Verifiera domän" },
  { id: "theme",      label: "Välj tema" },
  { id: "categories", label: "Skapa kategorier" },
  { id: "product",    label: "Lägg till produkt" },
  { id: "payments",   label: "Konfigurera betalning" },
  { id: "publish",    label: "Publicera butiken" },
];

interface SetupWizardSettings {
  completedSteps: WizardStep[];
  completedAt: string | null;
  startedAt: string;
}

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/public/signup ───────────────────────────────────────────────
  // Public endpoint — creates a pending store account. No auth required.
  // Rate-limited aggressively to prevent abuse.
  app.post(
    "/api/public/signup",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = signupSchema.parse(request.body);

      try {
        const result = await OnboardingService.signupStoreAccount(app.db, body);

        if (result.autoActivated) {
          const sessionId = randomUUID();
          await app.redis.setex(
            `session:${sessionId}`,
            86400 * 30,
            JSON.stringify({ userId: result.userId }),
          );
          reply.setCookie("sid", sessionId, {
            httpOnly: true,
            sameSite: "lax",
            secure: config.NODE_ENV === "production",
            path: "/",
            maxAge: 86400 * 30,
          });
          return reply.status(201).send({
            storeAccountId: result.storeAccountId,
            status: "active",
            autoActivated: true,
            redirect: "/admin/setup",
          });
        }

        return reply.status(201).send({
          storeAccountId: result.storeAccountId,
          status: result.status,
          message:
            "Your store account has been created and is pending approval. " +
            "You will receive an email notification once it is reviewed.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate") || msg.includes("unique")) {
          return reply.status(409).send({
            statusCode: 409,
            error: "Conflict",
            message: "That store slug is already taken. Please choose another.",
          });
        }
        throw err;
      }
    },
  );

  // ── GET /api/public/signup/status ─────────────────────────────────────────
  // Lets an applicant poll their approval status. Requires auth (they're logged
  // in but their store is still pending). Uses requireAuth (totpVerified check),
  // but NOT requireStoreAccountContext (account isn't active yet).
  //
  // Note: this is under /api/public/ so it's exempt from the route guard's
  // requireStoreAccountContext enforcement.
  app.get(
    "/api/public/signup/status",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      // Find the pending store for the current user via membership.
      const { storeMemberships: storeMembershipsTable, storeAccounts: storeAccountsTable } =
        await import("../../db/schema/index.js");
      const { eq: eqFn, and } = await import("drizzle-orm");

      const [row] = await app.db
        .select({
          storeAccountId: storeMembershipsTable.storeAccountId,
          status: storeAccountsTable.status,
          approvedAt: storeAccountsTable.approvedAt,
          rejectionReason: storeAccountsTable.rejectionReason,
          slug: storeAccountsTable.slug,
        })
        .from(storeMembershipsTable)
        .innerJoin(
          storeAccountsTable,
          eqFn(storeMembershipsTable.storeAccountId, storeAccountsTable.id),
        )
        .where(
          and(
            eqFn(storeMembershipsTable.userId, request.currentUser.id),
            eqFn(storeMembershipsTable.role, "store_admin"),
          ),
        )
        .limit(1);

      if (!row) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "No store account found for this user",
        });
      }

      return reply.send({
        storeAccountId: row.storeAccountId,
        slug: row.slug,
        status: row.status,
        approvedAt: row.approvedAt,
        rejectionReason: row.rejectionReason,
        adminUrl:
          row.status === "active"
            ? `${config.NODE_ENV === "production" ? "https" : "http"}://${row.slug}.${config.BASE_DOMAIN}/admin`
            : null,
      });
    },
  );

  // ── GET /api/store/setup-wizard ───────────────────────────────────────────
  // Returns the current setup wizard progress for the store.
  app.get(
    "/api/store/setup-wizard",
    { preHandler: [requireAuth, requireStoreAccountContext] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      const [row] = await app.db
        .select({ settings: storeAccounts.settings })
        .from(storeAccounts)
        .where(eq(storeAccounts.id, storeId))
        .limit(1);

      const rawWizard = (row?.settings as Record<string, unknown> | null)?.setupWizard as
        | SetupWizardSettings
        | undefined;

      const completedSteps: WizardStep[] = rawWizard?.completedSteps ?? [];

      const steps = WIZARD_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        completed: completedSteps.includes(s.id),
      }));

      const completedCount = completedSteps.length;
      const totalSteps = WIZARD_STEPS.length;

      return reply.send({
        steps,
        completedCount,
        totalSteps,
        isComplete: completedCount >= totalSteps,
      });
    },
  );

  // ── PATCH /api/store/setup-wizard ─────────────────────────────────────────
  // Marks a wizard step as complete.
  app.patch(
    "/api/store/setup-wizard",
    { preHandler: [requireAuth, requireStoreAccountContext] },
    async (request, reply) => {
      const { step } = request.body as { step: WizardStep };

      if (!WIZARD_STEPS.some((s) => s.id === step)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: `Invalid step: "${step}". Valid steps are: ${WIZARD_STEPS.map((s) => s.id).join(", ")}`,
        });
      }

      const storeId = request.storeAccount.id;

      // Fetch current settings.
      const [row] = await app.db
        .select({ settings: storeAccounts.settings })
        .from(storeAccounts)
        .where(eq(storeAccounts.id, storeId))
        .limit(1);

      const currentSettings = (row?.settings as Record<string, unknown> | null) ?? {};
      const rawWizard = currentSettings.setupWizard as SetupWizardSettings | undefined;

      const now = new Date().toISOString();
      const completedSteps: WizardStep[] = rawWizard?.completedSteps
        ? [...new Set([...rawWizard.completedSteps, step])]
        : [step];

      const allDone = WIZARD_STEPS.every((s) => completedSteps.includes(s.id));

      const updatedWizard: SetupWizardSettings = {
        completedSteps,
        startedAt: rawWizard?.startedAt ?? now,
        completedAt: allDone ? (rawWizard?.completedAt ?? now) : null,
      };

      const newSettings = { ...currentSettings, setupWizard: updatedWizard };

      await app.db
        .update(storeAccounts)
        .set({ settings: newSettings })
        .where(eq(storeAccounts.id, storeId));

      const steps = WIZARD_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        completed: completedSteps.includes(s.id),
      }));

      return reply.send({
        steps,
        completedCount: completedSteps.length,
        totalSteps: WIZARD_STEPS.length,
        isComplete: allDone,
      });
    },
  );
}
