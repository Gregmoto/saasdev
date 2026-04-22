import type { AuthUser, StoreAccount, StoreMembership } from "../db/schema/index.js";

// Augment the Fastify.Session interface so direct session property access is typed.
// @fastify/session exposes request.session as FastifySessionObject extends Fastify.Session,
// so this is the correct extension point.
declare module "fastify" {
  interface Session {
    userId?: string;
    totpVerified?: boolean;
    lastActiveStoreAccountId?: string;
  }

  interface FastifyRequest {
    /** Set after requireAuth() — always present on authenticated routes */
    currentUser: AuthUser;
    /** Set after requireStoreAccountContext() — always present on store-scoped routes */
    storeAccount: StoreAccount;
    /** Role of currentUser in storeAccount */
    memberRole: StoreMembership["role"];
  }
}

export {}; // make this a module so augmentations apply
