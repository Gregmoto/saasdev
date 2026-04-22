import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  authUsers,
  authSessions,
  passwordResetTokens,
  magicLinkTokens,
  storeAccounts,
  storeMemberships,
} from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateSecureToken, sha256 } from "../../lib/token.js";
import {
  generateTotpSecret,
  verifyTotpCode,
  totpQrDataUrl,
} from "../../lib/totp.js";
import {
  sendEmail,
  passwordResetEmail,
  magicLinkEmail,
} from "../../lib/email.js";
import { config } from "../../config.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerStoreAccount(
  db: Db,
  opts: {
    email: string;
    password: string;
    storeName: string;
    storeSlug: string;
  },
): Promise<{ userId: string; storeAccountId: string }> {
  const passwordHash = await hashPassword(opts.password);

  return await db.transaction(async (tx) => {
    const [store] = await tx
      .insert(storeAccounts)
      .values({ name: opts.storeName, slug: opts.storeSlug })
      .returning({ id: storeAccounts.id });

    if (!store) throw new Error("Failed to create store account");

    const [user] = await tx
      .insert(authUsers)
      .values({ email: opts.email, passwordHash })
      .returning({ id: authUsers.id });

    if (!user) throw new Error("Failed to create user");

    await tx.insert(storeMemberships).values({
      storeAccountId: store.id,
      userId: user.id,
      role: "owner",
      acceptedAt: new Date(),
    });

    return { userId: user.id, storeAccountId: store.id };
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export type LoginResult =
  | { outcome: "ok"; userId: string }
  | { outcome: "totp_required"; userId: string }
  | { outcome: "invalid_credentials" }
  | { outcome: "account_inactive" };

export async function login(
  db: Db,
  opts: { email: string; password: string; totpCode: string | undefined },
): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, opts.email))
    .limit(1);

  if (!user || !user.passwordHash) return { outcome: "invalid_credentials" };
  if (!user.isActive) return { outcome: "account_inactive" };

  const passwordOk = await verifyPassword(user.passwordHash, opts.password);
  if (!passwordOk) return { outcome: "invalid_credentials" };

  if (user.totpEnabled) {
    if (!opts.totpCode) return { outcome: "totp_required", userId: user.id };
    if (!verifyTotpCode(user.totpSecret!, opts.totpCode)) {
      return { outcome: "invalid_credentials" };
    }
  }

  await db
    .update(authUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(authUsers.id, user.id));

  return { outcome: "ok", userId: user.id };
}

// ---------------------------------------------------------------------------
// Session tracking (DB side — Redis is authoritative)
// ---------------------------------------------------------------------------

export async function trackSession(
  db: Db,
  opts: {
    sessionId: string;
    userId: string;
    storeAccountId: string;
    ipAddress: string | undefined;
    userAgent: string | undefined;
    ttlSeconds: number;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000);
  await db.insert(authSessions).values({
    id: opts.sessionId,
    userId: opts.userId,
    storeAccountId: opts.storeAccountId,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
    expiresAt,
  });
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.id, sessionId));
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(
  db: Db,
  opts: { email: string; storeAccountId: string },
): Promise<void> {
  // Look up user that has membership in this store account.
  const [row] = await db
    .select({ userId: authUsers.id, email: authUsers.email })
    .from(authUsers)
    .innerJoin(storeMemberships, eq(storeMemberships.userId, authUsers.id))
    .where(
      and(
        eq(authUsers.email, opts.email),
        eq(storeMemberships.storeAccountId, opts.storeAccountId),
        eq(storeMemberships.isActive, true),
      ),
    )
    .limit(1);

  // Always return 200 to avoid user enumeration.
  if (!row) return;

  const [rawToken, tokenHash] = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.insert(passwordResetTokens).values({
    storeAccountId: opts.storeAccountId,
    userId: row.userId,
    tokenHash,
    expiresAt,
  });

  const resetUrl = buildUrl(opts.storeAccountId, `/auth/password-reset?token=${rawToken}`);
  await sendEmail({ to: row.email, ...passwordResetEmail(resetUrl) });
}

