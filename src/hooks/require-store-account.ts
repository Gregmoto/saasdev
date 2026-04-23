import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { storeAccounts, storeMemberships, shops, shopDomains } from "../db/schema/index.js";
import { resolveCustomDomain } from "../modules/domains/service.js";
import { config } from "../config.js";

/**
 * requireStoreAccountContext — central store-account + shop isolation guard.
 *
 * Resolution order:
 *   1. Impersonation: if session.impersonatedStoreAccountId is set, use that.
 *   2. Hostname → shop_domains lookup  (resolves storeAccount + currentShop).
 *   3. X-Shop-Id header (admin context switch): resolve shop from header.
 *   4. Hostname → store_account_domains (store-level custom domain).
 *   5. Hostname → subdomain slug ({slug}.{baseDomain}).
 *   6. Block non-active store accounts.
 *   7. Verify currentUser has an active membership.
 *   8. Attach request.storeAccount, request.memberRole,
 *      request.currentShop, request.currentShopId.
 *
 * Must run AFTER requireAuth (needs request.currentUser).
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
    request.currentShop = null;
    request.currentShopId = null;
    request.session.lastActiveStoreAccountId = account.id;

    // Still resolve shop context from X-Shop-Id if present.
    await resolveShopFromHeader(request);
    return;
  }

  // ── 2–5. Resolve store account (and optionally shop) from hostname ─────────
  const resolved = await resolveFromHostname(request);
  if (!resolved) {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Store account not found",
    });
  }

  const { account, shop } = resolved;

  // ── 6. Block on non-active status ─────────────────────────────────────────
  if (sendStatusReply(account.status, reply)) return;

  // ── 7. Membership check ───────────────────────────────────────────────────
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

  // ── 8. Attach context ─────────────────────────────────────────────────────
  request.storeAccount = account;
  request.memberRole = membership.role;
  request.isImpersonating = false;
  request.currentShop = shop ?? null;
  request.currentShopId = shop?.id ?? null;
  request.session.lastActiveStoreAccountId = account.id;

  // If no shop was resolved from the hostname, check the X-Shop-Id header
  // (admin context switching — overrides "all shops" view with a specific shop).
  if (!shop) {
    await resolveShopFromHeader(request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the store account (and optionally the shop) from the request hostname.
 *
 * Priority:
 *   1. shop_domains — resolves both storeAccount and shop.
 *   2. store_account_domains (custom store-level domain) — storeAccount only.
 *   3. Subdomain slug ({slug}.{baseDomain}) — storeAccount only.
 */
async function resolveFromHostname(request: FastifyRequest) {
  const hostname = (request.headers["host"] ?? "").split(":")[0] ?? "";
  const db = request.server.db;

  // ── 1. Shop-level domain ──────────────────────────────────────────────────
  const [shopDomainRow] = await db
    .select({
      storeAccountId: shopDomains.storeAccountId,
      shopId: shopDomains.shopId,
      isVerified: shopDomains.isVerified,
    })
    .from(shopDomains)
    .where(and(eq(shopDomains.hostname, hostname), eq(shopDomains.isVerified, true)))
    .limit(1);

  if (shopDomainRow) {
    const [account] = await db
      .select()
      .from(storeAccounts)
      .where(eq(storeAccounts.id, shopDomainRow.storeAccountId))
      .limit(1);

    const [shop] = await db
      .select()
      .from(shops)
      .where(
        and(
          eq(shops.id, shopDomainRow.shopId),
          eq(shops.isActive, true),
        ),
      )
      .limit(1);

    if (account) return { account, shop: shop ?? null };
  }

  // ── 2. Store-level custom domain ──────────────────────────────────────────
  const storeCustomDomain = await resolveCustomDomain(db, hostname);
  if (storeCustomDomain) {
    const [account] = await db
      .select()
      .from(storeAccounts)
      .where(eq(storeAccounts.id, storeCustomDomain.storeAccountId))
      .limit(1);

    if (account) return { account, shop: null };
  }

  // ── 3. Subdomain slug ─────────────────────────────────────────────────────
  const slug = parseSubdomainSlug(hostname, config.BASE_DOMAIN);
  if (slug) {
    const [account] = await db
      .select()
      .from(storeAccounts)
      .where(eq(storeAccounts.slug, slug))
      .limit(1);

    if (account) return { account, shop: null };
  }

  return null;
}

/**
 * If the X-Shop-Id header is present and contains a valid UUID that belongs to
 * request.storeAccount, sets request.currentShop and request.currentShopId.
 *
 * Invalid / unknown values are silently ignored (header is advisory for admin UI).
 */
async function resolveShopFromHeader(request: FastifyRequest): Promise<void> {
  const shopId = request.headers["x-shop-id"];
  if (!shopId || typeof shopId !== "string" || !isUuid(shopId)) return;
  if (!request.storeAccount) return;

  const db = request.server.db;
  const [shop] = await db
    .select()
    .from(shops)
    .where(
      and(
        eq(shops.id, shopId),
        eq(shops.storeAccountId, request.storeAccount.id),
        eq(shops.isActive, true),
      ),
    )
    .limit(1);

  if (shop) {
    request.currentShop = shop;
    request.currentShopId = shop.id;
  }
}

/** Returns the slug if hostname matches {slug}.{baseDomain}, else null. */
function parseSubdomainSlug(hostname: string, baseDomain: string): string | null {
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return slug && !slug.includes(".") ? slug : null;
}

/** Loose UUID v4 check — avoids importing a library just for this. */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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

  void reply.status(503).send({
    statusCode: 503,
    error: "Service Unavailable",
    message: "This store account is not accessible.",
  });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported helper for auth routes that only need store resolution
// (not the full membership check).
// ─────────────────────────────────────────────────────────────────────────────
export async function resolveStoreAccountIdFromRequest(
  request: FastifyRequest,
): Promise<string | null> {
  const resolved = await resolveFromHostname(request);
  return resolved?.account.id ?? null;
}
