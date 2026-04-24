import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  storeAccounts,
  storeMemberships,
  authUsers,
} from "../../db/schema/index.js";

// ── Resolve a store account for impersonation ────────────────────────────────

export interface ImpersonationTarget {
  storeAccountId: string;
  storeSlug: string;
  /** A representative active member to borrow role context from. */
  impersonatedUserId: string;
}

/**
 * Validates that the store account exists and is active.
 * Finds a store_admin member to borrow for role context.
 * Returns null if the store doesn't exist or has no active admin.
 */
export async function resolveImpersonationTarget(
  db: Db,
  storeAccountId: string,
): Promise<ImpersonationTarget | null> {
  const [store] = await db
    .select({ id: storeAccounts.id, slug: storeAccounts.slug, isActive: storeAccounts.isActive })
    .from(storeAccounts)
    .where(eq(storeAccounts.id, storeAccountId))
    .limit(1);

  if (!store || !store.isActive) return null;

  // Borrow an active store_admin's membership context.
  // If none, fall back to any active member.
  let [member] = await db
    .select({ userId: storeMemberships.userId })
    .from(storeMemberships)
    .where(
      and(
        eq(storeMemberships.storeAccountId, storeAccountId),
        eq(storeMemberships.role, "store_admin"),
        eq(storeMemberships.isActive, true),
      ),
    )
    .limit(1);

  if (!member) {
    [member] = await db
      .select({ userId: storeMemberships.userId })
      .from(storeMemberships)
      .where(
        and(
          eq(storeMemberships.storeAccountId, storeAccountId),
          eq(storeMemberships.isActive, true),
        ),
      )
      .limit(1);
  }

  if (!member) return null;

  return {
    storeAccountId: store.id,
    storeSlug: store.slug,
    impersonatedUserId: member.userId,
  };
}

// ── Lookup user for audit context ────────────────────────────────────────────

export async function getUserEmail(
  db: Db,
  userId: string,
): Promise<string | null> {
  const [user] = await db
    .select({ email: authUsers.email })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  return user?.email ?? null;
}
