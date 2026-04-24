import { eq, and, or, isNull, lte, gte, asc } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  shippingZones,
  shippingZoneCountries,
  shippingProfiles,
  shippingProfileZones,
  shippingZoneMethods,
  shippingRates,
  shopShippingProfiles,
  clickCollectLocations,
} from "../../db/schema/index.js";
import type { z } from "zod";
import type { methodSchema, rateSchema, clickCollectSchema } from "./schemas.js";

// ── Zone management ────────────────────────────────────────────────────────────

export async function listZones(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.storeAccountId, storeAccountId))
    .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.name));
}

export async function createZone(
  db: Db,
  storeAccountId: string,
  data: { name: string; isDefault: boolean; sortOrder: number },
) {
  const [created] = await db
    .insert(shippingZones)
    .values({ storeAccountId, name: data.name, isDefault: data.isDefault, sortOrder: data.sortOrder })
    .returning();
  if (!created) throw new Error("Failed to create shipping zone");
  return created;
}

export async function updateZone(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<{ name: string; isDefault: boolean; sortOrder: number }>,
) {
  const setValues: Partial<typeof shippingZones.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) setValues.name = data.name;
  if (data.isDefault !== undefined) setValues.isDefault = data.isDefault;
  if (data.sortOrder !== undefined) setValues.sortOrder = data.sortOrder;

  await db
    .update(shippingZones)
    .set(setValues)
    .where(and(eq(shippingZones.id, id), eq(shippingZones.storeAccountId, storeAccountId)));
}

export async function deleteZone(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(shippingZones)
    .where(and(eq(shippingZones.id, id), eq(shippingZones.storeAccountId, storeAccountId)));
}

export async function addCountryToZone(
  db: Db,
  zoneId: string,
  storeAccountId: string,
  countryCode: string,
) {
  // Verify zone belongs to storeAccount
  const [zone] = await db
    .select({ id: shippingZones.id })
    .from(shippingZones)
    .where(and(eq(shippingZones.id, zoneId), eq(shippingZones.storeAccountId, storeAccountId)))
    .limit(1);
  if (!zone) throw Object.assign(new Error("Zone not found"), { statusCode: 404 });

  const [created] = await db
    .insert(shippingZoneCountries)
    .values({ zoneId, countryCode: countryCode.toUpperCase() })
    .onConflictDoNothing()
    .returning();
  return created ?? null;
}

export async function removeCountryFromZone(db: Db, zoneId: string, countryCode: string) {
  await db
    .delete(shippingZoneCountries)
    .where(
      and(
        eq(shippingZoneCountries.zoneId, zoneId),
        eq(shippingZoneCountries.countryCode, countryCode.toUpperCase()),
      ),
    );
}

export async function listZoneCountries(db: Db, zoneId: string) {
  return db
    .select()
    .from(shippingZoneCountries)
    .where(eq(shippingZoneCountries.zoneId, zoneId))
    .orderBy(asc(shippingZoneCountries.countryCode));
}

// ── Profile management ─────────────────────────────────────────────────────────

export async function listProfiles(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(shippingProfiles)
    .where(eq(shippingProfiles.storeAccountId, storeAccountId))
    .orderBy(asc(shippingProfiles.name));
}

export async function createProfile(
  db: Db,
  storeAccountId: string,
  data: { name: string; isDefault: boolean },
) {
  const [created] = await db
    .insert(shippingProfiles)
    .values({ storeAccountId, name: data.name, isDefault: data.isDefault })
    .returning();
  if (!created) throw new Error("Failed to create shipping profile");
  return created;
}

export async function updateProfile(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<{ name: string; isDefault: boolean }>,
) {
  const setValues: Partial<typeof shippingProfiles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) setValues.name = data.name;
  if (data.isDefault !== undefined) setValues.isDefault = data.isDefault;

  await db
    .update(shippingProfiles)
    .set(setValues)
    .where(and(eq(shippingProfiles.id, id), eq(shippingProfiles.storeAccountId, storeAccountId)));
}

export async function deleteProfile(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(shippingProfiles)
    .where(and(eq(shippingProfiles.id, id), eq(shippingProfiles.storeAccountId, storeAccountId)));
}

export async function addZoneToProfile(db: Db, profileId: string, zoneId: string) {
  const [created] = await db
    .insert(shippingProfileZones)
    .values({ profileId, zoneId })
    .onConflictDoNothing()
    .returning();
  return created ?? null;
}

export async function removeZoneFromProfile(db: Db, profileId: string, zoneId: string) {
  await db
    .delete(shippingProfileZones)
    .where(
      and(
        eq(shippingProfileZones.profileId, profileId),
        eq(shippingProfileZones.zoneId, zoneId),
      ),
    );
}

