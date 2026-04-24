import { eq, and, asc, desc, count, or, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  supplierSkuMappings,
  supplierReviewItems,
} from "../../db/schema/index.js";
import type {
  SupplierSkuMapping,
  SupplierReviewItem,
  ReviewItemStatus,
} from "../../db/schema/suppliers.js";

// ── SKU Mappings ──────────────────────────────────────────────────────────────

export async function listSkuMappings(
  db: Db,
  storeAccountId: string,
  feedId?: string,
): Promise<SupplierSkuMapping[]> {
  const conditions = [eq(supplierSkuMappings.storeAccountId, storeAccountId)];

  if (feedId !== undefined) {
    conditions.push(
      or(
        eq(supplierSkuMappings.feedId, feedId),
        isNull(supplierSkuMappings.feedId),
      )!,
    );
  }

  return db
    .select()
    .from(supplierSkuMappings)
    .where(and(...conditions))
    .orderBy(asc(supplierSkuMappings.supplierSku));
}

export async function createSkuMapping(
  db: Db,
  storeAccountId: string,
  data: {
    feedId?: string;
    supplierSku: string;
    internalSku: string;
    notes?: string;
  },
): Promise<SupplierSkuMapping> {
  const insert: typeof supplierSkuMappings.$inferInsert = {
    storeAccountId,
    supplierSku: data.supplierSku,
    internalSku: data.internalSku,
  };
  if (data.feedId !== undefined) insert.feedId = data.feedId;
  if (data.notes !== undefined) insert.notes = data.notes;

  try {
    const rows = await db
      .insert(supplierSkuMappings)
      .values(insert)
      .returning();
    return rows[0]!;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes("unique") || err.message.includes("duplicate"))
    ) {
      throw { statusCode: 409, message: "Mapping for this supplier SKU already exists" };
    }
    throw err;
  }
}

