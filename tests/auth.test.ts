import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("POST /auth/register", () => {
  it("rejects short passwords", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "test@example.com",
        password: "short",
        storeName: "Test Store",
        storeSlug: "test-store",
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects invalid slugs", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "test@example.com",
        password: "long-enough-password!",
        storeName: "Test Store",
        storeSlug: "UPPERCASE_NOT_ALLOWED",
      },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe("POST /auth/login", () => {
  it("returns 401 for unknown email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@example.com", password: "doesNotMatter123" },
      headers: { host: "test-store.saasshop.local" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("returns 401 when not logged in", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns 401 without session", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
