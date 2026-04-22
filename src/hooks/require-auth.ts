import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { authUsers } from "../db/schema/index.js";

/**
 * Verifies an active session and attaches request.currentUser.
 * Apply to any route that requires a logged-in user.
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
}
