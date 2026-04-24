import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import * as OnboardingService from "./service.js";
import { signupSchema } from "./schemas.js";
import { config } from "../../config.js";

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
      const { storeMemberships, storeAccounts } = await import("../../db/schema/index.js");
      const { eq, and } = await import("drizzle-orm");

      const [row] = await app.db
        .select({
          storeAccountId: storeMemberships.storeAccountId,
          status: storeAccounts.status,
          approvedAt: storeAccounts.approvedAt,
          rejectionReason: storeAccounts.rejectionReason,
          slug: storeAccounts.slug,
        })
        .from(storeMemberships)
        .innerJoin(storeAccounts, eq(storeMemberships.storeAccountId, storeAccounts.id))
        .where(
          and(
            eq(storeMemberships.userId, request.currentUser.id),
            eq(storeMemberships.role, "store_admin"),
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
}
