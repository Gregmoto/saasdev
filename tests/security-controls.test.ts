import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  checkSuspiciousLogin,
  revokeAllSessions,
} from "../src/modules/security/service.js";
import type { Redis } from "ioredis";

// ── Redis mock ────────────────────────────────────────────────────────────────

function makeRedis(store: Map<string, string> = new Map()): Redis {
  const sets = new Map<string, Set<string>>();
  const expirations = new Map<string, number>();

  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string, _ex?: string, ttl?: number) => {
      store.set(key, value);
      if (ttl) expirations.set(key, ttl);
      return "OK";
    },
    incr: async (key: string) => {
      const current = parseInt(store.get(key) ?? "0", 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    },
    expire: async (key: string, ttl: number) => {
      expirations.set(key, ttl);
      return 1;
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const k of keys) {
        if (store.delete(k) || sets.delete(k)) count++;
      }
      return count;
    },
    smembers: async (key: string) => [...(sets.get(key) ?? [])],
    sadd: async (key: string, ...members: string[]) => {
      if (!sets.has(key)) sets.set(key, new Set());
      let added = 0;
      for (const m of members) {
        if (!sets.get(key)!.has(m)) { sets.get(key)!.add(m); added++; }
      }
      return added;
    },
  } as unknown as Redis;
}

// ── Brute-force lockout ───────────────────────────────────────────────────────

describe("isLockedOut()", () => {
  it("returns false when no lockout key exists", async () => {
    const redis = makeRedis();
    expect(await isLockedOut(redis, "user@example.com")).toBe(false);
  });

  it("returns true when lockout key is set", async () => {
    const store = new Map([["auth:locked:user@example.com", "1"]]);
    const redis = makeRedis(store);
    expect(await isLockedOut(redis, "user@example.com")).toBe(true);
  });
});

describe("recordFailedAttempt()", () => {
  it("does not lock on fewer than 5 failures", async () => {
    const redis = makeRedis();
    const email = "test@example.com";
    for (let i = 0; i < 4; i++) {
      const r = await recordFailedAttempt(redis, email);
      expect(r.locked).toBe(false);
    }
  });

  it("soft-locks after 5 failures (15 min lockout)", async () => {
    const redis = makeRedis();
    const email = "locked@example.com";
    let result = { locked: false, lockoutSeconds: 0 };
    for (let i = 0; i < 5; i++) {
      result = await recordFailedAttempt(redis, email);
    }
    expect(result.locked).toBe(true);
    expect(result.lockoutSeconds).toBe(15 * 60);
  });

  it("hard-locks after 10 failures (1 hour lockout)", async () => {
    const redis = makeRedis();
    const email = "hardlock@example.com";
    let result = { locked: false, lockoutSeconds: 0 };
    for (let i = 0; i < 10; i++) {
      result = await recordFailedAttempt(redis, email);
    }
    expect(result.locked).toBe(true);
    expect(result.lockoutSeconds).toBe(60 * 60);
  });
});

describe("clearFailedAttempts()", () => {
  it("removes fail and lock keys", async () => {
    const store = new Map([
      ["auth:fails:clear@example.com", "7"],
      ["auth:locked:clear@example.com", "1"],
    ]);
    const redis = makeRedis(store);
    await clearFailedAttempts(redis, "clear@example.com");
    expect(await isLockedOut(redis, "clear@example.com")).toBe(false);
  });
});

// ── Suspicious login detection ────────────────────────────────────────────────

describe("checkSuspiciousLogin()", () => {
  it("is not suspicious on first login (no known IPs yet)", async () => {
    const redis = makeRedis();
    const suspicious = await checkSuspiciousLogin(redis, "user-1", "1.2.3.4");
    expect(suspicious).toBe(false);
  });

  it("is not suspicious from a known IP", async () => {
    const redis = makeRedis();
    // First login registers the IP.
    await checkSuspiciousLogin(redis, "user-2", "10.0.0.1");
    // Second login from same IP.
    const suspicious = await checkSuspiciousLogin(redis, "user-2", "10.0.0.1");
    expect(suspicious).toBe(false);
  });

  it("is suspicious from a new IP when known IPs exist", async () => {
    const redis = makeRedis();
    await checkSuspiciousLogin(redis, "user-3", "10.0.0.1");
    const suspicious = await checkSuspiciousLogin(redis, "user-3", "99.99.99.99");
    expect(suspicious).toBe(true);
  });

  it("returns false when IP is undefined", async () => {
    const redis = makeRedis();
    const suspicious = await checkSuspiciousLogin(redis, "user-4", undefined);
    expect(suspicious).toBe(false);
  });
});

// ── Session revocation ────────────────────────────────────────────────────────

describe("revokeAllSessions()", () => {
  it("returns 0 when no sessions exist", async () => {
    const redis = makeRedis();
    const count = await revokeAllSessions(redis, "no-sessions-user");
    expect(count).toBe(0);
  });

  it("removes all tracked session keys and the index set", async () => {
    const store = new Map<string, string>([
      ["sess:abc", "sessiondata"],
      ["sess:def", "sessiondata"],
    ]);
    const redis = makeRedis(store);

    // Manually seed the user→sessions index (normally done by session plugin).
    await (redis as unknown as { sadd: (...a: unknown[]) => Promise<number> })
      .sadd("sessions:user:uid-1", "abc", "def");

    const count = await revokeAllSessions(redis, "uid-1");
    expect(count).toBe(2);
    expect(store.has("sess:abc")).toBe(false);
    expect(store.has("sess:def")).toBe(false);
  });
});
