import { resolveTxt } from "node:dns/promises";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { storeAccountDomains } from "../../db/schema/index.js";

const VERIFICATION_TOKEN_BYTES = 20; // 40-char hex

function generateToken(): string {
  return randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
}

// ── List domains for a store ──────────────────────────────────────────────────

export async function listDomains(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(storeAccountDomains)
    .where(eq(storeAccountDomains.storeAccountId, storeAccountId))
    .orderBy(storeAccountDomains.createdAt);
}

// ── Add a custom domain ───────────────────────────────────────────────────────

export interface AddDomainOpts {
  storeAccountId: string;
  hostname: string;
  verificationType: "dns" | "file";
  setPrimary?: boolean;
}

export async function addDomain(db: Db, opts: AddDomainOpts) {
  const hostname = opts.hostname.toLowerCase().trim();
  validateHostname(hostname);

  const verificationToken = generateToken();

  const [domain] = await db
    .insert(storeAccountDomains)
    .values({
      storeAccountId: opts.storeAccountId,
      hostname,
      verificationType: opts.verificationType,
      verificationToken,
      verified: false,
      isPrimary: false, // never primary until verified
    })
    .returning();

  if (!domain) throw new Error("Failed to add domain");

  return {
    ...domain,
    challenge: buildChallenge(hostname, verificationToken, opts.verificationType),
  };
}

// ── Get domain with challenge instructions ────────────────────────────────────

export async function getDomainChallenge(
  db: Db,
  domainId: string,
  storeAccountId: string,
) {
  const [domain] = await db
    .select()
    .from(storeAccountDomains)
    .where(
      and(
        eq(storeAccountDomains.id, domainId),
        eq(storeAccountDomains.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!domain) return null;

  return {
    ...domain,
    challenge: buildChallenge(domain.hostname, domain.verificationToken, domain.verificationType),
  };
}

// ── Attempt verification ──────────────────────────────────────────────────────

export interface VerifyResult {
  verified: boolean;
  method: "dns" | "file";
  details?: string;
}

export async function verifyDomain(
  db: Db,
  domainId: string,
  storeAccountId: string,
): Promise<VerifyResult> {
  const [domain] = await db
    .select()
    .from(storeAccountDomains)
    .where(
      and(
        eq(storeAccountDomains.id, domainId),
        eq(storeAccountDomains.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!domain) throw Object.assign(new Error("Domain not found"), { statusCode: 404 });

  if (domain.verified) {
    return { verified: true, method: domain.verificationType, details: "Already verified" };
  }

  let success = false;
  let details: string;

  if (domain.verificationType === "dns") {
    const result = await checkDnsTxt(domain.hostname, domain.verificationToken);
    success = result.success;
    details = result.details;
  } else {
    const result = await checkFileChallenge(domain.hostname, domain.verificationToken);
    success = result.success;
    details = result.details;
  }

  if (success) {
    await db
      .update(storeAccountDomains)
      .set({ verified: true, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(storeAccountDomains.id, domainId));
  }

  return { verified: success, method: domain.verificationType, details };
}

// ── Set primary domain ────────────────────────────────────────────────────────

export async function setPrimaryDomain(
  db: Db,
  domainId: string,
  storeAccountId: string,
): Promise<void> {
  const [domain] = await db
    .select({ verified: storeAccountDomains.verified })
    .from(storeAccountDomains)
    .where(
      and(
        eq(storeAccountDomains.id, domainId),
        eq(storeAccountDomains.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!domain) throw Object.assign(new Error("Domain not found"), { statusCode: 404 });
  if (!domain.verified) {
    throw Object.assign(new Error("Domain must be verified before it can be set as primary"), { statusCode: 409 });
  }

  await db.transaction(async (tx) => {
    // Unset all other primary domains for this store.
    await tx
      .update(storeAccountDomains)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(storeAccountDomains.storeAccountId, storeAccountId));

    await tx
      .update(storeAccountDomains)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(storeAccountDomains.id, domainId));
  });
}

// ── Remove a domain ───────────────────────────────────────────────────────────

export async function removeDomain(
  db: Db,
  domainId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(storeAccountDomains)
    .where(
      and(
        eq(storeAccountDomains.id, domainId),
        eq(storeAccountDomains.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: storeAccountDomains.id });
  return rows.length > 0;
}

// ── Hostname resolution (used by require-store-account) ───────────────────────

/**
 * Resolves a custom hostname to its store account ID.
 * Only returns verified custom domains.
 */
export async function resolveCustomDomain(
  db: Db,
  hostname: string,
): Promise<{ storeAccountId: string } | null> {
  const [row] = await db
    .select({ storeAccountId: storeAccountDomains.storeAccountId })
    .from(storeAccountDomains)
    .where(
      and(
        eq(storeAccountDomains.hostname, hostname.toLowerCase()),
        eq(storeAccountDomains.verified, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ── Private helpers ───────────────────────────────────────────────────────────

interface CheckResult {
  success: boolean;
  details: string;
}

/**
 * DNS TXT verification:
 * Looks for a TXT record at _saasverify.{hostname} containing the token.
 */
async function checkDnsTxt(hostname: string, token: string): Promise<CheckResult> {
  const dnsName = `_saasverify.${hostname}`;
  try {
    const records = await resolveTxt(dnsName);
    const flat = records.flat().join("");
    if (flat.includes(token)) {
      return { success: true, details: `TXT record found at ${dnsName}` };
    }
    return {
      success: false,
      details: `TXT record found at ${dnsName} but token not present. Found: ${flat.slice(0, 80)}`,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    return {
      success: false,
      details: code === "ENOTFOUND" || code === "ENODATA"
        ? `No TXT record found at ${dnsName}. DNS propagation may take up to 48 hours.`
        : `DNS lookup failed: ${String(err)}`,
    };
  }
}

/**
 * File verification:
 * GETs http://{hostname}/.well-known/saas-domain-verify and checks the response body.
 */
async function checkFileChallenge(hostname: string, token: string): Promise<CheckResult> {
  const url = `http://${hostname}/.well-known/saas-domain-verify`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      return { success: false, details: `GET ${url} returned HTTP ${res.status}` };
    }
    const body = (await res.text()).trim();
    if (body === token) {
      return { success: true, details: `File challenge verified at ${url}` };
    }
    return {
      success: false,
      details: `File found at ${url} but content does not match token. Got: ${body.slice(0, 80)}`,
    };
  } catch (err: unknown) {
    return { success: false, details: `HTTP request failed: ${String(err)}` };
  }
}

function buildChallenge(
  hostname: string,
  token: string,
  type: "dns" | "file",
): Record<string, string> {
  if (type === "dns") {
    return {
      method: "dns",
      recordType: "TXT",
      recordName: `_saasverify.${hostname}`,
      recordValue: token,
      instructions:
        `Add a DNS TXT record: name = _saasverify.${hostname}, value = ${token}. ` +
        "DNS propagation can take up to 48 hours. Call POST /verify once the record is in place.",
    };
  }
  return {
    method: "file",
    fileUrl: `http://${hostname}/.well-known/saas-domain-verify`,
    fileContent: token,
    instructions:
      `Serve the file at /.well-known/saas-domain-verify from your web server containing only: ${token}. ` +
      "Then call POST /verify.",
  };
}

function validateHostname(hostname: string): void {
  // Basic hostname validation: labels separated by dots, each 1–63 chars, no leading/trailing hyphens.
  const label = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  const parts = hostname.split(".");
  if (parts.length < 2 || !parts.every((p) => label.test(p))) {
    throw Object.assign(new Error(`Invalid hostname: ${hostname}`), { statusCode: 400 });
  }
}
