/**
 * Fastify routes for the Fortnox OAuth2 integration.
 *
 * All store-scoped routes require:
 *   preHandler: [requireAuth, requireStoreAccountContext]
 *
 * OAuth state is stored in the session to prevent CSRF.  The existing Session
 * interface is cast to include the `fortnoxOAuthState` field — extend the
 * fastify.d.ts declaration if you prefer strict typing there.
 */

import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../../hooks/require-store-account.js";
import { recordAuditEvent } from "../../security/service.js";
import { integrationConnections, integrationProviders } from "../../../db/schema/index.js";
import { syncJobs, syncLogs } from "../../../db/schema/sync.js";
import {
  getFortnoxAuthUrl,
  exchangeFortnoxCode,
  getFortnoxAccessToken,
  getFortnoxConnection,
} from "./service.js";
import type { FortnoxSyncOptions } from "./service.js";
import {
  createSyncJob,
  runFortnoxSync,
  appendSyncLog,
} from "./sync.js";

// ── Typed session helper ──────────────────────────────────────────────────────

interface FortnoxSession {
  fortnoxOAuthState?: string;
}

function fortnoxSession(session: unknown): FortnoxSession {
  return session as FortnoxSession;
}

// ── Route registration ────────────────────────────────────────────────────────

const preHandler = [requireAuth, requireStoreAccountContext] as const;

