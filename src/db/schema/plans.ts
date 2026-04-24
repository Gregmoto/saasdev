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

// ── Plan limits shape ─────────────────────────────────────────────────────────
// null = unlimited for that dimension.

export interface PlanLimits {
  maxProducts: number | null;
  maxOrders: number | null;           // per-month rolling window
  maxUsers: number | null;            // store members
  maxStorefronts: number | null;
  maxWarehouses: number | null;
  maxMarkets: number | null;
  apiRequestsPerDay: number | null;
  storageGb: number | null;
}

// ── Plan features (capability gates) ─────────────────────────────────────────

export interface PlanFeatures {
  multiShop: boolean;
  marketplace: boolean;
  resellerPanel: boolean;
  customDomains: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  bulkImport: boolean;
}

// ── plans ─────────────────────────────────────────────────────────────────────
// Named plan tiers managed by Platform Super Admin.

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 63 }).notNull(), // e.g. "starter", "growth", "enterprise"
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Pricing — null means custom/contact-sales.
    monthlyPriceCents: integer("monthly_price_cents"),

    // Capability gates for this plan tier.
    limits: jsonb("limits")
      .$type<PlanLimits>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    features: jsonb("features")
      .$type<PlanFeatures>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Display order in pricing pages (lower = first).
    sortOrder: integer("sort_order").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("plans_slug_idx").on(t.slug),
    activeIdx: index("plans_active_idx").on(t.isActive),
  }),
);

// ── store_account_plans ───────────────────────────────────────────────────────
// One active plan per Store Account. Limit overrides let Platform Admins
// give a store custom quotas without changing the base plan.

export const storeAccountPlans = pgTable(
  "store_account_plans",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Per-store overrides — merged on top of the plan's base limits.
    // A null value for any key means "use the plan default for this key".
    limitOverrides: jsonb("limit_overrides").$type<Partial<PlanLimits>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Enforce one-plan-per-store at the DB level.
    storeIdx: uniqueIndex("store_account_plans_store_id_idx").on(t.storeAccountId),
    planIdx: index("store_account_plans_plan_id_idx").on(t.planId),
  }),
);

// ── feature_flags ─────────────────────────────────────────────────────────────
// Per-store boolean flags that override plan-level feature gates.
// Use to: enable beta features, grant exceptions, or disable capabilities.

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One flag entry per key per store.
    uniqueKeyIdx: uniqueIndex("feature_flags_store_key_idx").on(t.storeAccountId, t.key),
    storeIdx: index("feature_flags_store_id_idx").on(t.storeAccountId),
  }),
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type StoreAccountPlan = typeof storeAccountPlans.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
