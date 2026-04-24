import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { Db } from "../../db/client.js";
import { user2fa, recoveryCodes, authUsers } from "../../db/schema/index.js";
import { generateTotpSecret, verifyTotpCode, totpQrDataUrl } from "../../lib/totp.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { encrypt, decrypt } from "../../lib/encrypt.js";

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 5; // 10-char uppercase hex per code

function generateRawCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase(),
  );
}

// ── Setup (step 1 of 2) ───────────────────────────────────────────────────────
// Generates a new TOTP secret, stores it encrypted with enabledAt = null.
// The user must confirm with a valid TOTP code before 2FA is active.

export async function initTotpSetup(
  db: Db,
  userId: string,
  email: string,
): Promise<{ secret: string; qrDataUrl: string }> {
  const secret = generateTotpSecret();
  const secretEncrypted = encrypt(secret);

  // Replace any prior pending setup row (not yet enabled).
  await db
    .delete(user2fa)
    .where(and(eq(user2fa.userId, userId), isNull(user2fa.enabledAt)));

  await db.insert(user2fa).values({ userId, secretEncrypted, enabledAt: null });

  const qrDataUrl = await totpQrDataUrl(secret, email, "SaaS Shop");
  return { secret, qrDataUrl };
}

// ── Confirm (step 2 of 2) ─────────────────────────────────────────────────────
// Verifies the TOTP code against the pending setup row.
// On success: activates 2FA, generates recovery codes, syncs auth_users flag.
// Returns the 10 raw recovery codes (shown once — not stored in plaintext).

export async function confirmTotpSetup(
  db: Db,
  userId: string,
  totpCode: string,
): Promise<{ recoveryCodes: string[] } | null> {
  const [pending] = await db
    .select()
    .from(user2fa)
    .where(and(eq(user2fa.userId, userId), isNull(user2fa.enabledAt)))
    .limit(1);

  if (!pending) return null;

  const secret = decrypt(pending.secretEncrypted);
  if (!verifyTotpCode(secret, totpCode)) return null;

  const rawCodes = generateRawCodes();

  await db.transaction(async (tx) => {
    await tx
      .update(user2fa)
      .set({ enabledAt: new Date() })
      .where(eq(user2fa.id, pending.id));

    // Remove any leftover recovery codes from a previous enable cycle.
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));

    const codeRows = await Promise.all(
      rawCodes.map(async (raw) => ({
        userId,
        codeHash: await hashPassword(raw),
      })),
    );
    await tx.insert(recoveryCodes).values(codeRows);

    await tx
      .update(authUsers)
      .set({ totpEnabled: true, updatedAt: new Date() })
      .where(eq(authUsers.id, userId));
  });

  return { recoveryCodes: rawCodes };
}

// ── Verify TOTP during login ───────────────────────────────────────────────────

export async function verifyTotp(
  db: Db,
  userId: string,
  totpCode: string,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(user2fa)
    .where(and(eq(user2fa.userId, userId), isNotNull(user2fa.enabledAt)))
    .limit(1);

  if (!row) return false;
  return verifyTotpCode(decrypt(row.secretEncrypted), totpCode);
}

// ── Use recovery code ─────────────────────────────────────────────────────────
// Tries each unused code hash — returns true and marks the code used on match.

export async function useRecoveryCode(
  db: Db,
  userId: string,
  rawCode: string,
): Promise<boolean> {
  const unused = await db
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));

  for (const row of unused) {
    const match = await verifyPassword(row.codeHash, rawCode);
    if (match) {
      await db
        .update(recoveryCodes)
        .set({ usedAt: new Date() })
        .where(eq(recoveryCodes.id, row.id));
      return true;
    }
  }
  return false;
}

// ── Disable 2FA ───────────────────────────────────────────────────────────────
// Requires password + current TOTP code.

export async function disableTotp(
  db: Db,
  userId: string,
  password: string,
  totpCode: string,
): Promise<boolean> {
  const [user] = await db
    .select({ passwordHash: authUsers.passwordHash })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);

  if (!user?.passwordHash) return false;
  if (!(await verifyPassword(user.passwordHash, password))) return false;
  if (!(await verifyTotp(db, userId, totpCode))) return false;

  await db.transaction(async (tx) => {
    await tx.delete(user2fa).where(eq(user2fa.userId, userId));
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
    await tx
      .update(authUsers)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(authUsers.id, userId));
  });

  return true;
}

// ── Platform Super Admin: reset another user's 2FA ───────────────────────────
// Deletes user_2fa + recovery_codes. User must re-enroll next login.

export async function adminResetTotp(db: Db, targetUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(user2fa).where(eq(user2fa.userId, targetUserId));
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, targetUserId));
    await tx
      .update(authUsers)
      .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
      .where(eq(authUsers.id, targetUserId));
  });
}

// ── Status check ──────────────────────────────────────────────────────────────

export async function getTotpStatus(
  db: Db,
  userId: string,
): Promise<{ enabled: boolean; pendingSetup: boolean }> {
  const [row] = await db
    .select({ enabledAt: user2fa.enabledAt })
    .from(user2fa)
    .where(eq(user2fa.userId, userId))
    .limit(1);

  if (!row) return { enabled: false, pendingSetup: false };
  return { enabled: row.enabledAt !== null, pendingSetup: row.enabledAt === null };
}
