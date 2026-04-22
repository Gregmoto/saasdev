import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { roles, permissions, rolePermissions } from "../../db/schema/index.js";

// ── Role definitions ──────────────────────────────────────────────────────────

const ROLE_DEFS = [
  { key: "platform_super_admin", name: "Platform Super Admin", scope: "platform" as const },
  { key: "store_admin",          name: "Store Account Admin",  scope: "store"    as const },
  { key: "store_staff",          name: "Store Account Staff",  scope: "store"    as const },
  { key: "marketplace_owner",    name: "Marketplace Owner",    scope: "store"    as const },
  { key: "vendor_admin",         name: "Vendor Admin",         scope: "vendor"   as const },
  { key: "vendor_staff",         name: "Vendor Staff",         scope: "vendor"   as const },
  { key: "reseller_admin",       name: "Reseller Admin",       scope: "reseller" as const },
] as const;

// ── Permission definitions ────────────────────────────────────────────────────

const PERMISSION_DEFS = [
  // Platform
  { key: "platform:*",                name: "Full platform access",        scope: "platform" as const },
  // Orders
  { key: "orders:read",               name: "View orders",                 scope: "store"    as const },
  { key: "orders:write",              name: "Create / update orders",      scope: "store"    as const },
  { key: "orders:delete",             name: "Delete orders",               scope: "store"    as const },
  // Products
  { key: "products:read",             name: "View products",               scope: "store"    as const },
  { key: "products:write",            name: "Create / update products",    scope: "store"    as const },
  { key: "products:delete",           name: "Delete products",             scope: "store"    as const },
  // Customers
  { key: "customers:read",            name: "View customers",              scope: "store"    as const },
  { key: "customers:write",           name: "Update customers",            scope: "store"    as const },
  // Settings
  { key: "settings:read",             name: "View settings",               scope: "store"    as const },
  { key: "settings:write",            name: "Update settings",             scope: "store"    as const },
  // Members / invites
  { key: "members:invite",            name: "Invite members",              scope: "store"    as const },
  { key: "members:read",              name: "View member list",            scope: "store"    as const },
  { key: "members:revoke",            name: "Revoke member access",        scope: "store"    as const },
  // Analytics
  { key: "analytics:read",            name: "View analytics",              scope: "store"    as const },
  // Returns / RMA
  { key: "returns:read",              name: "View returns",                scope: "store"    as const },
  { key: "returns:write",             name: "Process returns",             scope: "store"    as const },
  // Vendors (marketplace management)
  { key: "vendors:manage",            name: "Manage marketplace vendors",  scope: "store"    as const },
  // Vendor portal
  { key: "vendor:orders:read",        name: "View vendor orders",          scope: "vendor"   as const },
  { key: "vendor:orders:write",       name: "Update vendor orders",        scope: "vendor"   as const },
  { key: "vendor:products:read",      name: "View vendor products",        scope: "vendor"   as const },
  { key: "vendor:products:write",     name: "Create / update vendor products", scope: "vendor" as const },
  { key: "vendor:analytics:read",     name: "View vendor analytics",       scope: "vendor"   as const },
  { key: "vendor:members:invite",     name: "Invite vendor staff",         scope: "vendor"   as const },
  { key: "vendor:members:read",       name: "View vendor staff",           scope: "vendor"   as const },
  // Reseller portal
  { key: "reseller:clients:read",     name: "View reseller clients",       scope: "reseller" as const },
  { key: "reseller:clients:write",    name: "Manage reseller clients",     scope: "reseller" as const },
  { key: "reseller:orders:read",      name: "View reseller orders",        scope: "reseller" as const },
  { key: "reseller:analytics:read",   name: "View reseller analytics",     scope: "reseller" as const },
  { key: "reseller:settings:read",    name: "View reseller settings",      scope: "reseller" as const },
  { key: "reseller:settings:write",   name: "Update reseller settings",    scope: "reseller" as const },
] as const;

// ── Role → permission mapping ─────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  platform_super_admin: ["platform:*"],

  store_admin: [
    "orders:read", "orders:write", "orders:delete",
    "products:read", "products:write", "products:delete",
    "customers:read", "customers:write",
    "settings:read", "settings:write",
    "members:invite", "members:read", "members:revoke",
    "analytics:read",
    "returns:read", "returns:write",
  ],

  store_staff: [
    "orders:read", "orders:write",
    "products:read", "products:write",
    "customers:read",
    "analytics:read",
    "returns:read", "returns:write",
  ],

  marketplace_owner: [
    "orders:read", "orders:write",
    "products:read", "products:write",
    "vendors:manage",
    "settings:read", "settings:write",
    "analytics:read",
    "members:invite", "members:read", "members:revoke",
  ],

  vendor_admin: [
    "vendor:orders:read", "vendor:orders:write",
    "vendor:products:read", "vendor:products:write",
    "vendor:analytics:read",
    "vendor:members:invite", "vendor:members:read",
  ],

  vendor_staff: [
    "vendor:orders:read",
    "vendor:products:read",
  ],

  reseller_admin: [
    "reseller:clients:read", "reseller:clients:write",
    "reseller:orders:read",
    "reseller:analytics:read",
    "reseller:settings:read", "reseller:settings:write",
  ],
};

// ── Seed function (idempotent) ────────────────────────────────────────────────

/**
 * Upserts roles, permissions, and role_permissions.
 * Safe to call on every deploy — uses INSERT … ON CONFLICT DO UPDATE.
 */
export async function seedRbac(db: Db): Promise<void> {
  await db
    .insert(roles)
    .values(ROLE_DEFS.map((r) => ({ key: r.key, name: r.name, scope: r.scope })))
    .onConflictDoUpdate({
      target: roles.key,
      set: { name: sql`excluded.name`, scope: sql`excluded.scope` },
    });

  await db
    .insert(permissions)
    .values(PERMISSION_DEFS.map((p) => ({ key: p.key, name: p.name, scope: p.scope })))
    .onConflictDoUpdate({
      target: permissions.key,
      set: { name: sql`excluded.name`, scope: sql`excluded.scope` },
    });

  const roleRows = await db.select({ id: roles.id, key: roles.key }).from(roles);
  const permRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions);

  const roleMap = new Map(roleRows.map((r) => [r.key, r.id]));
  const permMap = new Map(permRows.map((p) => [p.key, p.id]));

  const rpValues: { roleId: string; permissionId: string }[] = [];
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleKey);
    if (!roleId) continue;
    for (const permKey of permKeys) {
      const permId = permMap.get(permKey);
      if (!permId) continue;
      rpValues.push({ roleId, permissionId: permId });
    }
  }

  if (rpValues.length > 0) {
    await db.insert(rolePermissions).values(rpValues).onConflictDoNothing();
  }
}
