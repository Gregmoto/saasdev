import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { storeAccounts, storeMemberships } from "../db/schema/index.js";
import { resolveCustomDomain } from "../modules/domains/service.js";
import { config } from "../config.js";

/**
 * requireStoreAccountContext — central store-account isolation guard.
 *
 * Resolution order:
 *   1. Impersonation: if session.impersonatedStoreAccountId is set, use that.
 *   2. Parse hostname → subdomain slug or verified custom domain lookup.
 *   3. Load the matching store_account row.
 *   4. Block non-active accounts (pending → 503, suspended → 503, closed → 410).
 *   5. Verify currentUser has an active membership in that account.
 *   6. Attach request.storeAccount and request.memberRole.
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

  const db = request.server.db;

  // ── 1. Impersonation shortcut ──────────────────────────────────────────────
  const impersonatedId = request.session.impersonatedStoreAccountId;
  if (impersonatedId) {
    const [account] = await db
      .select()
      .from(storeAccounts)
      .where(eq(storeAccounts.id, impersonatedId))
      .limit(1);

    if (!account) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Impersonated store account not found",
      });
    }

    if (sendStatusReply(account.status, reply)) return;

    // Platform admins bypass membership check during impersonation.
    request.storeAccount = account;
    request.memberRole = "store_admin";
    request.isImpersonating = true;
    request.session.lastActiveStoreAccountId = account.id;
    return;
  }

  // ── 2. Resolve from hostname ──────────────────────────────────────────────
  const account = await resolveStoreAccount(request);
  if (!account) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Store account not found",
    });
  }

  // ── 3. Block on non-active status ─────────────────────────────────────────
  if (sendStatusReply(account.status, reply)) return;

  // ── 4. Membership check ───────────────────────────────────────────────────
  const [membership] = await db
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
  request.isImpersonating = false;
  request.session.lastActiveStoreAccountId = account.id;
}

// ---------------------------------------------------------------------------

async function resolveStoreAccount(request: FastifyRequest) {
  const hostname = (request.headers["host"] ?? "").split(":")[0] ?? "";
  const db = request.server.db;

  const slug = parseSubdomainSlug(hostname, config.BASE_DOMAIN);

  if (slug) {
    // Subdomain routing: {slug}.{baseDomain}
    const [account] = await db
      .select()
      .from(storeAccounts)
      .where(eq(storeAccounts.slug, slug))
      .limit(1);
    return account ?? null;
  }

  // Custom domain routing: look up verified custom domain.
  const row = await resolveCustomDomain(db, hostname);
  if (!row) return null;

  const [account] = await db
    .select()
    .from(storeAccounts)
    .where(eq(storeAccounts.id, row.storeAccountId))
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

/**
 * Sends an appropriate error reply for non-active store statuses and returns
 * true.  Returns false (without sending) when the account is active so the
 * caller can continue normally.
 */
function sendStatusReply(status: string, reply: FastifyReply): boolean {
  if (status === "active") return false;

  if (status === "pending" || status === "suspended") {
    void reply.status(503).send({
      statusCode: 503,
      error: "Service Unavailable",
      message:
        status === "pending"
          ? "This store account is pending approval and is not yet accessible."
          : "This store account is currently suspended.",
    });
    return true;
  }

  if (status === "closed") {
    void reply.status(410).send({
      statusCode: 410,
      error: "Gone",
      message: "This store account has been closed.",
    });
    return true;
  }

  // Unknown status — treat as unavailable.
  void reply.status(503).send({
    statusCode: 503,
    error: "Service Unavailable",
    message: "This store account is not accessible.",
  });
  return true;
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
