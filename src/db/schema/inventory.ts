import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const warehouseTypeEnum = pgEnum("warehouse_type", [
  "internal",
  "external",
]);

export const inventoryReasonEnum = pgEnum("inventory_reason", [
  "sale",
  "return",
  "adjustment",
  "incoming",
  "transfer_in",
  "transfer_out",
  "damage",
  "initial",
]);

// ── warehouses ─────────────────────────────────────────────────────────────────

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: warehouseTypeEnum("type").notNull().default("internal"),
    // Structured address: { street, city, zip, country, ... }
    address: jsonb("address").$type<Record<string, string>>(),
    // Lower number = higher priority for checkout routing.
    priority: integer("priority").notNull().default(0),
    // Whether stock from this warehouse is offered at checkout.
    isEnabledForCheckout: boolean("is_enabled_for_checkout").notNull().default(true),
    // Typical shipping lead time from this warehouse (days).
    leadTimeDays: integer("lead_time_days").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("warehouses_store_account_id_idx").on(t.storeAccountId),
    priorityIdx: index("warehouses_priority_idx").on(t.priority),
  }),
);

// ── inventory_levels ───────────────────────────────────────────────────────────
//
// Current on-hand stock snapshot per (warehouse, SKU).
// Qty fields:
//   qty_available — can be sold (committed to no order yet)
//   qty_reserved  — allocated to confirmed/processing orders, not yet shipped
//   qty_incoming  — on purchase orders, not yet received
//
// On-hand = qty_available + qty_reserved
// Sellable = qty_available

export const inventoryLevels = pgTable(
  "inventory_levels",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    // SKU is the inventory tracking key. Matches product_variants.sku.
    sku: varchar("sku", { length: 100 }).notNull(),
    qtyAvailable: integer("qty_available").notNull().default(0),
    qtyReserved: integer("qty_reserved").notNull().default(0),
    qtyIncoming: integer("qty_incoming").notNull().default(0),
    // Denormalised for quick lookup without joining to products.
    variantId: uuid("variant_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One row per (warehouse, SKU) — the upsert key.
    uniqueWarehouseSku: uniqueIndex("inventory_levels_warehouse_sku_idx").on(
      t.warehouseId,
      t.sku,
    ),
    warehouseIdx: index("inventory_levels_warehouse_id_idx").on(t.warehouseId),
    skuIdx: index("inventory_levels_sku_idx").on(t.sku),
    storeAccountIdx: index("inventory_levels_store_account_id_idx").on(t.storeAccountId),
    variantIdx: index("inventory_levels_variant_id_idx").on(t.variantId),
  }),
);

// ── inventory_events ───────────────────────────────────────────────────────────
//
// Immutable ledger of every inventory movement. Positive delta = stock in,
// negative delta = stock out. The events table is append-only — never updated.

export const inventoryEvents = pgTable(
  "inventory_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    variantId: uuid("variant_id"),
    // Positive = stock added; negative = stock removed.
    delta: integer("delta").notNull(),
    reason: inventoryReasonEnum("reason").notNull(),
    // What triggered this event (e.g. "order", "rma", "purchase_order").
    referenceType: varchar("reference_type", { length: 60 }),
    // The UUID of the triggering document.
    referenceId: uuid("reference_id"),
    // The user or system actor that created this event.
    createdBy: uuid("created_by"),
    // Snapshot of qty_available after this event was applied.
    qtyAfter: integer("qty_after"),
    notes: varchar("notes", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    warehouseIdx: index("inventory_events_warehouse_id_idx").on(t.warehouseId),
    skuIdx: index("inventory_events_sku_idx").on(t.sku),
    storeAccountIdx: index("inventory_events_store_account_id_idx").on(t.storeAccountId),
    referenceIdx: index("inventory_events_reference_idx").on(t.referenceType, t.referenceId),
    createdAtIdx: index("inventory_events_created_at_idx").on(t.createdAt),
  }),
);

// ── Enums: reservation + config ───────────────────────────────────────────────

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "committed",
  "released",
  "cancelled",
]);

export const allocationStrategyEnum = pgEnum("allocation_strategy", [
  "priority",
  "lowest_lead_time",
  "manual",
]);

export const commitTriggerEnum = pgEnum("commit_trigger", [
  "payment",
  "fulfillment",
]);

// ── inventory_reservations ─────────────────────────────────────────────────────
//
// One row per (order, warehouse, SKU) allocation.
// Split reservations are represented by multiple rows (e.g. split across two
// warehouses to satisfy qty).  On commit/release every row for the order is
// updated atomically.

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    // Plain uuid — FK to orders.id in migration SQL.
    orderId: uuid("order_id").notNull(),
    // Plain uuid — FK to shops.id in migration SQL (nullable).
    shopId: uuid("shop_id"),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    variantId: uuid("variant_id"),
    qtyReserved: integer("qty_reserved").notNull(),
    status: reservationStatusEnum("status").notNull().default("pending"),
    allocationStrategy: allocationStrategyEnum("allocation_strategy")
      .notNull()
      .default("priority"),
    // When the reservation automatically expires if not committed (null = no expiry).
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("inventory_reservations_store_account_id_idx").on(t.storeAccountId),
    orderIdx: index("inventory_reservations_order_id_idx").on(t.orderId),
    warehouseIdx: index("inventory_reservations_warehouse_id_idx").on(t.warehouseId),
    statusIdx: index("inventory_reservations_status_idx").on(t.status),
    skuIdx: index("inventory_reservations_sku_idx").on(t.sku),
    // For expiry sweep: find pending reservations that have timed out.
    expiresAtIdx: index("inventory_reservations_expires_at_idx").on(t.expiresAt),
  }),
);

// ── store_inventory_config ────────────────────────────────────────────────────
//
// Per-store configuration for the reservation + allocation system.
// One row per store account (upserted, not created per-user).

export const storeInventoryConfig = pgTable(
  "store_inventory_config",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    // When to commit (finalise) a reservation: on payment or on fulfillment.
    commitTrigger: commitTriggerEnum("commit_trigger").notNull().default("payment"),
    // Default allocation strategy for this store.
    allocationStrategy: allocationStrategyEnum("allocation_strategy")
      .notNull()
      .default("priority"),
    // Minutes after which a pending reservation expires automatically. 0 = no expiry.
    reservationTimeoutMinutes: integer("reservation_timeout_minutes").notNull().default(30),
    // Whether to run the automatic expiry sweep for this store.
    autoExpire: boolean("auto_expire").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountUnique: uniqueIndex("store_inventory_config_store_account_id_idx").on(
      t.storeAccountId,
    ),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Warehouse = typeof warehouses.$inferSelect;
export type InventoryLevel = typeof inventoryLevels.$inferSelect;
export type InventoryEvent = typeof inventoryEvents.$inferSelect;
export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type StoreInventoryConfig = typeof storeInventoryConfig.$inferSelect;
export type WarehouseType = (typeof warehouseTypeEnum.enumValues)[number];
export type InventoryReason = (typeof inventoryReasonEnum.enumValues)[number];
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];
export type AllocationStrategy = (typeof allocationStrategyEnum.enumValues)[number];
