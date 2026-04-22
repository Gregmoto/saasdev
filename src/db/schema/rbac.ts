import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "./auth.js";

export const roleScopeEnum = pgEnum("role_scope", [
  "platform",
  "store",
  "vendor",
  "reseller",
]);

// System-defined roles. Seeded at startup via seedRbac().
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  scope: roleScopeEnum("scope").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fine-grained permission keys: "orders:write", "products:delete", etc.
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  scope: roleScopeEnum("scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Many-to-many: which permissions each role grants.
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
    roleIdx: index("role_permissions_role_idx").on(t.roleId),
  }),
);

// Platform Super Admins — cross-store access, not scoped to any store account.
// Kept separate from store_memberships so the privilege boundary is explicit.
export const platformMemberships = pgTable("platform_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  grantedBy: uuid("granted_by").references(() => authUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type PlatformMembership = typeof platformMemberships.$inferSelect;
