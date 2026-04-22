import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const storeModeEnum = pgEnum("store_mode", [
  "WEBSHOP",
  "MULTISHOP",
  "MARKETPLACE",
  "RESELLER_PANEL",
]);

export const storeAccounts = pgTable(
  "store_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 63 }).notNull(),
    customDomain: varchar("custom_domain", { length: 253 }),
    name: varchar("name", { length: 255 }).notNull(),
    mode: storeModeEnum("mode").notNull().default("WEBSHOP"),
    plan: varchar("plan", { length: 50 }).notNull().default("starter"),
    isActive: boolean("is_active").notNull().default(true),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("store_accounts_slug_idx").on(t.slug),
    customDomainIdx: uniqueIndex("store_accounts_custom_domain_idx")
      .on(t.customDomain)
      .where(sql`${t.customDomain} IS NOT NULL`),
    activeIdx: index("store_accounts_active_idx").on(t.isActive),
  }),
);

export type StoreAccount = typeof storeAccounts.$inferSelect;
export type NewStoreAccount = typeof storeAccounts.$inferInsert;
