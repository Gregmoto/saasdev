import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";
import { authUsers } from "./auth.js";

export const inviteTokens = pgTable(
  "invite_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    // VARCHAR matches MemberRole enum values — validated in service layer
    roleKey: varchar("role_key", { length: 60 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => authUsers.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("invite_tokens_hash_idx").on(t.tokenHash),
    storeIdx: index("invite_tokens_store_idx").on(t.storeAccountId),
    emailIdx: index("invite_tokens_email_idx").on(t.email),
  }),
);

export type InviteToken = typeof inviteTokens.$inferSelect;