export async function setShopProfile(
  db: Db,
  storeAccountId: string,
  shopId: string,
  profileId: string,
) {
  await db
    .insert(shopShippingProfiles)
    .values({ storeAccountId, shopId, profileId })
    .onConflictDoUpdate({
      target: [shopShippingProfiles.storeAccountId, shopShippingProfiles.shopId],
      set: { profileId },
    });
}

export async function getShopProfile(
  db: Db,
  storeAccountId: string,
  shopId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ profileId: shopShippingProfiles.profileId })
    .from(shopShippingProfiles)
    .where(
      and(
        eq(shopShippingProfiles.storeAccountId, storeAccountId),
        eq(shopShippingProfiles.shopId, shopId),
      ),
    )
    .limit(1);
  return row?.profileId ?? null;
}

export async function listShopProfiles(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(shopShippingProfiles)
    .where(eq(shopShippingProfiles.storeAccountId, storeAccountId));
}

// ── Method management ──────────────────────────────────────────────────────────

export async function listMethods(
  db: Db,
  storeAccountId: string,
  opts?: { profileId?: string; zoneId?: string; activeOnly?: boolean },
) {
  const conditions = [eq(shippingZoneMethods.storeAccountId, storeAccountId)];
  if (opts?.profileId !== undefined) conditions.push(eq(shippingZoneMethods.profileId, opts.profileId));
  if (opts?.zoneId !== undefined) conditions.push(eq(shippingZoneMethods.zoneId, opts.zoneId));
  if (opts?.activeOnly === true) conditions.push(eq(shippingZoneMethods.isActive, true));

  return db
    .select()
    .from(shippingZoneMethods)
    .where(and(...conditions))
    .orderBy(asc(shippingZoneMethods.sortOrder), asc(shippingZoneMethods.name));
}

export async function createMethod(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof methodSchema>,
) {
  const insertValues: typeof shippingZoneMethods.$inferInsert = {
    storeAccountId,
    profileId: data.profileId,
    zoneId: data.zoneId,
    name: data.name,
    type: data.type,
    rateType: data.rateType,
    flatPriceCents: data.flatPriceCents,
    isActive: data.isActive,
    requiresAddress: data.requiresAddress,
    sortOrder: data.sortOrder,
  };

  if (data.carrier !== undefined) insertValues.carrier = data.carrier;
  if (data.estimatedDaysMin !== undefined) insertValues.estimatedDaysMin = data.estimatedDaysMin;
  if (data.estimatedDaysMax !== undefined) insertValues.estimatedDaysMax = data.estimatedDaysMax;
  if (data.freeAboveCents !== undefined) insertValues.freeAboveCents = data.freeAboveCents;
  if (data.maxWeightGrams !== undefined) insertValues.maxWeightGrams = data.maxWeightGrams;
  if (data.pickupLocationId !== undefined) insertValues.pickupLocationId = data.pickupLocationId;

  const [created] = await db.insert(shippingZoneMethods).values(insertValues).returning();
  if (!created) throw new Error("Failed to create shipping method");
  return created;
}

export async function updateMethod(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<z.infer<typeof methodSchema>>,
) {
  const setValues: Partial<typeof shippingZoneMethods.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.profileId !== undefined) setValues.profileId = data.profileId;
  if (data.zoneId !== undefined) setValues.zoneId = data.zoneId;
  if (data.name !== undefined) setValues.name = data.name;
  if (data.type !== undefined) setValues.type = data.type;
  if (data.carrier !== undefined) setValues.carrier = data.carrier;
  if (data.estimatedDaysMin !== undefined) setValues.estimatedDaysMin = data.estimatedDaysMin;
  if (data.estimatedDaysMax !== undefined) setValues.estimatedDaysMax = data.estimatedDaysMax;
  if (data.rateType !== undefined) setValues.rateType = data.rateType;
  if (data.flatPriceCents !== undefined) setValues.flatPriceCents = data.flatPriceCents;
  if (data.freeAboveCents !== undefined) setValues.freeAboveCents = data.freeAboveCents;
  if (data.maxWeightGrams !== undefined) setValues.maxWeightGrams = data.maxWeightGrams;
  if (data.isActive !== undefined) setValues.isActive = data.isActive;
  if (data.requiresAddress !== undefined) setValues.requiresAddress = data.requiresAddress;
  if (data.pickupLocationId !== undefined) setValues.pickupLocationId = data.pickupLocationId;
  if (data.sortOrder !== undefined) setValues.sortOrder = data.sortOrder;

  await db
    .update(shippingZoneMethods)
    .set(setValues)
    .where(
      and(eq(shippingZoneMethods.id, id), eq(shippingZoneMethods.storeAccountId, storeAccountId)),
    );
}

