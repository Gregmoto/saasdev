import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
// NOTE: We intentionally do NOT import authUsers here to avoid a circular
// dependency (auth.ts → store-accounts.ts → auth.ts).  The FK on approved_by
// is enforced by the database migration instead.

export const storeModeEnum = pgEnum("store_mode", [
  "WEBSHOP",
  "MULTISHOP",
  "MARKETPLACE",
  "RESELLER_PANEL",
]);

/**
 * Lifecycle states for a Store Account.
 *
 *  pending   → Created by public signup; cannot access storefront or admin.
 *              Awaiting Platform Super Admin approval.
 *  active    → Approved and fully operational.
 *  suspended → Manually suspended by Platform Admin. All access blocked but
 *              data is preserved. Can be reactivated.
 *  closed    → Permanently closed. Data preserved but inaccessible.
 */
export const storeAccountStatusEnum = pgEnum("store_account_status", [
  "pending",
  "active",
  "suspended",
  "closed",
]);

export type StoreMode = (typeof storeModeEnum.enumValues)[number];
export type StoreAccountStatus = (typeof storeAccountStatusEnum.enumValues)[number];

export const storeAccounts = pgTable(
  "store_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 63 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    mode: storeModeEnum("mode").notNull().default("WEBSHOP"),
    plan: varchar("plan", { length: 50 }).notNull().default("starter"),

    // Lifecycle status. isActive is kept in sync for backward-compat queries.
    status: storeAccountStatusEnum("status").notNull().default("pending"),
    isActive: boolean("is_active").notNull().default(false),

    // Plan limits — nullable means no limit.
    planLimits: jsonb("plan_limits")
      .$type<{
        maxProducts: number | null;
        maxOrders: number | null;
        maxUsers: number | null;
        maxStorefronts: number | null;
        storageGb: number | null;
      }>()
      .default(sql`'{}'::jsonb`),

    // Approval tracking — FK to auth_users enforced by DB migration, not here
    // (avoids circular import between store-accounts.ts and auth.ts).
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Demo accounts are read-only for public visitors. The API preHandler
    // blocks all write operations (POST/PUT/PATCH/DELETE) unless the caller
    // is a platform super-admin (is_platform_admin = true in auth_users).
    isDemo: boolean("is_demo").notNull().default(false),

    // Arbitrary key-value store configuration (starter defaults written on provision)
    settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("store_accounts_slug_idx").on(t.slug),
    activeIdx: index("store_accounts_active_idx").on(t.isActive),
    statusIdx: index("store_accounts_status_idx").on(t.status),
    isDemoIdx: index("store_accounts_is_demo_idx").on(t.isDemo),
  }),
);

export type StoreAccount = typeof storeAccounts.$inferSelect;
export type NewStoreAccount = typeof storeAccounts.$inferInsert;
