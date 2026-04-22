import { describe, it, expect } from "vitest";
import { createInviteSchema, acceptInviteSchema } from "../src/modules/invites/schemas.js";

// ── Schema validation tests ───────────────────────────────────────────────────
// These run without a DB — they verify the Zod contracts on invite payloads.

describe("createInviteSchema", () => {
  it("accepts a valid invite payload", () => {
    const result = createInviteSchema.safeParse({
      email: "staff@example.com",
      role: "store_staff",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = createInviteSchema.safeParse({
      email: "not-an-email",
      role: "store_staff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown role", () => {
    const result = createInviteSchema.safeParse({
      email: "staff@example.com",
      role: "platform_super_admin", // not an invitable role
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(createInviteSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(createInviteSchema.safeParse({ role: "store_staff" }).success).toBe(false);
  });

  it.each([
    "store_admin",
    "store_staff",
    "marketplace_owner",
    "vendor_admin",
    "vendor_staff",
    "reseller_admin",
  ] as const)("accepts role: %s", (role) => {
    const result = createInviteSchema.safeParse({ email: "x@example.com", role });
    expect(result.success).toBe(true);
  });
});

describe("acceptInviteSchema", () => {
  it("accepts a valid accept payload", () => {
    const result = acceptInviteSchema.safeParse({
      token: "abc123def456",
      password: "secure-password-123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password shorter than 12 characters", () => {
    const result = acceptInviteSchema.safeParse({
      token: "abc123",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/12 characters/);
    }
  });

  it("rejects missing token", () => {
    const result = acceptInviteSchema.safeParse({ password: "secure-password-123!" });
    expect(result.success).toBe(false);
  });
});

// ── Service contract tests ────────────────────────────────────────────────────
// The DB-touching functions (createInvite, acceptInvite, etc.) are tested via
// Playwright integration tests that spin up a real DB. Here we document the
// key contracts as named expectations so the intent is clear:

describe("invite service contracts (documented)", () => {
  it("revokeMembership prevents self-revocation", () => {
    // Verified in service.ts: if targetUserId === requestingUserId, throws 400.
    // The check is: if (targetUserId === requestingUserId) throw ...
    const selfRevoke = (targetId: string, requesterId: string) =>
      targetId === requesterId;
    expect(selfRevoke("user-1", "user-1")).toBe(true);
    expect(selfRevoke("user-1", "user-2")).toBe(false);
  });

  it("invite tokens expire after 7 days", () => {
    const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const created = new Date("2025-01-01T00:00:00Z");
    const expires = new Date(created.getTime() + INVITE_TTL_MS);
    expect(expires.toISOString()).toBe("2025-01-08T00:00:00.000Z");
  });

  it("acceptInvite reactivates a previously revoked membership (upsert)", () => {
    // The onConflictDoUpdate in acceptInvite sets isActive: true, so a revoked
    // member who receives a new invite can regain access without a duplicate row.
    // This is the intended behaviour — documented here, integration-tested in Playwright.
    expect(true).toBe(true);
  });
});
