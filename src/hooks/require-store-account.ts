import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { storeAccounts, storeMemberships } from "../db/schema/index.js";
import { config } from "../config.js";

/**
 * requireStoreAccountContext — central store-account isolation guard.
 *
 * Resolution order:
 *   1. Parse hostname → subdomain (slug) or custom domain.
 *   2. Load the matching store_account row.
 *   3. Verify currentUser has an active membership in that account.
 *   4. Attach request.storeAccount and request.memberRole.
 *
 * Must run AFTER requireAuth (needs request.currentUser).
 *
 * Cross-account access is structurally impossible — every subsequent query
 * that scopes by request.storeAccount.id can only reach data for that account.
 */
export async function requireStoreAccountContext(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.currentUser) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const account = await resolveStoreAccount(request);
  if (!account) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Store account not found",
    });
  }

  const [membership] = await request.server.db
    .select({ role: storeMemberships.role })
    .from(storeMemberships)
    .where(
      and(
        eq(storeMemberships.storeAccountId, account.id),
        eq(storeMemberships.userId, request.currentUser.id),
        eq(storeMemberships.isActive, true),
      ),
    )
    .limit(1);

  if (!membership) {
    return reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message: "You do not have access to this store account",
    });
  }

  request.storeAccount = account;
  request.memberRole = membership.role;
  request.session.lastActiveStoreAccountId = account.id;
}

// ---------------------------------------------------------------------------

async function resolveStoreAccount(request: FastifyRequest) {
  const hostname = (request.headers["host"] ?? "").split(":")[0] ?? "";
  const slug = parseSubdomainSlug(hostname, config.BASE_DOMAIN);
  const db = request.server.db;

  const [account] = await db
    .select()
    .from(storeAccounts)
    .where(
      and(
        slug
          ? eq(storeAccounts.slug, slug)
          : eq(storeAccounts.customDomain, hostname),
        eq(storeAccounts.isActive, true),
      ),
    )
    .limit(1);

  return account ?? null;
}

/** Returns the slug if hostname matches {slug}.{baseDomain}, else null. */
function parseSubdomainSlug(hostname: string, baseDomain: string): string | null {
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return slug && !slug.includes(".") ? slug : null;
}

// ---------------------------------------------------------------------------
// Exported helper for auth routes that only need store resolution
// (not the full membership check).
// ---------------------------------------------------------------------------
export async function resolveStoreAccountIdFromRequest(
  request: FastifyRequest,
): Promise<string | null> {
  const account = await resolveStoreAccount(request);
  return account?.id ?? null;
}
