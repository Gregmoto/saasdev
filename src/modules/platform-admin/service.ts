import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  storeAccounts,
  storeMemberships,
  authUsers,
  securityLog,
  auditLog,
} from "../../db/schema/index.js";
import type { StoreAccountStatus, StoreMode } from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { sendEmail } from "../../lib/email.js";
import { config } from "../../config.js";

// ── List / search store accounts ──────────────────────────────────────────────

export interface StoreAccountListFilters {
  status?: StoreAccountStatus;
  mode?: StoreMode;
  search?: string; // matches name or slug
  limit?: number;
  offset?: number;
}

export async function listStoreAccounts(db: Db, filters: StoreAccountListFilters = {}) {
  const { status, mode, search, limit = 50, offset = 0 } = filters;

  const conditions = [];
  if (status) conditions.push(eq(storeAccounts.status, status));
  if (mode) conditions.push(eq(storeAccounts.mode, mode));
  if (search) {
    conditions.push(
      sql`(${storeAccounts.name} ILIKE ${"%" + search + "%"} OR ${storeAccounts.slug} ILIKE ${"%" + search + "%"})`,
    );
  }

  const rows = await db
    .select({
      id: storeAccounts.id,
      slug: storeAccounts.slug,
      name: storeAccounts.name,
      mode: storeAccounts.mode,
      plan: storeAccounts.plan,
      status: storeAccounts.status,
      isActive: storeAccounts.isActive,
      planLimits: storeAccounts.planLimits,
      approvedAt: storeAccounts.approvedAt,
      createdAt: storeAccounts.createdAt,
    })
    .from(storeAccounts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(storeAccounts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getStoreAccountById(db: Db, id: string) {
  const [account] = await db
    .select()
    .from(storeAccounts)
    .where(eq(storeAccounts.id, id))
    .limit(1);
  return account ?? null;
}

// ── Create store account (Platform Admin) ─────────────────────────────────────

export interface CreateStoreAccountOpts {
  slug: string;
  name: string;
  mode: StoreMode;
  plan: string;
  status: StoreAccountStatus;
  planLimits?: {
    maxProducts: number | null;
    maxOrders: number | null;
    maxUsers: number | null;
    maxStorefronts: number | null;
    storageGb: number | null;
  };
  adminEmail: string;
  adminPassword: string;
  actorUserId: string;
}

export async function createStoreAccount(
  db: Db,
  opts: CreateStoreAccountOpts,
): Promise<{ storeAccountId: string; userId: string }> {
  const passwordHash = await hashPassword(opts.adminPassword);
  const isActive = opts.status === "active";

  return db.transaction(async (tx) => {
    const [store] = await tx
      .insert(storeAccounts)
      .values({
        slug: opts.slug,
        name: opts.name,
        mode: opts.mode,
        plan: opts.plan,
        status: opts.status,
        isActive,
        planLimits: opts.planLimits ?? null,
        approvedBy: opts.status === "active" ? opts.actorUserId : null,
        approvedAt: opts.status === "active" ? new Date() : null,
        settings: defaultSettings(),
      })
      .returning({ id: storeAccounts.id });

    if (!store) throw new Error("Failed to create store account");

    // Upsert admin user.
    const [existing] = await tx
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, opts.adminEmail))
      .limit(1);

    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const [newUser] = await tx
        .insert(authUsers)
        .values({ email: opts.adminEmail, passwordHash })
        .returning({ id: authUsers.id });
      if (!newUser) throw new Error("Failed to create admin user");
      userId = newUser.id;
    }

    await tx.insert(storeMemberships).values({
      storeAccountId: store.id,
      userId,
      role: "store_admin",
      isActive: true,
      acceptedAt: new Date(),
    });

    return { storeAccountId: store.id, userId };
  });
}

// ── Update store account ──────────────────────────────────────────────────────

export interface UpdateStoreAccountOpts {
  name?: string;
  mode?: StoreMode;
  plan?: string;
  planLimits?: {
    maxProducts: number | null;
    maxOrders: number | null;
    maxUsers: number | null;
    maxStorefronts: number | null;
    storageGb: number | null;
  } | null;
  settings?: Record<string, unknown>;
}

export async function updateStoreAccount(
  db: Db,
  storeAccountId: string,
  opts: UpdateStoreAccountOpts,
) {
  const [updated] = await db
    .update(storeAccounts)
    .set({ ...opts, updatedAt: new Date() })
    .where(eq(storeAccounts.id, storeAccountId))
    .returning();

  if (!updated) throw Object.assign(new Error("Store account not found"), { statusCode: 404 });
  return updated;
}

// ── Approve pending account ───────────────────────────────────────────────────

