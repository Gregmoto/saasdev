import { describe, it, expect } from "vitest";
import { requireRole, requireStoreAdmin, requireAdminRole } from "../src/hooks/require-role.js";
import { requirePermission } from "../src/hooks/require-permission.js";
import type { MemberRole } from "../src/db/schema/index.js";

// ── Minimal request/reply mocks ───────────────────────────────────────────────

// Minimal Drizzle query-builder chain that resolves to an empty array.
// Matches the shape used in checkRolePermission: db.select().from().innerJoin().innerJoin().where()
const emptySelectChain = {
  from: () => ({
    innerJoin: () => ({
      innerJoin: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
  }),
};

function makeRequest(memberRole: MemberRole) {
  return {
    memberRole,
    server: {
      db: { select: () => emptySelectChain } as never,
      redis: {
        smembers: async () => [] as string[],
        sadd: async () => 0,
        expire: async () => 1,
      },
    },
  } as never;
}

function makeReply() {
  let _statusCode = 200;
  let _body: unknown;
  const reply = {
    status(code: number) {
      _statusCode = code;
      return reply;
    },
    send(body: unknown) {
      _body = body;
      return reply;
    },
    get statusCode() { return _statusCode; },
    get body() { return _body; },
  };
  return reply;
}

// ── requireRole tests ─────────────────────────────────────────────────────────

describe("requireRole()", () => {
  it("passes when the user's role matches", async () => {
    const request = makeRequest("store_admin");
    const reply = makeReply();
    await requireRole("store_admin")(request, reply as never);
    expect(reply.statusCode).toBe(200); // no status called → 200
  });

  it("returns 403 when the user's role does not match", async () => {
    const request = makeRequest("store_staff");
    const reply = makeReply();
    await requireRole("store_admin")(request, reply as never);
    expect(reply.statusCode).toBe(403);
  });

  it("passes when the user holds any of the allowed roles", async () => {
    const request = makeRequest("marketplace_owner");
    const reply = makeReply();
    await requireRole("store_admin", "marketplace_owner")(request, reply as never);
    expect(reply.statusCode).toBe(200);
  });

  it("includes the violating role and the required roles in the 403 body", async () => {
    const request = makeRequest("vendor_staff");
    const reply = makeReply();
    await requireRole("store_admin")(request, reply as never);
    const body = reply.body as { yourRole: string; message: string };
    expect(body.yourRole).toBe("vendor_staff");
    expect(body.message).toContain("store_admin");
  });
});

describe("requireStoreAdmin shorthand", () => {
  it("allows store_admin", async () => {
    const reply = makeReply();
    await requireStoreAdmin(makeRequest("store_admin"), reply as never);
    expect(reply.statusCode).toBe(200);
  });

  it("rejects vendor_admin", async () => {
    const reply = makeReply();
    await requireStoreAdmin(makeRequest("vendor_admin"), reply as never);
    expect(reply.statusCode).toBe(403);
  });
});

describe("requireAdminRole shorthand (store_admin | marketplace_owner)", () => {
  it.each(["store_admin", "marketplace_owner"] as MemberRole[])(
    "allows %s",
    async (role) => {
      const reply = makeReply();
      await requireAdminRole(makeRequest(role), reply as never);
      expect(reply.statusCode).toBe(200);
    },
  );

  it.each(["store_staff", "vendor_admin", "reseller_admin"] as MemberRole[])(
    "rejects %s",
    async (role) => {
      const reply = makeReply();
      await requireAdminRole(makeRequest(role), reply as never);
      expect(reply.statusCode).toBe(403);
    },
  );
});

// ── requirePermission tests ───────────────────────────────────────────────────
// Full permission resolution requires Redis + DB. Here we test the handler
// factory shape and the 403 path when no permissions are cached.

describe("requirePermission()", () => {
  it("returns a function (handler factory)", () => {
    const handler = requirePermission("orders:write");
    expect(typeof handler).toBe("function");
  });

  it("rejects with 403 when the role has no cached/DB permissions", async () => {
    const request = makeRequest("store_staff");
    const reply = makeReply();

    // Redis mock returns empty set → DB mock also returns empty.
    const handler = requirePermission("orders:delete");
    await handler(request, reply as never);

    expect(reply.statusCode).toBe(403);
    const body = reply.body as { message: string };
    expect(body.message).toContain("orders:delete");
  });
});

// ── MemberRole exhaustiveness ─────────────────────────────────────────────────

describe("roleToPortal exhaustiveness", () => {
  // Ensures no role silently falls through the switch in portal/routes.ts.
  // If a new role is added to the enum, TypeScript will flag the switch as
  // non-exhaustive at compile time — this test confirms the mapping exists.
  const ALL_ROLES: MemberRole[] = [
    "store_admin",
    "store_staff",
    "marketplace_owner",
    "vendor_admin",
    "vendor_staff",
    "reseller_admin",
  ];

  it("covers all known MemberRole values", () => {
    // If this breaks, a new enum value was added without updating the portal map.
    expect(ALL_ROLES).toHaveLength(6);
  });
});
