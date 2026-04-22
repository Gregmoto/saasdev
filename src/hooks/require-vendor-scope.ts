import type { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Set after requireVendorScope() — present on /api/vendor/** routes */
    vendorId: string;
  }
}

/**
 * requireVendorScope — enforces that the authenticated user is acting as a
 * vendor within the current store account.
 *
 * Must run AFTER requireAuth + requireStoreAccountContext.
 *
 * TODO: implement vendor membership table and lookup when the Marketplace
 * module is scaffolded. Currently a documented stub that rejects all requests
 * with 501 so unimplemented vendor routes fail explicitly rather than silently.
 */
export async function requireVendorScope(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Replace this block when the vendor_memberships table exists.
  return reply.status(501).send({
    statusCode: 501,
    error: "Not Implemented",
    message: "Vendor scope is not yet implemented",
  });
}