export async function approveStoreAccount(
  db: Db,
  storeAccountId: string,
  actorUserId: string,
): Promise<void> {
  const [account] = await db
    .select({ status: storeAccounts.status, slug: storeAccounts.slug })
    .from(storeAccounts)
    .where(eq(storeAccounts.id, storeAccountId))
    .limit(1);

  if (!account) throw Object.assign(new Error("Store account not found"), { statusCode: 404 });
  if (account.status !== "pending") {
    throw Object.assign(
      new Error(`Cannot approve a store account in '${account.status}' status`),
      { statusCode: 409 },
    );
  }

  await db
    .update(storeAccounts)
    .set({
      status: "active",
      isActive: true,
      approvedBy: actorUserId,
      approvedAt: new Date(),
      settings: defaultSettings(),
      updatedAt: new Date(),
    })
    .where(eq(storeAccounts.id, storeAccountId));

  // Notify the store admin.
  const [membership] = await db
    .select({ email: authUsers.email })
    .from(storeMemberships)
    .innerJoin(authUsers, eq(storeMemberships.userId, authUsers.id))
    .where(
      and(
        eq(storeMemberships.storeAccountId, storeAccountId),
        eq(storeMemberships.role, "store_admin"),
        eq(storeMemberships.isActive, true),
      ),
    )
    .limit(1);

  if (membership) {
    const adminUrl = `${config.NODE_ENV === "production" ? "https" : "http"}://${account.slug}.${config.BASE_DOMAIN}/admin`;
    await sendEmail({
      to: membership.email,
      subject: "Your store account has been approved",
      html: `<p>Your store account <strong>${account.slug}</strong> has been approved and is now active.</p>
             <p><a href="${adminUrl}">Go to your admin panel</a></p>`,
      text: `Your store account ${account.slug} is now active. Admin panel: ${adminUrl}`,
    });
  }
}

// ── Suspend account ───────────────────────────────────────────────────────────

export async function suspendStoreAccount(
  db: Db,
  storeAccountId: string,
  reason?: string,
): Promise<void> {
  const result = await db
    .update(storeAccounts)
    .set({
      status: "suspended",
      isActive: false,
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(storeAccounts.id, storeAccountId))
    .returning({ id: storeAccounts.id });

  if (result.length === 0) {
    throw Object.assign(new Error("Store account not found"), { statusCode: 404 });
  }
}

// ── Reactivate account ────────────────────────────────────────────────────────

export async function reactivateStoreAccount(
  db: Db,
  storeAccountId: string,
  actorUserId: string,
): Promise<void> {
  const result = await db
    .update(storeAccounts)
    .set({
      status: "active",
      isActive: true,
      approvedBy: actorUserId,
      approvedAt: new Date(),
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(storeAccounts.id, storeAccountId),
        inArray(storeAccounts.status, ["suspended", "pending"]),
      ),
    )
    .returning({ id: storeAccounts.id });

  if (result.length === 0) {
    throw Object.assign(
      new Error("Store account not found or cannot be reactivated from its current status"),
      { statusCode: 409 },
    );
  }
}

// ── Close account ─────────────────────────────────────────────────────────────

export async function closeStoreAccount(
  db: Db,
  storeAccountId: string,
  reason?: string,
): Promise<void> {
  const result = await db
    .update(storeAccounts)
    .set({
      status: "closed",
      isActive: false,
      rejectionReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(storeAccounts.id, storeAccountId))
    .returning({ id: storeAccounts.id });

  if (result.length === 0) {
    throw Object.assign(new Error("Store account not found"), { statusCode: 404 });
  }
}

// ── System logs ───────────────────────────────────────────────────────────────

export async function listSecurityLogs(
  db: Db,
  opts: {
    storeAccountId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { limit = 100, offset = 0 } = opts;
  const conditions = [];
  if (opts.storeAccountId) conditions.push(eq(securityLog.storeAccountId, opts.storeAccountId));
  if (opts.userId) conditions.push(eq(securityLog.userId, opts.userId));
  if (opts.eventType) conditions.push(eq(securityLog.eventType, opts.eventType));

  return db
    .select()
    .from(securityLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(securityLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listAuditLogs(
  db: Db,
  opts: {
    storeAccountId?: string;
    actorUserId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { limit = 100, offset = 0 } = opts;
  const conditions = [];
  if (opts.storeAccountId) conditions.push(eq(auditLog.storeAccountId, opts.storeAccountId));
  if (opts.actorUserId) conditions.push(eq(auditLog.actorUserId, opts.actorUserId));
  if (opts.eventType) conditions.push(eq(auditLog.eventType, opts.eventType));

  return db
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultSettings(): Record<string, unknown> {
  return {
    currency: "USD",
    timezone: "UTC",
    locale: "en",
    taxIncluded: false,
    orderPrefix: "ORD-",
    provisionedAt: new Date().toISOString(),
  };
}

