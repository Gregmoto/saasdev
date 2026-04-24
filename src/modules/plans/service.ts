import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  plans,
  storeAccountPlans,
  featureFlags,
} from "../../db/schema/index.js";
import type { PlanLimits, PlanFeatures } from "../../db/schema/plans.js";

// ── Effective limits for a store ──────────────────────────────────────────────

/**
 * Resolves the effective plan limits for a store account.
 *
 * Resolution order (later wins):
 *   1. Plan base limits
 *   2. Per-store limit overrides in store_account_plans.limit_overrides
 *
 * Returns null values for any dimension that is unlimited.
 * Returns "no plan" defaults (very restrictive) if the store has no assigned plan.
 */
export async function getEffectiveLimits(
  db: Db,
  storeAccountId: string,
): Promise<PlanLimits> {
  const [row] = await db
    .select({
      limits: plans.limits,
      limitOverrides: storeAccountPlans.limitOverrides,
    })
    .from(storeAccountPlans)
    .innerJoin(plans, eq(storeAccountPlans.planId, plans.id))
    .where(eq(storeAccountPlans.storeAccountId, storeAccountId))
    .limit(1);

  const base: PlanLimits = row?.limits ?? noLimits();
  const overrides: Partial<PlanLimits> = row?.limitOverrides ?? {};

  return { ...base, ...overrides } as PlanLimits;
}

/**
 * Resolves the effective feature set for a store account.
 * Returns the plan's feature gates (feature_flags table overrides are separate).
 */
export async function getEffectiveFeatures(
  db: Db,
  storeAccountId: string,
): Promise<PlanFeatures> {
  const [row] = await db
    .select({ features: plans.features })
    .from(storeAccountPlans)
    .innerJoin(plans, eq(storeAccountPlans.planId, plans.id))
    .where(eq(storeAccountPlans.storeAccountId, storeAccountId))
    .limit(1);

  return row?.features ?? defaultFeatures();
}

/**
 * Checks whether a store would violate a limit if one more entity were added.
 *
 * @param limitKey  - which dimension to check (e.g. "maxProducts")
 * @param currentCount - current usage count
 * @throws PlanLimitError (statusCode 402) if the limit would be exceeded
 */
export async function enforcePlanLimit(
  db: Db,
  storeAccountId: string,
  limitKey: keyof PlanLimits,
  currentCount: number,
): Promise<void> {
  const limits = await getEffectiveLimits(db, storeAccountId);
  const cap = limits[limitKey];
  if (cap === null || cap === undefined) return; // unlimited

  if (currentCount >= cap) {
    const label = limitLabels[limitKey] ?? limitKey;
    throw Object.assign(
      new Error(
        `You have reached the ${label} limit (${cap}) for your current plan. ` +
        "Please upgrade your plan to add more.",
      ),
      { statusCode: 402, limitKey, cap, current: currentCount },
    );
  }
}

// ── Feature flags ─────────────────────────────────────────────────────────────

/**
 * Returns all feature flags for a store as a key→enabled map.
 * Per-store flags override plan-level features.
 */
export async function getFeatureFlags(
  db: Db,
  storeAccountId: string,
): Promise<Record<string, boolean>> {
  const rows = await db
    .select({ key: featureFlags.key, enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.storeAccountId, storeAccountId));

  return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
}

/**
 * Returns true if the feature is enabled for the store.
 * Checks feature_flags table first; falls back to plan-level feature gate.
 */
export async function isFeatureEnabled(
  db: Db,
  storeAccountId: string,
  key: string,
): Promise<boolean> {
  // Per-store override takes precedence.
  const [flagRow] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(
      and(
        eq(featureFlags.storeAccountId, storeAccountId),
        eq(featureFlags.key, key),
      ),
    )
    .limit(1);

  if (flagRow !== undefined) return flagRow.enabled;

  // Fall back to plan features.
  const features = await getEffectiveFeatures(db, storeAccountId);
  return (features as unknown as Record<string, boolean>)[key] ?? false;
}

/**
 * Set or upsert a feature flag for a store.
 * Throws if the key is longer than 100 chars.
 */
export async function setFeatureFlag(
  db: Db,
  storeAccountId: string,
  key: string,
  enabled: boolean,
): Promise<void> {
  if (key.length > 100) throw new Error("Feature flag key must be ≤ 100 characters");

  await db
    .insert(featureFlags)
    .values({ storeAccountId, key, enabled })
    .onConflictDoUpdate({
      target: [featureFlags.storeAccountId, featureFlags.key],
      set: { enabled, updatedAt: new Date() },
    });
}

