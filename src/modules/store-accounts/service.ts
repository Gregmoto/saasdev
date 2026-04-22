import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { storeAccounts, storeMemberships, authUsers } from "../../db/schema/index.js";
import type { StoreAccount } from "../../db/schema/index.js";

export async function getStoreAccountById(
  db: Db,
  id: string,
): Promise<StoreAccount | undefined> {
  const [account] = await db
    .select()
    .from(storeAccounts)
    .where(eq(storeAccounts.id, id))
    .limit(1);
  return account;
}

export async function listMembersForStore(db: Db, storeAccountId: string) {
  return db
    .select({
      userId: authUsers.id,
      email: authUsers.email,
      role: storeMemberships.role,
      isActive: storeMemberships.isActive,
      joinedAt: storeMemberships.acceptedAt,
    })
    .from(storeMemberships)
    .innerJoin(authUsers, eq(storeMemberships.userId, authUsers.id))
    .where(eq(storeMemberships.storeAccountId, storeAccountId));
}

export async function updateStoreSettings(
  db: Db,
  storeAccountId: string,
  patch: { name?: string; settings?: Record<string, unknown> },
): Promise<StoreAccount> {
  const [updated] = await db
    .update(storeAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(storeAccounts.id, storeAccountId))
    .returning();

  if (!updated) throw new Error("Store account not found");
  return updated;
}

export async function listStoreAccountsForUser(db: Db, userId: string) {
  return db
    .select({
      id: storeAccounts.id,
      name: storeAccounts.name,
      slug: storeAccounts.slug,
      mode: storeAccounts.mode,
      plan: storeAccounts.plan,
      role: storeMemberships.role,
    })
    .from(storeMemberships)
    .innerJoin(storeAccounts, eq(storeMemberships.storeAccountId, storeAccounts.id))
    .where(
      and(
        eq(storeMemberships.userId, userId),
        eq(storeMemberships.isActive, true),
        eq(storeAccounts.isActive, true),
      ),
    );
}
