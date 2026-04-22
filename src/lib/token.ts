import { randomBytes, createHash } from "node:crypto";

/** Returns a [rawToken, tokenHash] pair.
 *  Send rawToken to the user; store tokenHash in the DB. */
export function generateSecureToken(byteLength = 32): [string, string] {
  const raw = randomBytes(byteLength).toString("hex");
  const hashed = sha256(raw);
  return [raw, hashed];
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
