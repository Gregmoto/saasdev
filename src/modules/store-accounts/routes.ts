import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as StoreService from "./service.js";

export async function storeAccountRoutes(app: FastifyInstance): Promise<void> {
  // GET /store-accounts — lists all stores the authenticated user is a member of
  app.get(
    "/store-accounts",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const stores = await StoreService.listStoreAccountsForUser(
        app.db,
        request.currentUser.id,
      );
      return reply.send(stores);
    },
  );

  // All routes below operate within a specific store account context.
  // requireStoreAccountContext resolves hostname → store + verifies membership.
  app.register(async function storeScoped(scoped) {
    scoped.addHook("preHandler", requireAuth);
    scoped.addHook("preHandler", requireStoreAccountContext);

    // GET /store/settings
    scoped.get("/store/settings", async (request, reply) => {
      return reply.send(request.storeAccount);
    });

    // PATCH /store/settings — owner/admin only
    scoped.patch("/store/settings", async (request, reply) => {
      if (!["store_admin"].includes(request.memberRole)) {
        return reply.status(403).send({ statusCode: 403, error: "Forbidden", message: "Insufficient role" });
      }
      const patch = request.body as { name?: string; settings?: Record<string, unknown> };
      const updated = await StoreService.updateStoreSettings(
        app.db,
        request.storeAccount.id,
        patch,
      );
      return reply.send(updated);
    });

    // GET /store/members
    scoped.get("/store/members", async (request, reply) => {
      const members = await StoreService.listMembersForStore(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(members);
    });
  });
}
