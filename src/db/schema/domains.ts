import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

export const domainVerificationTypeEnum = pgEnum("domain_verification_type", [
  "dns",  // DNS TXT record at _saasverify.{hostname}
  "file", // File at /.well-known/saas-domain-verify served from the hostname
]);

/**
 * Hostnames registered for a Store Account.
 *
 * Every Store Account has one implicit hostname:  {slug}.{BASE_DOMAIN}
 * This table tracks additional custom domains that route to a store.
 *
 * Rules:
 *  - A hostname can only belong to one store account.
 *  - At most one domain can be `isPrimary = true` per store.
 *  - Custom domains must be `verified` before they receive traffic.
 *  - Platform slug domains ({slug}.{BASE_DOMAIN}) are NOT stored here;
 *    they are resolved from the store_accounts.slug column directly.
 */
export const storeAccountDomains = pgTable(
  "store_account_domains",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),

    // Full hostname: "shop.example.com", "example.com", etc.
    hostname: varchar("hostname", { length: 253 }).notNull(),

    // Whether this domain is currently receiving traffic (verified = true).
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    // If true, canonical URL for this store (used in redirects and emails).
    isPrimary: boolean("is_primary").notNull().default(false),

    // Verification challenge details.
    verificationType: domainVerificationTypeEnum("verification_type")
      .notNull()
      .default("dns"),
    // Random hex token placed in the DNS record or served from the well-known file.
    verificationToken: text("verification_token").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Hostname must be globally unique — one hostname → one store only.
    hostnameIdx: uniqueIndex("store_account_domains_hostname_idx").on(t.hostname),
    // Fast lookup by store for listing / primary-domain queries.
    storeIdx: index("store_account_domains_store_account_id_idx").on(t.storeAccountId),
    // Fast lookup for routing: verified custom domains.
    verifiedIdx: index("store_account_domains_verified_idx").on(t.verified),
  }),
);

export type StoreAccountDomain = typeof storeAccountDomains.$inferSelect;
export type NewStoreAccountDomain = typeof storeAccountDomains.$inferInsert;