export async function confirmPasswordReset(
  db: Db,
  opts: { token: string; newPassword: string; storeAccountId: string },
): Promise<boolean> {
  const tokenHash = sha256(opts.token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.storeAccountId, opts.storeAccountId),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!record) return false;

  const passwordHash = await hashPassword(opts.newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(authUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(authUsers.id, record.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
  });

  return true;
}

// ---------------------------------------------------------------------------
// Magic link
// ---------------------------------------------------------------------------

export async function requestMagicLink(
  db: Db,
  opts: { email: string; storeAccountId: string },
): Promise<void> {
  const [row] = await db
    .select({ userId: authUsers.id, email: authUsers.email })
    .from(authUsers)
    .innerJoin(storeMemberships, eq(storeMemberships.userId, authUsers.id))
    .where(
      and(
        eq(authUsers.email, opts.email),
        eq(storeMemberships.storeAccountId, opts.storeAccountId),
        eq(storeMemberships.isActive, true),
      ),
    )
    .limit(1);

  if (!row) return; // silent — no user enumeration

  const [rawToken, tokenHash] = generateSecureToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(magicLinkTokens).values({
    storeAccountId: opts.storeAccountId,
    userId: row.userId,
    tokenHash,
    expiresAt,
  });

  const loginUrl = buildUrl(opts.storeAccountId, `/auth/magic-link/verify?token=${rawToken}`);
  await sendEmail({ to: row.email, ...magicLinkEmail(loginUrl) });
}

export async function verifyMagicLink(
  db: Db,
  opts: { token: string; storeAccountId: string },
): Promise<{ userId: string } | null> {
  const tokenHash = sha256(opts.token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        eq(magicLinkTokens.storeAccountId, opts.storeAccountId),
        gt(magicLinkTokens.expiresAt, now),
        isNull(magicLinkTokens.usedAt),
      ),
    )
    .limit(1);

  if (!record) return null;

  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, record.id));

  await db
    .update(authUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(authUsers.id, record.userId));

  return { userId: record.userId };
}

// ---------------------------------------------------------------------------
// TOTP
// ---------------------------------------------------------------------------

export async function initTotpSetup(
  db: Db,
  userId: string,
  email: string,
): Promise<{ secret: string; qrDataUrl: string }> {
  const secret = generateTotpSecret();

  // Persist the secret before the user confirms — they must verify before it is enabled.
  await db
    .update(authUsers)
    .set({ totpSecret: secret, updatedAt: new Date() })
    .where(eq(authUsers.id, userId));

  const qrDataUrl = await totpQrDataUrl(secret, email, "SaaS Shop");
  return { secret, qrDataUrl };
}

export async function enableTotp(
  db: Db,
  userId: string,
  code: string,
): Promise<boolean> {
  const [user] = await db
    .select({ totpSecret: authUsers.totpSecret })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user?.totpSecret) return false;
  if (!verifyTotpCode(user.totpSecret, code)) return false;

  await db
    .update(authUsers)
    .set({ totpEnabled: true, updatedAt: new Date() })
    .where(eq(authUsers.id, userId));

  return true;
}

export async function disableTotp(
  db: Db,
  userId: string,
  password: string,
  code: string,
): Promise<boolean> {
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user?.passwordHash) return false;
  if (!(await verifyPassword(user.passwordHash, password))) return false;
  if (!user.totpSecret || !verifyTotpCode(user.totpSecret, code)) return false;

  await db
    .update(authUsers)
    .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
    .where(eq(authUsers.id, userId));

  return true;
}

export async function changePassword(
  db: Db,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user?.passwordHash) return false;
  if (!(await verifyPassword(user.passwordHash, currentPassword))) return false;

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(authUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(authUsers.id, userId));

  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(storeAccountId: string, path: string): string {
  // In dev just return the path — the gateway resolves hostname per store.
  return `${config.NODE_ENV === "production" ? "https" : "http"}://admin.${config.BASE_DOMAIN}${path}`;
}
