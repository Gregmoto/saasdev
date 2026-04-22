import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  inviteTokens,
  authUsers,
  storeMemberships,
} from "../../db/schema/index.js";
import type { MemberRole } from "../../db/schema/index.js";
import { generateSecureToken, sha256 } from "../../lib/token.js";
import { hashPassword } from "../../lib/password.js";
import { sendEmail } from "../../lib/email.js";
import { config } from "../../config.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Create ────────────────────────────────────────────────────────────────────

export async function createInvite(
  db: Db,
  opts: {
    storeAccountId: string;
    email: string;
    roleKey: MemberRole;
    invitedBy: string;
  },
): Promise<void> {
  const [rawToken, tokenHash] = generateSecureToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await db.insert(inviteTokens).values({
    storeAccountId: opts.storeAccountId,
    email: opts.email,
    roleKey: opts.roleKey,
    tokenHash,
    invitedBy: opts.invitedBy,
    expiresAt,
  });

  const acceptUrl = `${config.NODE_ENV === "production" ? "https" : "http"}://${opts.storeAccountId}.${config.BASE_DOMAIN}/auth/invite/accept?token=${rawToken}`;

  await sendEmail({
    to: opts.email,
    subject: "You've been invited to a store account",
    html: `
      <p>You have been invited to join a store account.</p>
      <p><a href="${acceptUrl}">Accept your invitation</a> — link expires in 7 days.</p>
    `,
    text: `Accept your invitation: ${acceptUrl}`,
  });
}

// ── Preview (for the accept form) ─────────────────────────────────────────────

export async function getInvitePreview(
  db: Db,
  rawToken: string,
): Promise<{ email: string; roleKey: string; storeAccountId: string } | null> {
  const tokenHash = sha256(rawToken);
  const now = new Date();

  const [invite] = await db
    .select({
      email: inviteTokens.email,
      roleKey: inviteTokens.roleKey,
      storeAccountId: inviteTokens.storeAccountId,
    })
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.tokenHash, tokenHash),
        gt(inviteTokens.expiresAt, now),
        isNull(inviteTokens.usedAt),
      ),
    )
    .limit(1);

  return invite ?? null;
}

// ── Accept ────────────────────────────────────────────────────────────────────

export async function acceptInvite(
  db: Db,
  opts: { rawToken: string; password: string },
): Promise<{ userId: string; role: MemberRole; storeAccountId: string }> {
  const tokenHash = sha256(opts.rawToken);
  const now = new Date();

  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.tokenHash, tokenHash),
        gt(inviteTokens.expiresAt, now),
        isNull(inviteTokens.usedAt),
      ),
    )
    .limit(1);

  if (!invite) throw Object.assign(new Error("Invalid or expired invite token"), { statusCode: 400 });

  const passwordHash = await hashPassword(opts.password);

  return db.transaction(async (tx) => {
    // Create user if not exists; update password if they already have an account.
    const [existing] = await tx
      .select({ id: authUsers.id, homeStoreAccountId: authUsers.homeStoreAccountId })
      .from(authUsers)
      .where(eq(authUsers.email, invite.email))
      .limit(1);

    let userId: string;

    if (existing) {
      userId = existing.id;
      await tx
        .update(authUsers)
        .set({
          passwordHash,
          // Set home store if they don't have one yet
          ...(existing.homeStoreAccountId == null
            ? { homeStoreAccountId: invite.storeAccountId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, userId));
    } else {
      const [newUser] = await tx
        .insert(authUsers)
        .values({
          email: invite.email,
          passwordHash,
          homeStoreAccountId: invite.storeAccountId,
        })
        .returning({ id: authUsers.id });
      userId = newUser!.id;
    }

    // Upsert membership — reactivate if previously revoked.
    await tx
      .insert(storeMemberships)
      .values({
        storeAccountId: invite.storeAccountId,
        userId,
        role: invite.roleKey as MemberRole,
        isActive: true,
        acceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [storeMemberships.storeAccountId, storeMemberships.userId],
        set: {
          role: invite.roleKey as MemberRole,
          isActive: true,
          acceptedAt: new Date(),
        },
      });

    // Consume the invite token.
    await tx
      .update(inviteTokens)
      .set({ usedAt: new Date() })
      .where(eq(inviteTokens.id, invite.id));

    return {
      userId,
      role: invite.roleKey as MemberRole,
      storeAccountId: invite.storeAccountId,
    };
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listInvites(db: Db, storeAccountId: string) {
  return db
    .select({
      id: inviteTokens.id,
      email: inviteTokens.email,
      roleKey: inviteTokens.roleKey,
      expiresAt: inviteTokens.expiresAt,
      usedAt: inviteTokens.usedAt,
      createdAt: inviteTokens.createdAt,
    })
    .from(inviteTokens)
    .where(eq(inviteTokens.storeAccountId, storeAccountId))
    .orderBy(inviteTokens.createdAt);
}

// ── Revoke invite (pending only) ──────────────────────────────────────────────

export async function revokeInvite(
  db: Db,
  inviteId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(inviteTokens)
    .where(
      and(
        eq(inviteTokens.id, inviteId),
        eq(inviteTokens.storeAccountId, storeAccountId),
        isNull(inviteTokens.usedAt),
      ),
    )
    .returning({ id: inviteTokens.id });
  return rows.length > 0;
}

// ── Revoke member access ──────────────────────────────────────────────────────

export async function revokeMembership(
  db: Db,
  targetUserId: string,
  storeAccountId: string,
  requestingUserId: string,
): Promise<boolean> {
  // Cannot revoke your own access.
  if (targetUserId === requestingUserId) {
    throw Object.assign(new Error("You cannot revoke your own access"), { statusCode: 400 });
  }

  const rows = await db
    .update(storeMemberships)
    .set({ isActive: false })
    .where(
      and(
        eq(storeMemberships.userId, targetUserId),
        eq(storeMemberships.storeAccountId, storeAccountId),
        eq(storeMemberships.isActive, true),
      ),
    )
    .returning({ id: storeMemberships.id });

  return rows.length > 0;
}
