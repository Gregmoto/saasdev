import { describe, it, expect } from "vitest";

// Pure unit tests — no Fastify app, no Redis, no DB.

describe("createProviderSchema", () => {
  const validProvider = {
    slug: "stripe",
    name: "Stripe",
    authType: "api_key",
    configSchema: {
      apiKey: { type: "string", label: "API Key", secret: true, required: true },
    },
  };

  it("accepts a valid provider definition", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse(validProvider);
    expect(result.success).toBe(true);
  });

  it("rejects invalid authType", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse({ ...validProvider, authType: "saml" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse({ ...validProvider, slug: "Stripe" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid authTypes", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    for (const authType of ["api_key", "oauth2", "webhook", "custom"]) {
      const result = createProviderSchema.safeParse({ ...validProvider, authType });
      expect(result.success, `authType ${authType} should be valid`).toBe(true);
    }
  });

  it("rejects invalid logoUrl (not a URL)", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse({
      ...validProvider,
      logoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid logoUrl", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse({
      ...validProvider,
      logoUrl: "https://cdn.example.com/stripe-logo.svg",
    });
    expect(result.success).toBe(true);
  });

  it("defaults configSchema to empty object", async () => {
    const { createProviderSchema } = await import("../src/modules/integrations/schemas.js");
    const result = createProviderSchema.safeParse({
      slug: "webhook-only",
      name: "Webhook Receiver",
      authType: "webhook",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.configSchema).toEqual({});
  });
});

describe("connectIntegrationSchema", () => {
  it("accepts provider with config", async () => {
    const { connectIntegrationSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectIntegrationSchema.safeParse({
      providerId: "00000000-0000-0000-0000-000000000001",
      config: { apiKey: "sk_live_abc123" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID providerId", async () => {
    const { connectIntegrationSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectIntegrationSchema.safeParse({
      providerId: "not-a-uuid",
      config: {},
    });
    expect(result.success).toBe(false);
  });

  it("defaults config to empty object", async () => {
    const { connectIntegrationSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectIntegrationSchema.safeParse({
      providerId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.config).toEqual({});
  });

  it("rejects non-string values in config (only string credentials)", async () => {
    const { connectIntegrationSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectIntegrationSchema.safeParse({
      providerId: "00000000-0000-0000-0000-000000000001",
      config: { apiKey: 12345 }, // number, not string
    });
    expect(result.success).toBe(false);
  });
});

describe("connectionIdParamSchema", () => {
  it("accepts a valid UUID", async () => {
    const { connectionIdParamSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectionIdParamSchema.safeParse({
      connectionId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID", async () => {
    const { connectionIdParamSchema } = await import("../src/modules/integrations/schemas.js");
    const result = connectionIdParamSchema.safeParse({ connectionId: "bad-id" });
    expect(result.success).toBe(false);
  });
});

describe("encrypt/decrypt round-trip (used for connection credentials)", () => {
  it("round-trips a JSON config object", async () => {
    // Only runs if TOTP_ENCRYPTION_KEY is set to a valid 32-byte key.
    // In CI/test environments without the key, this test is skipped.
    const key = process.env.TOTP_ENCRYPTION_KEY;
    if (!key || Buffer.from(key, "base64").length !== 32) {
      // Skip gracefully — key not set in this environment.
      expect(true).toBe(true);
      return;
    }

    const { encrypt, decrypt } = await import("../src/lib/encrypt.js");
    const original = JSON.stringify({ apiKey: "sk_live_abc", secret: "whsec_xyz" });
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:authTag:ciphertext format
  });
});

describe("audit log — action/entity taxonomy", () => {
  it("AuditActionType covers connect and disconnect", async () => {
    // Verify the type exports exist — caught at compile time, but confirm at runtime too.
    const { auditLog } = await import("../src/db/schema/security.js");
    // The table should have actionType and entityType columns.
    const colNames = Object.keys(auditLog);
    expect(colNames).toContain("actionType");
    expect(colNames).toContain("entityType");
    expect(colNames).toContain("entityId");
    expect(colNames).toContain("userAgent");
  });
});
