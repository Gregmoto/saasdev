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
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { storeAccounts } from "./store-accounts.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const shippingMethodTypeEnum = pgEnum("shipping_method_type", [
  "standard",
  "express",
  "overnight",
  "click_collect",
  "free",
]);

export const shippingRateTypeEnum = pgEnum("shipping_rate_type", [
  "flat",
  "weight_based",
  "price_based",
]);

// ── shipping_zones ─────────────────────────────────────────────────────────────

export const shippingZones = pgTable(
  "shipping_zones",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("shipping_zones_store_account_id_idx").on(t.storeAccountId),
    isDefaultIdx: index("shipping_zones_is_default_idx").on(t.isDefault),
  }),
);

// ── shipping_zone_countries ────────────────────────────────────────────────────

export const shippingZoneCountries = pgTable(
  "shipping_zone_countries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
  },
  (t) => ({
    zoneCountryUniq: uniqueIndex("shipping_zone_countries_zone_country_idx").on(t.zoneId, t.countryCode),
    zoneIdx: index("shipping_zone_countries_zone_id_idx").on(t.zoneId),
    countryCodeIdx: index("shipping_zone_countries_country_code_idx").on(t.countryCode),
  }),
);

// ── shipping_profiles ──────────────────────────────────────────────────────────

export const shippingProfiles = pgTable(
  "shipping_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id")
      .notNull()
      .references(() => storeAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("shipping_profiles_store_account_id_idx").on(t.storeAccountId),
    isDefaultIdx: index("shipping_profiles_is_default_idx").on(t.isDefault),
  }),
);

// ── shipping_profile_zones ─────────────────────────────────────────────────────

export const shippingProfileZones = pgTable(
  "shipping_profile_zones",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => shippingProfiles.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
  },
  (t) => ({
    profileZoneUniq: uniqueIndex("shipping_profile_zones_profile_zone_idx").on(t.profileId, t.zoneId),
  }),
);

// ── shipping_methods (new, richer version) ─────────────────────────────────────
// Note: carts.ts has a simpler `shippingMethods` table used for legacy checkout.
// This table is the full shipping configuration model per profile+zone.

export const shippingZoneMethods = pgTable(
  "shipping_zone_methods",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => shippingProfiles.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZones.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: shippingMethodTypeEnum("type").notNull().default("standard"),
    carrier: varchar("carrier", { length: 100 }),
    estimatedDaysMin: integer("estimated_days_min"),
    estimatedDaysMax: integer("estimated_days_max"),
    rateType: shippingRateTypeEnum("rate_type").notNull().default("flat"),
    flatPriceCents: integer("flat_price_cents").notNull().default(0),
    freeAboveCents: integer("free_above_cents"),
    maxWeightGrams: integer("max_weight_grams"),
    isActive: boolean("is_active").notNull().default(true),
    requiresAddress: boolean("requires_address").notNull().default(true),
    pickupLocationId: uuid("pickup_location_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("shipping_zone_methods_store_account_id_idx").on(t.storeAccountId),
    profileIdx: index("shipping_zone_methods_profile_id_idx").on(t.profileId),
    zoneIdx: index("shipping_zone_methods_zone_id_idx").on(t.zoneId),
    typeIdx: index("shipping_zone_methods_type_idx").on(t.type),
    isActiveIdx: index("shipping_zone_methods_is_active_idx").on(t.isActive),
  }),
);

// ── shipping_rates ─────────────────────────────────────────────────────────────

export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    methodId: uuid("method_id")
      .notNull()
      .references(() => shippingZoneMethods.id, { onDelete: "cascade" }),
    storeAccountId: uuid("store_account_id").notNull(),
    minWeightGrams: integer("min_weight_grams"),
    maxWeightGrams: integer("max_weight_grams"),
    minCartCents: integer("min_cart_cents"),
    maxCartCents: integer("max_cart_cents"),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    methodIdx: index("shipping_rates_method_id_idx").on(t.methodId),
    storeAccountIdx: index("shipping_rates_store_account_id_idx").on(t.storeAccountId),
  }),
);

// ── shop_shipping_profiles ─────────────────────────────────────────────────────

export const shopShippingProfiles = pgTable(
  "shop_shipping_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id").notNull(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => shippingProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeShopUniq: uniqueIndex("shop_shipping_profiles_store_shop_idx").on(t.storeAccountId, t.shopId),
  }),
);

// ── click_collect_locations ────────────────────────────────────────────────────

export const clickCollectLocations = pgTable(
  "click_collect_locations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    shopId: uuid("shop_id"),
    name: varchar("name", { length: 255 }).notNull(),
    address: jsonb("address").notNull().$type<Record<string, string>>(),
    openingHours: jsonb("opening_hours").$type<Record<string, string>>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("click_collect_locations_store_account_id_idx").on(t.storeAccountId),
    shopIdx: index("click_collect_locations_shop_id_idx").on(t.shopId),
    isActiveIdx: index("click_collect_locations_is_active_idx").on(t.isActive),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShippingZone = typeof shippingZones.$inferSelect;
export type ShippingProfile = typeof shippingProfiles.$inferSelect;
export type ShippingZoneMethod = typeof shippingZoneMethods.$inferSelect;
export type ShippingRate = typeof shippingRates.$inferSelect;
export type ShippingRateType = (typeof shippingRateTypeEnum.enumValues)[number];
export type ShippingMethodType = (typeof shippingMethodTypeEnum.enumValues)[number];
export type ClickCollectLocation = typeof clickCollectLocations.$inferSelect;
