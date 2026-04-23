import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { authUsers } from "../db/schema/index.js";

/**
 * Verifies an active session and attaches request.currentUser.
 *
 * Checks (in order):
 *  1. session.userId is present.
 *  2. session.totpVerified is true — prevents half-authenticated sessions
 *     (credentials OK, TOTP step still pending) from reaching API routes.
 *  3. User exists in DB and isActive.
 *  4. Attaches request.isImpersonating from session.
 *
 * Apply to every route that requires a fully logged-in user.
 * Use requireAuthPartial (below) only on intermediate steps like /auth/totp/verify.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.session.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Block half-authenticated sessions: credentials verified but TOTP pending.
  if (request.session.totpVerified !== true) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Two-factor authentication required. POST /auth/totp/verify to continue.",
    });
  }

  const [user] = await request.server.db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user || !user.isActive) {
    await request.session.destroy();
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Session invalid",
    });
  }

  request.currentUser = user;
  request.isImpersonating = !!request.session.impersonatedStoreAccountId;
}

/**
 * Like requireAuth but does NOT require totpVerified.
 * Use only on intermediate authentication endpoints (/auth/totp/verify, /auth/totp/recover).
 * Not subject to the route guard — these routes live under /auth/** anyway.
 */
export async function requireAuthPartial(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.session.userId;

  if (!userId) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  const [user] = await request.server.db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user || !user.isActive) {
    await request.session.destroy();
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Session invalid",
    });
  }

  request.currentUser = user;
  request.isImpersonating = false;
}