export async function deleteMethod(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(shippingZoneMethods)
    .where(
      and(eq(shippingZoneMethods.id, id), eq(shippingZoneMethods.storeAccountId, storeAccountId)),
    );
}

// ── Rate management ────────────────────────────────────────────────────────────

export async function listRates(db: Db, methodId: string) {
  return db
    .select()
    .from(shippingRates)
    .where(eq(shippingRates.methodId, methodId))
    .orderBy(asc(shippingRates.minWeightGrams), asc(shippingRates.minCartCents));
}

export async function createRate(
  db: Db,
  methodId: string,
  storeAccountId: string,
  data: z.infer<typeof rateSchema>,
) {
  const insertValues: typeof shippingRates.$inferInsert = {
    methodId,
    storeAccountId,
    priceCents: data.priceCents,
  };

  if (data.minWeightGrams !== undefined) insertValues.minWeightGrams = data.minWeightGrams;
  if (data.maxWeightGrams !== undefined) insertValues.maxWeightGrams = data.maxWeightGrams;
  if (data.minCartCents !== undefined) insertValues.minCartCents = data.minCartCents;
  if (data.maxCartCents !== undefined) insertValues.maxCartCents = data.maxCartCents;

  const [created] = await db.insert(shippingRates).values(insertValues).returning();
  if (!created) throw new Error("Failed to create shipping rate");
  return created;
}

export async function deleteRate(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(shippingRates)
    .where(
      and(eq(shippingRates.id, id), eq(shippingRates.storeAccountId, storeAccountId)),
    );
}

// ── Click & Collect locations ──────────────────────────────────────────────────

export async function listLocations(db: Db, storeAccountId: string, shopId?: string) {
  const conditions = [eq(clickCollectLocations.storeAccountId, storeAccountId)];
  if (shopId !== undefined) conditions.push(eq(clickCollectLocations.shopId, shopId));

  return db
    .select()
    .from(clickCollectLocations)
    .where(and(...conditions))
    .orderBy(asc(clickCollectLocations.name));
}

export async function createLocation(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof clickCollectSchema>,
) {
  const insertValues: typeof clickCollectLocations.$inferInsert = {
    storeAccountId,
    name: data.name,
    address: data.address as Record<string, string>,
    isActive: data.isActive,
  };

  if (data.shopId !== undefined) insertValues.shopId = data.shopId;
  if (data.openingHours !== undefined) insertValues.openingHours = data.openingHours;

  const [created] = await db.insert(clickCollectLocations).values(insertValues).returning();
  if (!created) throw new Error("Failed to create click & collect location");
  return created;
}

export async function updateLocation(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<z.infer<typeof clickCollectSchema>>,
) {
  const setValues: Partial<typeof clickCollectLocations.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.shopId !== undefined) setValues.shopId = data.shopId;
  if (data.name !== undefined) setValues.name = data.name;
  if (data.address !== undefined) setValues.address = data.address as Record<string, string>;
  if (data.openingHours !== undefined) setValues.openingHours = data.openingHours;
  if (data.isActive !== undefined) setValues.isActive = data.isActive;

  await db
    .update(clickCollectLocations)
    .set(setValues)
    .where(
      and(
        eq(clickCollectLocations.id, id),
        eq(clickCollectLocations.storeAccountId, storeAccountId),
      ),
    );
}

export async function deleteLocation(db: Db, id: string, storeAccountId: string) {
  await db
    .delete(clickCollectLocations)
    .where(
      and(
        eq(clickCollectLocations.id, id),
        eq(clickCollectLocations.storeAccountId, storeAccountId),
      ),
    );
}

// ── Rate resolution ────────────────────────────────────────────────────────────

export interface ResolvedShippingOption {
  methodId: string;
  name: string;
  type: string;
  carrier: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  priceCents: number;
  isFree: boolean;
  requiresAddress: boolean;
  pickupLocationId: string | null;
}

