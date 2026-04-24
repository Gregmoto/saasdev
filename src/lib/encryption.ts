import crypto from "node:crypto";

// AES-256-GCM encryption for payment provider credentials.
// ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).
// In dev, falls back to all-zeros key — never use in production.

const ALGORITHM = "aes-256-gcm";

export function encrypt(plaintext: string): string {
  const key = Buffer.from(getKey(), "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all base64)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(getKey(), "hex");
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, "base64");
  const authTag = Buffer.from(tagB64!, "base64");
  const encrypted = Buffer.from(dataB64!, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function getKey(): string {
  const k = process.env["ENCRYPTION_KEY"];
  if (typeof k === "string" && k.length === 64) return k;
  // Dev fallback: zeros — insecure, only for local development
  return "0".repeat(64);
}
