import { describe, it, expect } from "vitest";

// All tests in this file are pure unit tests that import schemas and services
// directly — no Fastify app, no Redis, no DB connection required.

describe("createStoreAccountSchema", () => {
  it("rejects slugs with uppercase characters", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "UpperCase",
      name: "My Store",
      mode: "WEBSHOP",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slugs with spaces", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "my store",
      name: "My Store",
      mode: "WEBSHOP",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid store modes", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "valid-slug",
      name: "My Store",
      mode: "INVALID_MODE",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects admin password shorter than 12 chars", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "valid-slug",
      name: "My Store",
      mode: "WEBSHOP",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid payload and defaults status=active", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "valid-slug",
      name: "My Store",
      mode: "WEBSHOP",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("active");
  });

  it("accepts status=pending explicitly", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "valid-slug",
      name: "My Store",
      mode: "MARKETPLACE",
      plan: "pro",
      status: "pending",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("pending");
  });

  it("accepts all four modes", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const modes = ["WEBSHOP", "MULTISHOP", "MARKETPLACE", "RESELLER_PANEL"] as const;
    for (const mode of modes) {
      const result = createStoreAccountSchema.safeParse({
        slug: "valid-slug",
        name: "My Store",
        mode,
        plan: "starter",
        adminEmail: "admin@example.com",
        adminPassword: "securepassword123",
      });
      expect(result.success, `mode ${mode} should be valid`).toBe(true);
    }
  });

  it("accepts planLimits when provided", async () => {
    const { createStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = createStoreAccountSchema.safeParse({
      slug: "limited-store",
      name: "Limited Store",
      mode: "WEBSHOP",
      plan: "starter",
      adminEmail: "admin@example.com",
      adminPassword: "securepassword123",
      planLimits: {
        maxProducts: 100,
        maxOrders: null,
        maxUsers: 5,
        maxStorefronts: 1,
        storageGb: 10,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("listStoreAccountsSchema", () => {
  it("defaults limit=50 and offset=0", async () => {
    const { listStoreAccountsSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = listStoreAccountsSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });

  it("coerces string numbers from query params", async () => {
    const { listStoreAccountsSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = listStoreAccountsSchema.parse({ limit: "10", offset: "20" });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it("rejects limit above 200", async () => {
    const { listStoreAccountsSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = listStoreAccountsSchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status values", async () => {
    const { listStoreAccountsSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = listStoreAccountsSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid status values", async () => {
    const { listStoreAccountsSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    for (const status of ["pending", "active", "suspended", "closed"]) {
      const result = listStoreAccountsSchema.safeParse({ status });
      expect(result.success, `status ${status} should be valid`).toBe(true);
    }
  });
});

describe("updateStoreAccountSchema", () => {
  it("accepts an empty patch (all optional)", async () => {
    const { updateStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = updateStoreAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts nullable planLimits (to remove limits)", async () => {
    const { updateStoreAccountSchema } = await import(
      "../src/modules/platform-admin/schemas.js"
    );
    const result = updateStoreAccountSchema.safeParse({ planLimits: null });
    expect(result.success).toBe(true);
  });
});