export async function fortnoxRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /api/integrations/fortnox/connect ──────────────────────────────────
  //
  // Initiates the OAuth2 authorization code flow.
  // Body: { providerId: string }
  // Returns: { authUrl: string }

  app.post(
    "/api/integrations/fortnox/connect",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = request.body as { providerId?: string };

      if (!body.providerId || typeof body.providerId !== "string") {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "providerId (UUID) is required",
        });
      }

      // Verify the provider exists and is the fortnox slug.
      const [provider] = await app.db
        .select({ id: integrationProviders.id, slug: integrationProviders.slug })
        .from(integrationProviders)
        .where(eq(integrationProviders.id, body.providerId))
        .limit(1);

      if (!provider || provider.slug !== "fortnox") {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Fortnox integration provider not found",
        });
      }

      // Generate a random state token and stash it in the session.
      const state = randomBytes(24).toString("hex");
      fortnoxSession(request.session).fortnoxOAuthState = state;
      await request.session.save();

      const authUrl = getFortnoxAuthUrl(request.storeAccount.id, state);

      return reply.send({ authUrl });
    },
  );

  // ── GET /api/integrations/fortnox/callback ──────────────────────────────────
  //
  // Fortnox redirects here after the user authorises.
  // Query: { code, state, error? }
  // Redirects to: /admin/integrations/fortnox?connected=true  (or ?error=...)

  app.get(
    "/api/integrations/fortnox/callback",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };

      // OAuth error from Fortnox.
      if (query.error) {
        return reply.redirect(
          `/admin/integrations/fortnox?error=${encodeURIComponent(query.error)}`,
        );
      }

      if (!query.code || !query.state) {
        return reply.redirect("/admin/integrations/fortnox?error=missing_params");
      }

      // Validate state to prevent CSRF.
      const session = fortnoxSession(request.session);
      const expectedState = session.fortnoxOAuthState;
      if (!expectedState) {
        return reply.redirect("/admin/integrations/fortnox?error=no_state");
      }

      // State from Fortnox is "{storeAccountId}:{randomPart}"; compare the
      // random part to prevent fixation.
      const receivedRandom = query.state.split(":").slice(1).join(":");
      if (receivedRandom !== expectedState) {
        return reply.redirect("/admin/integrations/fortnox?error=state_mismatch");
      }

      // Clear state from session.
      delete session.fortnoxOAuthState;
      await request.session.save();

      // Resolve the Fortnox provider row.
      const [provider] = await app.db
        .select({ id: integrationProviders.id })
        .from(integrationProviders)
        .where(eq(integrationProviders.slug, "fortnox"))
        .limit(1);

      if (!provider) {
        return reply.redirect("/admin/integrations/fortnox?error=provider_not_found");
      }

      try {
        await exchangeFortnoxCode(
          app.db,
          request.storeAccount.id,
          provider.id,
          query.code,
        );

        await recordAuditEvent(app.db, {
          eventType: "connect",
          actionType: "connect",
          entityType: "integration",
          entityId: provider.id,
          actorUserId: request.currentUser.id,
          storeAccountId: request.storeAccount.id,
          afterState: { provider: "fortnox", status: "connected" },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        return reply.redirect("/admin/integrations/fortnox?connected=true");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "token_exchange_failed";
        app.log.error({ err, storeAccountId: request.storeAccount.id }, "Fortnox token exchange error");
        return reply.redirect(
          `/admin/integrations/fortnox?error=${encodeURIComponent(message)}`,
        );
      }
    },
  );

  // ── GET /api/integrations/fortnox/status ────────────────────────────────────
  //
  // Returns the current connection status and last sync info.

  app.get(
    "/api/integrations/fortnox/status",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const [row] = await app.db
        .select({
          id: integrationConnections.id,
          status: integrationConnections.status,
          metadata: integrationConnections.metadata,
          lastSyncAt: integrationConnections.lastSyncAt,
          lastError: integrationConnections.lastError,
          updatedAt: integrationConnections.updatedAt,
        })
        .from(integrationConnections)
        .innerJoin(
          integrationProviders,
          eq(integrationConnections.providerId, integrationProviders.id),
        )
        .where(
          and(
            eq(integrationConnections.storeAccountId, request.storeAccount.id),
            eq(integrationProviders.slug, "fortnox"),
          ),
        )
        .limit(1);

      if (!row) {
        return reply.send({ connected: false });
      }

      const syncOptions: FortnoxSyncOptions = {
        syncCustomers: true,
        syncOrders: true,
        syncProducts: true,
        // Allow the store to override defaults via persisted metadata.
        ...(row.metadata as Partial<FortnoxSyncOptions> | null),
      };

      return reply.send({
        connected: row.status === "connected",
        connectionId: row.id,
        status: row.status,
        lastSyncAt: row.lastSyncAt,
        lastError: row.lastError,
        updatedAt: row.updatedAt,
        syncOptions,
      });
    },
  );

  // ── POST /api/integrations/fortnox/sync ─────────────────────────────────────
  //
  // Enqueues a sync job and kicks it off asynchronously.
  // Body: { entityType: 'customers'|'orders'|'products'|'all', syncOptions?: FortnoxSyncOptions }
  // Returns: { jobId: string }

  app.post(
    "/api/integrations/fortnox/sync",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = request.body as {
        entityType?: string;
        syncOptions?: Partial<FortnoxSyncOptions>;
      };

      const entityType = body.entityType ?? "all";
      const validTypes = ["customers", "orders", "products", "all"] as const;
      if (!(validTypes as readonly string[]).includes(entityType)) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "entityType must be one of: customers, orders, products, all",
        });
      }

      // Resolve connection.
      let connection: { id: string; status: string; metadata: Record<string, unknown> | null };
      try {
        connection = await getFortnoxConnection(app.db, request.storeAccount.id);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(statusCode).send({ statusCode, error: "Integration Error", message });
      }

      if (connection.status !== "connected") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Fortnox integration is not connected. Please re-authorise.",
        });
      }

      // Build sync options — merge stored defaults + request overrides.
      const storedOptions = (connection.metadata ?? {}) as Partial<FortnoxSyncOptions>;
      const syncOptions: FortnoxSyncOptions = {
        syncCustomers:
          body.syncOptions?.syncCustomers ??
          storedOptions.syncCustomers ??
          (entityType === "all" || entityType === "customers"),
        syncOrders:
          body.syncOptions?.syncOrders ??
          storedOptions.syncOrders ??
          (entityType === "all" || entityType === "orders"),
        syncProducts:
          body.syncOptions?.syncProducts ??
          storedOptions.syncProducts ??
          (entityType === "all" || entityType === "products"),
      };

      // Create the job.
      const jobId = await createSyncJob(app.db, request.storeAccount.id, entityType);
      await appendSyncLog(
        app.db,
        jobId,
        request.storeAccount.id,
        "info",
        `Sync job created (entityType=${entityType})`,
        { syncOptions },
      );

      // Fire-and-forget — resolve token then run sync in background.
      const connectionId = connection.id;
      const storeAccountId = request.storeAccount.id;
      const db = app.db;
      const log = app.log;

      void (async () => {
        try {
          const accessToken = await getFortnoxAccessToken(db, connectionId, storeAccountId);
          await runFortnoxSync(db, jobId, storeAccountId, connectionId, syncOptions, accessToken);
        } catch (err: unknown) {
          log.error({ err, jobId, storeAccountId }, "Fortnox sync background task failed");
        }
      })();

      return reply.status(202).send({ jobId });
    },
  );

  // ── GET /api/integrations/fortnox/sync/logs ─────────────────────────────────
  //
  // Returns sync log entries for this store, optionally filtered by jobId.
  // Query: { jobId?, limit?, offset? }

  app.get(
    "/api/integrations/fortnox/sync/logs",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = request.query as {
        jobId?: string;
        limit?: string;
        offset?: string;
      };

      const limit = Math.min(parseInt(query.limit ?? "50", 10) || 50, 200);
      const offset = parseInt(query.offset ?? "0", 10) || 0;

      const storeCondition = eq(syncLogs.storeAccountId, request.storeAccount.id);
      const providerCondition = eq(syncLogs.provider, "fortnox");
      const jobCondition = query.jobId ? eq(syncLogs.syncJobId, query.jobId) : undefined;

      const rows = await app.db
        .select()
        .from(syncLogs)
        .where(
          jobCondition
            ? and(storeCondition, providerCondition, jobCondition)
            : and(storeCondition, providerCondition),
        )
        .orderBy(desc(syncLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({ logs: rows, limit, offset });
    },
  );

  // ── GET /api/integrations/fortnox/sync/jobs ─────────────────────────────────
  //
  // Returns recent sync jobs for this store.

  app.get(
    "/api/integrations/fortnox/sync/jobs",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = Math.min(parseInt(query.limit ?? "20", 10) || 20, 100);
      const offset = parseInt(query.offset ?? "0", 10) || 0;

      const rows = await app.db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.storeAccountId, request.storeAccount.id),
            eq(syncJobs.provider, "fortnox"),
          ),
        )
        .orderBy(desc(syncJobs.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({ jobs: rows, limit, offset });
    },
  );
}
