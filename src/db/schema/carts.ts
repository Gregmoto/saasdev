import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const checkoutStatusEnum = pgEnum("checkout_status", [
  "pending",
  "address",
  "shipping",
  "payment",
  "confirmed",
  "expired",
  "abandoned",
]);

// ── carts ─────────────────────────────────────────────────────────────────────

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id").notNull(),
    // Either sessionId (anonymous) or userId (authenticated) is set — not both.
    sessionId: varchar("session_id", { length: 128 }),
    userId: uuid("user_id"),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    couponCode: varchar("coupon_code", { length: 100 }),
    discountCents: integer("discount_cents").notNull().default(0),
    notes: text("notes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("carts_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("carts_shop_id_idx").on(t.shopId),
    sessionIdx: index("carts_session_id_idx").on(t.sessionId),
    userIdx: index("carts_user_id_idx").on(t.userId),
    // Partial unique: at most one anonymous cart per (store, shop, session).
    storeShopSessionUniq: uniqueIndex("carts_store_shop_session_idx")
      .on(t.storeAccountId, t.shopId, t.sessionId)
      .where(sql`session_id IS NOT NULL`),
    // Partial unique: at most one authenticated cart per (store, shop, user).
    storeShopUserUniq: uniqueIndex("carts_store_shop_user_idx")
      .on(t.storeAccountId, t.shopId, t.userId)
      .where(sql`user_id IS NOT NULL`),
  }),
);

// ── cart_items ────────────────────────────────────────────────────────────────

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    sku: varchar("sku", { length: 100 }),
    title: varchar("title", { length: 255 }).notNull(),
    variantTitle: varchar("variant_title", { length: 255 }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cartIdx: index("cart_items_cart_id_idx").on(t.cartId),
    storeAccountIdx: index("cart_items_store_account_id_idx").on(t.storeAccountId),
    // Partial unique: one row per (cart, variant) when variant is set.
    cartVariantUniq: uniqueIndex("cart_items_cart_variant_idx")
      .on(t.cartId, t.variantId)
      .where(sql`variant_id IS NOT NULL`),
  }),
);

// ── shipping_methods ──────────────────────────────────────────────────────────

export const shippingMethods = pgTable(
  "shipping_methods",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    // Null = applies to all shops in the store.
    shopId: uuid("shop_id"),
    name: varchar("name", { length: 255 }).notNull(),
    carrier: varchar("carrier", { length: 100 }),
    estimatedDays: integer("estimated_days"),
    priceCents: integer("price_cents").notNull().default(0),
    // Free shipping when cart total (before shipping) exceeds this threshold.
    freeAboveCents: integer("free_above_cents"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("shipping_methods_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("shipping_methods_shop_id_idx").on(t.shopId),
    isActiveIdx: index("shipping_methods_is_active_idx").on(t.isActive),
  }),
);

// ── checkout_sessions ─────────────────────────────────────────────────────────

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id").notNull(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    // Set after the order is created from this checkout.
    orderId: uuid("order_id"),
    status: checkoutStatusEnum("status").notNull().default("pending"),
    email: varchar("email", { length: 255 }),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    billingAddress: jsonb("billing_address").$type<Record<string, unknown>>(),
    selectedShippingMethodId: uuid("selected_shipping_method_id"),
    shippingCents: integer("shipping_cents").notNull().default(0),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    // Array of inventory_reservation UUIDs held during this checkout.
    reservationIds: jsonb("reservation_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("checkout_sessions_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("checkout_sessions_shop_id_idx").on(t.shopId),
    cartIdx: index("checkout_sessions_cart_id_idx").on(t.cartId),
    orderIdx: index("checkout_sessions_order_id_idx").on(t.orderId),
    statusIdx: index("checkout_sessions_status_idx").on(t.status),
    expiresAtIdx: index("checkout_sessions_expires_at_idx").on(t.expiresAt),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type CheckoutStatus = (typeof checkoutStatusEnum.enumValues)[number];
