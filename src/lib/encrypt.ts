import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12; // 96-bit recommended for GCM

function resolveKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY ?? "";
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be 32 bytes base64-encoded. " +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return buf;
}

/** Encrypt plaintext → "iv:authTag:ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
  const key = resolveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Decrypt "iv:authTag:ciphertext" → plaintext. Throws on invalid key or tampering. */
export function decrypt(token: string): string {
  const key = resolveKey();
  const parts = token.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return (
    decipher.update(Buffer.from(ctB64, "base64")).toString("utf8") +
    decipher.final("utf8")
  );
}
