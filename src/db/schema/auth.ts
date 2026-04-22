import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  inet,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

/**
 * auth_users is a GLOBAL identity table — one row per person, not per store.
 *
 * Rationale: a person can be a member of multiple store accounts (e.g. an
 * agency managing several shops, or a MULTISHOP owner). Duplicating rows per
 * store would mean multiple passwords, multiple TOTP secrets, and a fragmented
 * identity that breaks cross-store SSO and future OAuth flows.
 *
 * Access control is entirely in store_memberships (store_account_id + user_id
 * + role). The requireStoreAccountContext() guard enforces this at the request
 * level — it verifies the user has an active membership in the store account
 * resolved from the hostname before any handler runs.
 *
 * home_store_account_id (nullable):
 *   The user's default/preferred store account — used by the MultiShop
 *   account-switcher UI to know which store to land on after login when the
 *   incoming URL doesn't already resolve a specific store. It is NOT an
 *   access-control boundary; the authoritative check is always store_memberships.
 *   Set to NULL for users with no memberships yet (e.g. during invite flow).
 */
export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }), // NULL = magic-link / SSO only
    totpSecret: varchar("totp_secret", { length: 255 }),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /**
     * Default store account for the MultiShop switcher UI.
     * Set to the earliest membership on registration; updated when the user
     * explicitly switches stores. Never used for access-control decisions.
     */
    homeStoreAccountId: uuid("home_store_account_id").references(
      () => storeAccounts.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("auth_users_email_idx").on(t.email),
    activeIdx: index("auth_users_active_idx").on(t.isActive),
    homeStoreIdx: index("auth_users_home_store_idx").on(t.homeStoreAccountId),
  }),
);

// Session metadata tracked in DB for audit / forced-revocation.
// The live session payload (and its TTL) lives in Redis under key sess:{id}.
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    storeAccountId: uuid("store_account_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("auth_sessions_user_idx").on(t.userId),
    storeIdx: index("auth_sessions_store_idx").on(t.storeAccountId),
    expiresIdx: index("auth_sessions_expires_idx").on(t.expiresAt),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("password_reset_tokens_hash_idx").on(t.tokenHash),
    userIdx: index("password_reset_tokens_user_idx").on(t.userId),
  }),
);

export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("magic_link_tokens_hash_idx").on(t.tokenHash),
    userIdx: index("magic_link_tokens_user_idx").on(t.userId),
  }),
);

export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
