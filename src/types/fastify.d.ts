import type { AuthUser, StoreAccount, StoreMembership } from "../db/schema/index.js";

// Augment the Fastify.Session interface so direct session property access is typed.
// @fastify/session exposes request.session as FastifySessionObject extends Fastify.Session,
// so this is the correct extension point.
declare module "fastify" {
  interface Session {
    userId?: string;
    /**
     * true  = user completed TOTP (or has no TOTP enrolled).
     * false = credentials accepted, TOTP step still pending.
     * Must be true before any /api/** route is accessible.
     */
    totpVerified?: boolean;
    lastActiveStoreAccountId?: string;

    // ── Impersonation ──────────────────────────────────────────────────────────
    // When a Platform Super Admin impersonates a store account, these fields are
    // set. The admin's own userId remains in session.userId so all audit events
    // are attributed to the real actor.
    /** The store account being impersonated. Null = not impersonating. */
    impersonatedStoreAccountId?: string;
    /** The user ID whose membership context is borrowed. */
    impersonatedUserId?: string;
  }

  interface FastifyRequest {
    /** Set after requireAuth() — always present on authenticated routes */
    currentUser: AuthUser;
    /** Set after requireStoreAccountContext() — always present on store-scoped routes */
    storeAccount: StoreAccount;
    /** Role of currentUser in storeAccount (or "store_admin" during impersonation) */
    memberRole: StoreMembership["role"];
    /** True when the request is running inside an active impersonation session */
    isImpersonating: boolean;
  }
}

export {}; // make this a module so augmentations apply
