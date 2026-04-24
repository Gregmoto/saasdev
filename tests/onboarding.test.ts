import { describe, it, expect } from "vitest";

// Pure unit tests — no Fastify app, no Redis, no DB.

describe("signupSchema", () => {
  it("rejects a missing email field", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "my-shop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 12 characters", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "short",
      storeName: "My Shop",
      storeSlug: "my-shop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase letters", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "MyShop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with spaces", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "my shop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug with underscore (only hyphens allowed)", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "my_shop",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug shorter than 3 characters", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects slug longer than 63 characters", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@shop.com",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "a".repeat(64),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "securepassword123",
      storeName: "My Shop",
      storeSlug: "my-shop",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid signup payload", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@myshop.com",
      password: "securepassword123",
      storeName: "My Awesome Shop",
      storeSlug: "my-awesome-shop",
    });
    expect(result.success).toBe(true);
  });

  it("accepts slugs with hyphens and numbers", async () => {
    const { signupSchema } = await import("../src/modules/onboarding/schemas.js");
    const result = signupSchema.safeParse({
      email: "owner@myshop.com",
      password: "securepassword123",
      storeName: "My Shop 2",
      storeSlug: "my-shop-2024",
    });
    expect(result.success).toBe(true);
  });
});
