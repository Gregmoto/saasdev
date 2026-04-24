import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUsers } from "./auth.js";
import { storeAccounts } from "./store-accounts.js";

// ── TOTP 2FA ──────────────────────────────────────────────────────────────────
// Stores the encrypted TOTP secret per user.
// enabledAt = null  →  setup initiated but not yet confirmed
// enabledAt = date  →  2FA active

export const user2fa = pgTable("user_2fa", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  secretEncrypted: text("secret_encrypted").notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Recovery codes ────────────────────────────────────────────────────────────
// 10 single-use codes generated when 2FA is first enabled.
// code_hash = argon2id hash; raw codes are shown once and never stored.

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("recovery_codes_user_id_idx").on(t.userId),
  }),
);

// ── Security log ──────────────────────────────────────────────────────────────
// Immutable append-only log for authentication events.
// event_type values: login_success | login_fail | login_lockout |
//   totp_success | totp_fail | recovery_code_used | suspicious_login |
//   session_revoked | session_revoked_all | password_reset_request |
//   password_reset_success

export const securityLog = pgTable(
  "security_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").references(() => storeAccounts.id),
    userId: uuid("user_id").references(() => authUsers.id),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("security_log_user_id_idx").on(t.userId),
    storeIdx: index("security_log_store_account_id_idx").on(t.storeAccountId),
    eventTypeIdx: index("security_log_event_type_idx").on(t.eventType),
    createdAtIdx: index("security_log_created_at_idx").on(t.createdAt),
  }),
);

// ── Audit log ─────────────────────────────────────────────────────────────────
// Append-only log for all privileged and state-changing admin actions.
//
// action_type  — what was done:  create | update | delete | approve | suspend |
//   connect | disconnect | invite | revoke | impersonate | …
// entity_type  — what was acted on: store_account | product | order | user |
//   plan | integration | payout | setting | role | …
// entity_id    — PK of the affected row (nullable for bulk/platform ops)
//
// Backward-compat note: event_type is kept as an alias for older callers;
// new code uses action_type + entity_type instead.

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").references(() => storeAccounts.id),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id),
    targetUserId: uuid("target_user_id").references(() => authUsers.id),

    // Structured action taxonomy (preferred over eventType for new code).
    actionType: varchar("action_type", { length: 60 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }),
    entityId: uuid("entity_id"),

    // Legacy alias — set to the same value as actionType for new rows.
    eventType: varchar("event_type", { length: 60 }).notNull(),

    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeIdx: index("audit_log_store_account_id_idx").on(t.storeAccountId),
    actorIdx: index("audit_log_actor_user_id_idx").on(t.actorUserId),
    actionTypeIdx: index("audit_log_action_type_idx").on(t.actionType),
    entityTypeIdx: index("audit_log_entity_type_idx").on(t.entityType),
    createdAtIdx: index("audit_log_created_at_idx").on(t.createdAt),
  }),
);

export type User2fa = typeof user2fa.$inferSelect;
export type SecurityLogEntry = typeof securityLog.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;

/** Canonical list of entity types that can appear in the audit log. */
export type AuditEntityType =
  | "store_account"
  | "product"
  | "order"
  | "user"
  | "plan"
  | "feature_flag"
  | "integration"
  | "payout"
  | "setting"
  | "role"
  | "invite"
  | "domain"
  | "warehouse"
  | "market";

/** What kind of change was made. */
export type AuditActionType =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "close"
  | "connect"
  | "disconnect"
  | "publish"
  | "unpublish"
  | "invite"
  | "revoke"
  | "impersonate"
  | "impersonate_stop"
  | "totp_reset"
  | "plan_assign"
  | "limit_override";
