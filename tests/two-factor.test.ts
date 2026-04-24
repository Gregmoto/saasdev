import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../src/lib/encrypt.js";
import { requireNotImpersonating } from "../src/hooks/require-not-impersonating.js";

// ── AES-256-GCM encrypt/decrypt ───────────────────────────────────────────────

describe("encrypt() / decrypt()", () => {
  const validKey = Buffer.from("a".repeat(32)).toString("base64"); // 32-byte key
  const originalEnv = process.env.TOTP_ENCRYPTION_KEY;

  function withKey(key: string, fn: () => void) {
    process.env.TOTP_ENCRYPTION_KEY = key;
    try { fn(); } finally {
      process.env.TOTP_ENCRYPTION_KEY = originalEnv;
    }
  }

  it("round-trips plaintext through encrypt → decrypt", () => {
    withKey(validKey, () => {
      const plaintext = "JBSWY3DPEHPK3PXP"; // sample TOTP base32 secret
      const ciphertext = encrypt(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    withKey(validKey, () => {
      const a = encrypt("same-secret");
      const b = encrypt("same-secret");
      expect(a).not.toBe(b);
      // Both must still decrypt correctly.
      expect(decrypt(a)).toBe("same-secret");
      expect(decrypt(b)).toBe("same-secret");
    });
  });

  it("throws on a tampered ciphertext", () => {
    withKey(validKey, () => {
      const ciphertext = encrypt("sensitive");
      // Corrupt the last character of the base64 payload.
      const parts = ciphertext.split(":");
      parts[2] = parts[2]!.slice(0, -4) + "XXXX";
      const tampered = parts.join(":");
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  it("throws when key is not 32 bytes", () => {
    process.env.TOTP_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encrypt("anything")).toThrow("32 bytes");
    process.env.TOTP_ENCRYPTION_KEY = originalEnv;
  });
});

// ── requireNotImpersonating ───────────────────────────────────────────────────

function makeReply() {
  let _code = 200;
  let _body: unknown;
  const reply = {
    status(c: number) { _code = c; return reply; },
    send(b: unknown) { _body = b; return reply; },
    get statusCode() { return _code; },
    get body() { return _body; },
  };
  return reply;
}

describe("requireNotImpersonating()", () => {
  it("passes when not impersonating", async () => {
    const request = { isImpersonating: false } as never;
    const reply = makeReply();
    await requireNotImpersonating(request, reply as never);
    expect(reply.statusCode).toBe(200);
  });

  it("returns 403 when inside an impersonation session", async () => {
    const request = { isImpersonating: true } as never;
    const reply = makeReply();
    await requireNotImpersonating(request, reply as never);
    expect(reply.statusCode).toBe(403);
    const body = reply.body as { message: string };
    expect(body.message).toContain("impersonation session");
  });
});

// ── 2FA schema validation ─────────────────────────────────────────────────────

import {
  confirmTotpSchema,
  disableTotpSchema,
  verifyTotpSchema,
  recoveryCodeSchema,
} from "../src/modules/two-factor/schemas.js";

describe("2FA Zod schemas", () => {
  describe("confirmTotpSchema", () => {
    it("accepts a 6-digit code", () => {
      expect(() => confirmTotpSchema.parse({ code: "123456" })).not.toThrow();
    });
    it("rejects non-numeric code", () => {
      expect(() => confirmTotpSchema.parse({ code: "12345a" })).toThrow();
    });
    it("rejects wrong length", () => {
      expect(() => confirmTotpSchema.parse({ code: "12345" })).toThrow();
    });
  });

  describe("disableTotpSchema", () => {
    it("accepts valid password + code", () => {
      expect(() =>
        disableTotpSchema.parse({ password: "securePass1!", code: "654321" }),
      ).not.toThrow();
    });
    it("rejects missing password", () => {
      expect(() => disableTotpSchema.parse({ code: "123456" })).toThrow();
    });
  });

  describe("recoveryCodeSchema", () => {
    it("accepts 10-char code", () => {
      expect(() => recoveryCodeSchema.parse({ code: "ABCDE12345" })).not.toThrow();
    });
    it("rejects wrong length", () => {
      expect(() => recoveryCodeSchema.parse({ code: "TOOSHORT" })).toThrow();
    });
  });

  describe("verifyTotpSchema", () => {
    it("accepts 6-digit numeric code", () => {
      expect(() => verifyTotpSchema.parse({ code: "000000" })).not.toThrow();
    });
  });
});
