import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── customers ─────────────────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    isActive: boolean("is_active").notNull().default(true),
    acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
    totalSpentCents: integer("total_spent_cents").notNull().default(0),
    ordersCount: integer("orders_count").notNull().default(0),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeEmailIdx: uniqueIndex("customers_store_email_idx").on(t.storeAccountId, t.email),
    storeAccountIdx: index("customers_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── customer_addresses ────────────────────────────────────────────────────────

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    type: varchar("type", { length: 20 }).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    company: varchar("company", { length: 255 }),
    address1: varchar("address1", { length: 255 }).notNull(),
    address2: varchar("address2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }),
    zip: varchar("zip", { length: 20 }),
    country: varchar("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    customerIdx: index("customer_addresses_customer_id_idx").on(t.customerId),
  }),
);

// ── customer_shops ────────────────────────────────────────────────────────────
//
// Per-shop analytics for each customer. One row per (customer, shop) pair.
// Maintained by the orders service whenever an order is created/cancelled.
//
// shopId is a plain uuid — FK to shops.id enforced in migration SQL.

export const customerShops = pgTable(
  "customer_shops",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    // Plain uuid — FK to shops.id in migration SQL.
    shopId: uuid("shop_id").notNull(),
    firstOrderAt: timestamp("first_order_at", { withTimezone: true }),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    ordersCount: integer("orders_count").notNull().default(0),
    totalSpentCents: integer("total_spent_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One row per customer per shop.
    uniqueCustomerShop: uniqueIndex("customer_shops_customer_shop_idx").on(
      t.customerId,
      t.shopId,
    ),
    customerIdx: index("customer_shops_customer_id_idx").on(t.customerId),
    shopIdx: index("customer_shops_shop_id_idx").on(t.shopId),
    storeAccountIdx: index("customer_shops_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Customer = typeof customers.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type CustomerShop = typeof customerShops.$inferSelect;
