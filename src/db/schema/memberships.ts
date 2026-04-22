import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";
import { authUsers } from "./auth.js";

export const memberRoleEnum = pgEnum("member_role", [
  "store_admin",       // Full store access — can invite/revoke, change settings
  "store_staff",       // Day-to-day operations: orders, products, customers
  "marketplace_owner", // Manages a marketplace: vendors, listings, commissions
  "vendor_admin",      // Full vendor dashboard access + can invite vendor staff
  "vendor_staff",      // Read-only vendor ops: order fulfilment, product view
  "reseller_admin",    // Full reseller panel access
]);

export type MemberRole = (typeof memberRoleEnum.enumValues)[number];

// Links a global auth_user to a store_account with a role.
// This is the authority record for all store-account access control.
export const storeMemberships = pgTable(
  "store_memberships",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("store_staff"),
    isActive: boolean("is_active").notNull().default(true),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => ({
    uniqueMembership: uniqueIndex("store_memberships_unique_idx").on(
      t.storeAccountId,
      t.userId,
    ),
    storeIdx: index("store_memberships_store_idx").on(t.storeAccountId),
    userIdx: index("store_memberships_user_idx").on(t.userId),
  }),
);

export type StoreMembership = typeof storeMemberships.$inferSelect;
export type NewStoreMembership = typeof storeMemberships.$inferInsert;
