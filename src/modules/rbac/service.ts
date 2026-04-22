import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import type { Redis } from "ioredis";
import type { MemberRole } from "../../db/schema/index.js";
import {
  roles,
  permissions,
  rolePermissions,
  platformMemberships,
} from "../../db/schema/index.js";

const CACHE_PREFIX = "rbac:perms:";
const CACHE_TTL_SECONDS = 300; // 5 min

/**
 * Returns true if the given role has the requested permission.
 *
 * Check order:
 *   1. Redis cache (Set per role key) — avoids DB on hot paths
 *   2. DB join across role_permissions → populate cache
 *   3. "platform:*" wildcard grants all permissions to Platform Super Admins
 */
export async function checkRolePermission(
  db: Db,
  redis: Redis,
  roleKey: MemberRole,
  permissionKey: string,
): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIX}${roleKey}`;

  const cached = await redis.smembers(cacheKey);
  if (cached.length > 0) {
    return cached.includes(permissionKey) || cached.includes("platform:*");
  }

  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(roles.key, roleKey));

  const permKeys: string[] = rows.map((r) => r.key);

  if (permKeys.length > 0) {
    // ioredis sadd requires at least one member — guard ensures this.
    await redis.sadd(cacheKey, ...permKeys as [string, ...string[]]);
    await redis.expire(cacheKey, CACHE_TTL_SECONDS);
  }

  return permKeys.includes(permissionKey) || permKeys.includes("platform:*");
}

/** Check if a user holds a Platform Super Admin membership. */
export async function isPlatformSuperAdmin(
  db: Db,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: platformMemberships.id })
    .from(platformMemberships)
    .where(
      and(
        eq(platformMemberships.userId, userId),
        eq(platformMemberships.isActive, true),
      ),
    )
    .limit(1);
  return !!row;
}

/** Invalidate cached permissions for a role — call after role_permissions changes. */
export async function invalidatePermissionCache(
  redis: Redis,
  roleKey: string,
): Promise<void> {
  await redis.del(`${CACHE_PREFIX}${roleKey}`);
}