export async function updateSkuMapping(
  db: Db,
  mappingId: string,
  storeAccountId: string,
  data: { internalSku?: string; notes?: string },
): Promise<SupplierSkuMapping> {
  const set: Partial<typeof supplierSkuMappings.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.internalSku !== undefined) set.internalSku = data.internalSku;
  if (data.notes !== undefined) set.notes = data.notes;

  const rows = await db
    .update(supplierSkuMappings)
    .set(set)
    .where(
      and(
        eq(supplierSkuMappings.id, mappingId),
        eq(supplierSkuMappings.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (rows.length === 0) {
    throw { statusCode: 404, message: "SKU mapping not found" };
  }
  return rows[0]!;
}

export async function deleteSkuMapping(
  db: Db,
  mappingId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(supplierSkuMappings)
    .where(
      and(
        eq(supplierSkuMappings.id, mappingId),
        eq(supplierSkuMappings.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: supplierSkuMappings.id });
  return rows.length > 0;
}

/**
 * Resolves a supplier SKU to an internal SKU using the mappings table.
 * Checks feed-specific mapping first, then store-wide (feedId IS NULL).
 */
export async function resolveSkuMapping(
  db: Db,
  storeAccountId: string,
  feedId: string,
  supplierSku: string,
): Promise<string | null> {
  // Feed-specific match first (feedId = feedId), then store-wide (feedId IS NULL)
  const rows = await db
    .select({ internalSku: supplierSkuMappings.internalSku, feedId: supplierSkuMappings.feedId })
    .from(supplierSkuMappings)
    .where(
      and(
        eq(supplierSkuMappings.storeAccountId, storeAccountId),
        eq(supplierSkuMappings.supplierSku, supplierSku),
        or(
          eq(supplierSkuMappings.feedId, feedId),
          isNull(supplierSkuMappings.feedId),
        ),
      ),
    )
    // Feed-specific rows (non-null feedId) sort before store-wide (null feedId)
    .orderBy(asc(supplierSkuMappings.feedId))
    .limit(2);

  if (rows.length === 0) return null;

  // Prefer the row where feedId matches exactly over the store-wide (null) row
  const exact = rows.find((r) => r.feedId !== null);
  if (exact) return exact.internalSku;
  return rows[0]!.internalSku;
}

// ── Review queue ──────────────────────────────────────────────────────────────

export interface ReviewItemsPage {
  items: SupplierReviewItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listReviewItems(
  db: Db,
  storeAccountId: string,
  opts: {
    feedId?: string;
    status?: ReviewItemStatus;
    page: number;
    limit: number;
  },
): Promise<ReviewItemsPage> {
  const { page, limit } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(supplierReviewItems.storeAccountId, storeAccountId)];
  if (opts.feedId !== undefined) {
    conditions.push(eq(supplierReviewItems.feedId, opts.feedId));
  }
  if (opts.status !== undefined) {
    conditions.push(eq(supplierReviewItems.status, opts.status));
  }

  const where = and(...conditions);

  const [countResult, items] = await Promise.all([
    db
      .select({ total: count() })
      .from(supplierReviewItems)
      .where(where),
    db
      .select()
      .from(supplierReviewItems)
      .where(where)
      .orderBy(desc(supplierReviewItems.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;
  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReviewItem(
  db: Db,
  itemId: string,
  storeAccountId: string,
): Promise<SupplierReviewItem | null> {
  const rows = await db
    .select()
    .from(supplierReviewItems)
    .where(
      and(
        eq(supplierReviewItems.id, itemId),
        eq(supplierReviewItems.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Creates a review item from an unmatched feed row. Called inside the runner. */
export async function createReviewItem(
  db: Db,
  storeAccountId: string,
  data: {
    feedId: string;
    runId?: string;
    supplierSku?: string;
    supplierEan?: string;
    supplierQty?: number;
    supplierPrice?: number;
    rawData?: Record<string, string>;
  },
): Promise<SupplierReviewItem> {
  const insert: typeof supplierReviewItems.$inferInsert = {
    storeAccountId,
    feedId: data.feedId,
    status: "pending",
  };
  if (data.runId !== undefined) insert.runId = data.runId;
  if (data.supplierSku !== undefined) insert.supplierSku = data.supplierSku;
  if (data.supplierEan !== undefined) insert.supplierEan = data.supplierEan;
  if (data.supplierQty !== undefined) insert.supplierQty = data.supplierQty;
  if (data.supplierPrice !== undefined) {
    insert.supplierPrice = String(data.supplierPrice);
  }
  if (data.rawData !== undefined) insert.rawData = data.rawData;

  const rows = await db.insert(supplierReviewItems).values(insert).returning();
  return rows[0]!;
}

/** Admin resolves a review item: map to internal SKU or ignore. */
export async function resolveReviewItem(
  db: Db,
  itemId: string,
  storeAccountId: string,
  action: "map" | "ignore",
  data?: { internalSku?: string; notes?: string },
): Promise<SupplierReviewItem> {
  if (action === "map" && !data?.internalSku) {
    throw { statusCode: 422, message: "internalSku is required when action is 'map'" };
  }

  // Fetch the item first so we can access feedId and supplierSku for mapping creation
  const item = await getReviewItem(db, itemId, storeAccountId);
  if (!item) {
    throw { statusCode: 404, message: "Review item not found" };
  }

  const set: Partial<typeof supplierReviewItems.$inferInsert> = {
    status: action === "map" ? "mapped" : "ignored",
    resolvedAt: new Date(),
    updatedAt: new Date(),
  };
  if (data?.notes !== undefined) set.resolutionNotes = data.notes;
  if (action === "map" && data?.internalSku !== undefined) {
    set.mappedInternalSku = data.internalSku;
  }

  const rows = await db
    .update(supplierReviewItems)
    .set(set)
    .where(
      and(
        eq(supplierReviewItems.id, itemId),
        eq(supplierReviewItems.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Review item not found" };
  }

  const resolved = rows[0]!;

  // If mapping: also persist SKU mapping for future runs
  if (action === "map" && data?.internalSku && item.supplierSku) {
    await createSkuMapping(db, storeAccountId, {
      feedId: item.feedId,
      supplierSku: item.supplierSku,
      internalSku: data.internalSku,
      ...(data.notes !== undefined && { notes: data.notes }),
    }).catch((err: unknown) => {
      // Mapping may already exist (409); log but don't fail the resolve
      console.warn("resolveReviewItem: could not create SKU mapping:", err);
    });
  }

  return resolved;
}

/** Count pending review items for a feed (used in feed summary stats). */
export async function countPendingReviewItems(
  db: Db,
  storeAccountId: string,
  feedId: string,
): Promise<number> {
  const result = await db
    .select({ total: count() })
    .from(supplierReviewItems)
    .where(
      and(
        eq(supplierReviewItems.storeAccountId, storeAccountId),
        eq(supplierReviewItems.feedId, feedId),
        eq(supplierReviewItems.status, "pending"),
      ),
    );
  return result[0]?.total ?? 0;
}