export async function deleteFeatureFlag(
  db: Db,
  storeAccountId: string,
  key: string,
): Promise<boolean> {
  const rows = await db
    .delete(featureFlags)
    .where(
      and(
        eq(featureFlags.storeAccountId, storeAccountId),
        eq(featureFlags.key, key),
      ),
    )
    .returning({ id: featureFlags.id });
  return rows.length > 0;
}

// ── Plan catalog (read-only for store accounts) ───────────────────────────────

export async function listPublicPlans(db: Db) {
  return db
    .select()
    .from(plans)
    .where(and(eq(plans.isActive, true), eq(plans.isPublic, true)))
    .orderBy(plans.sortOrder);
}

export async function getStorePlan(db: Db, storeAccountId: string) {
  const [row] = await db
    .select({
      plan: plans,
      assignment: storeAccountPlans,
    })
    .from(storeAccountPlans)
    .innerJoin(plans, eq(storeAccountPlans.planId, plans.id))
    .where(eq(storeAccountPlans.storeAccountId, storeAccountId))
    .limit(1);

  return row ?? null;
}

// ── Platform Admin: plan management ──────────────────────────────────────────

export interface CreatePlanOpts {
  slug: string;
  name: string;
  description?: string;
  monthlyPriceCents?: number;
  limits: PlanLimits;
  features: PlanFeatures;
  sortOrder?: number;
  isPublic?: boolean;
}

export async function createPlan(db: Db, opts: CreatePlanOpts) {
  const [plan] = await db
    .insert(plans)
    .values({
      slug: opts.slug,
      name: opts.name,
      description: opts.description ?? null,
      monthlyPriceCents: opts.monthlyPriceCents ?? null,
      limits: opts.limits,
      features: opts.features,
      sortOrder: opts.sortOrder ?? 0,
      isPublic: opts.isPublic ?? true,
    })
    .returning();
  if (!plan) throw new Error("Failed to create plan");
  return plan;
}

export interface UpdatePlanOpts {
  name?: string;
  description?: string | null;
  monthlyPriceCents?: number | null;
  limits?: PlanLimits;
  features?: PlanFeatures;
  sortOrder?: number;
  isPublic?: boolean;
  isActive?: boolean;
}

export async function updatePlan(db: Db, planId: string, opts: UpdatePlanOpts) {
  const [updated] = await db
    .update(plans)
    .set({ ...opts, updatedAt: new Date() })
    .where(eq(plans.id, planId))
    .returning();
  if (!updated) throw Object.assign(new Error("Plan not found"), { statusCode: 404 });
  return updated;
}

export async function listAllPlans(db: Db) {
  return db.select().from(plans).orderBy(plans.sortOrder);
}

/**
 * Assign or change the plan for a store account.
 * Uses INSERT … ON CONFLICT to upsert (one plan per store enforced by unique index).
 */
export async function assignPlanToStore(
  db: Db,
  storeAccountId: string,
  planId: string,
  limitOverrides?: Partial<PlanLimits>,
): Promise<void> {
  await db
    .insert(storeAccountPlans)
    .values({
      storeAccountId,
      planId,
      limitOverrides: limitOverrides ?? null,
      startedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [storeAccountPlans.storeAccountId],
      set: {
        planId,
        limitOverrides: (limitOverrides ?? null) as Partial<PlanLimits> | null,
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function updateStorePlanOverrides(
  db: Db,
  storeAccountId: string,
  limitOverrides: Partial<PlanLimits> | null,
): Promise<void> {
  await db
    .update(storeAccountPlans)
    .set({ limitOverrides: limitOverrides as Partial<PlanLimits> | null, updatedAt: new Date() })
    .where(eq(storeAccountPlans.storeAccountId, storeAccountId));
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Default limits for stores with no plan assigned — very restrictive. */
function noLimits(): PlanLimits {
  return {
    maxProducts: 10,
    maxOrders: 50,
    maxUsers: 1,
    maxStorefronts: 1,
    maxWarehouses: 1,
    maxMarkets: 1,
    apiRequestsPerDay: 100,
    storageGb: 1,
  };
}

function defaultFeatures(): PlanFeatures {
  return {
    multiShop: false,
    marketplace: false,
    resellerPanel: false,
    customDomains: false,
    advancedAnalytics: false,
    prioritySupport: false,
    apiAccess: false,
    webhooks: false,
    bulkImport: false,
  };
}

const limitLabels: Record<keyof PlanLimits, string> = {
  maxProducts: "product",
  maxOrders: "monthly order",
  maxUsers: "team member",
  maxStorefronts: "storefront",
  maxWarehouses: "warehouse",
  maxMarkets: "market",
  apiRequestsPerDay: "daily API request",
  storageGb: "storage (GB)",
};