export async function resolveShippingRates(
  db: Db,
  storeAccountId: string,
  opts: {
    cartSubtotalCents: number;
    totalWeightGrams?: number;
    destinationCountry: string;
    shopId?: string;
  },
): Promise<ResolvedShippingOption[]> {
  const { cartSubtotalCents, totalWeightGrams, destinationCountry, shopId } = opts;

  // 1. Find the active profile for this shop (check shopShippingProfiles first; fall back to default)
  let profileId: string | null = null;

  if (shopId !== undefined) {
    profileId = await getShopProfile(db, storeAccountId, shopId);
  }

  if (profileId === null) {
    // Fall back to default profile
    const [defaultProfile] = await db
      .select({ id: shippingProfiles.id })
      .from(shippingProfiles)
      .where(
        and(
          eq(shippingProfiles.storeAccountId, storeAccountId),
          eq(shippingProfiles.isDefault, true),
        ),
      )
      .limit(1);
    profileId = defaultProfile?.id ?? null;
  }

  if (profileId === null) {
    return [];
  }

  // 2. Find zones containing the destination country (exact match first, then default fallback)
  const exactCountryZones = await db
    .select({ zoneId: shippingZoneCountries.zoneId })
    .from(shippingZoneCountries)
    .where(eq(shippingZoneCountries.countryCode, destinationCountry.toUpperCase()));

  const exactZoneIds = exactCountryZones.map((r) => r.zoneId);

  let zoneIds: string[] = exactZoneIds;

  if (zoneIds.length === 0) {
    // Fallback: use default zone
    const [defaultZone] = await db
      .select({ id: shippingZones.id })
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.storeAccountId, storeAccountId),
          eq(shippingZones.isDefault, true),
        ),
      )
      .limit(1);
    if (defaultZone) {
      zoneIds = [defaultZone.id];
    }
  }

  if (zoneIds.length === 0) {
    return [];
  }

  // 3. Find active methods in that profile+zone combination
  // Get zones that are both in profile and in our resolved zoneIds
  const profileZoneRows = await db
    .select({ zoneId: shippingProfileZones.zoneId })
    .from(shippingProfileZones)
    .where(eq(shippingProfileZones.profileId, profileId));

  const profileZoneIds = profileZoneRows.map((r) => r.zoneId);
  const eligibleZoneIds = zoneIds.filter((zid) => profileZoneIds.includes(zid));

  if (eligibleZoneIds.length === 0) {
    return [];
  }

  // Fetch active methods for profile + eligible zones
  const methodConditions = [
    eq(shippingZoneMethods.storeAccountId, storeAccountId),
    eq(shippingZoneMethods.profileId, profileId),
    eq(shippingZoneMethods.isActive, true),
    or(...eligibleZoneIds.map((zid) => eq(shippingZoneMethods.zoneId, zid))),
  ];

  const methods = await db
    .select()
    .from(shippingZoneMethods)
    .where(and(...methodConditions))
    .orderBy(asc(shippingZoneMethods.sortOrder));

  // 4. Resolve price for each method
  const resolved: ResolvedShippingOption[] = [];

  for (const method of methods) {
    let priceCents = method.flatPriceCents;
    let isFree = false;

    // a. Free above threshold
    if (method.freeAboveCents !== null && cartSubtotalCents >= method.freeAboveCents) {
      priceCents = 0;
      isFree = true;
    } else if (method.rateType === "flat") {
      // b. Flat rate
      priceCents = method.flatPriceCents;
    } else if (method.rateType === "weight_based") {
      // c. Weight-based
      const weightGrams = totalWeightGrams ?? 0;
      const [rate] = await db
        .select()
        .from(shippingRates)
        .where(
          and(
            eq(shippingRates.methodId, method.id),
            or(isNull(shippingRates.minWeightGrams), lte(shippingRates.minWeightGrams, weightGrams)),
            or(isNull(shippingRates.maxWeightGrams), gte(shippingRates.maxWeightGrams, weightGrams)),
          ),
        )
        .orderBy(asc(shippingRates.minWeightGrams))
        .limit(1);
      priceCents = rate?.priceCents ?? method.flatPriceCents;
    } else if (method.rateType === "price_based") {
      // d. Price-based
      const [rate] = await db
        .select()
        .from(shippingRates)
        .where(
          and(
            eq(shippingRates.methodId, method.id),
            or(isNull(shippingRates.minCartCents), lte(shippingRates.minCartCents, cartSubtotalCents)),
            or(isNull(shippingRates.maxCartCents), gte(shippingRates.maxCartCents, cartSubtotalCents)),
          ),
        )
        .orderBy(asc(shippingRates.minCartCents))
        .limit(1);
      priceCents = rate?.priceCents ?? method.flatPriceCents;
    }

    resolved.push({
      methodId: method.id,
      name: method.name,
      type: method.type,
      carrier: method.carrier ?? null,
      estimatedDaysMin: method.estimatedDaysMin ?? null,
      estimatedDaysMax: method.estimatedDaysMax ?? null,
      priceCents,
      isFree,
      requiresAddress: method.requiresAddress,
      pickupLocationId: method.pickupLocationId ?? null,
    });
  }

  // 5. Sort by priceCents ASC
  resolved.sort((a, b) => a.priceCents - b.priceCents);

  return resolved;
}
