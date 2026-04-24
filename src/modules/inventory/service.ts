import { eq, and, ilike, desc, asc, count, sql, gte, lte } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  warehouses,
  inventoryLevels,
  inventoryEvents,
} from "../../db/schema/index.js";
import type {
  Warehouse,
  InventoryLevel,
  InventoryEvent,
  InventoryReason,
} from "../../db/schema/inventory.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdjustOpts {
  warehouseId: string;
  sku: string;
  delta: number;
  reason: InventoryReason;
  variantId?: string | undefined;
  referenceType?: string | undefined;
  referenceId?: string | undefined;
  createdBy?: string | undefined;
  notes?: string | undefined;
}

export interface SetInventoryOpts {
  warehouseId: string;
  sku: string;
  qtyAvailable: number;
  qtyReserved?: number | undefined;
  qtyIncoming?: number | undefined;
  variantId?: string | undefined;
}

export interface TransferOpts {
  fromWarehouseId: string;
  toWarehouseId: string;
  sku: string;
  qty: number;
  variantId?: string | undefined;
  notes?: string | undefined;
}

export interface ReserveOpts {
  warehouseId: string;
  sku: string;
  qty: number;
}

export interface ListInventoryOpts {
  warehouseId?: string | undefined;
  sku?: string | undefined;
  variantId?: string | undefined;
  page: number;
  limit: number;
}

export interface ListEventsOpts {
  warehouseId?: string | undefined;
  sku?: string | undefined;
  reason?: InventoryReason | undefined;
  referenceType?: string | undefined;
  referenceId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  limit: number;
}

export interface InventorySummary {
  totalSkus: number;
  totalQtyAvailable: number;
  totalQtyReserved: number;
  totalQtyIncoming: number;
}

// ── Warehouses ────────────────────────────────────────────────────────────────

export async function listWarehouses(
  db: Db,
  storeAccountId: string,
  includeInactive = false,
): Promise<Warehouse[]> {
  const conditions = [eq(warehouses.storeAccountId, storeAccountId)];
  if (!includeInactive) {
    conditions.push(eq(warehouses.isActive, true));
  }
  return db
    .select()
    .from(warehouses)
    .where(and(...conditions))
    .orderBy(asc(warehouses.priority));
}

export async function getWarehouse(
  db: Db,
  warehouseId: string,
  storeAccountId: string,
): Promise<Warehouse | null> {
  const [row] = await db
    .select()
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface CreateWarehouseOpts {
  name: string;
  type?: "internal" | "external" | undefined;
  address?: Record<string, string> | undefined;
  priority?: number | undefined;
  isEnabledForCheckout?: boolean | undefined;
  leadTimeDays?: number | undefined;
}

export async function createWarehouse(
  db: Db,
  storeAccountId: string,
  data: CreateWarehouseOpts,
): Promise<Warehouse> {
  const values: typeof warehouses.$inferInsert = {
    storeAccountId,
    name: data.name,
  };
  if (data.type !== undefined) values.type = data.type;
  if (data.address !== undefined) values.address = data.address;
  if (data.priority !== undefined) values.priority = data.priority;
  if (data.isEnabledForCheckout !== undefined) values.isEnabledForCheckout = data.isEnabledForCheckout;
  if (data.leadTimeDays !== undefined) values.leadTimeDays = data.leadTimeDays;

  const [created] = await db.insert(warehouses).values(values).returning();
  if (!created) throw new Error("Failed to create warehouse");
  return created;
}

export interface UpdateWarehouseOpts {
  name?: string | undefined;
  type?: "internal" | "external" | undefined;
  address?: Record<string, string> | undefined;
  priority?: number | undefined;
  isEnabledForCheckout?: boolean | undefined;
  leadTimeDays?: number | undefined;
  isActive?: boolean | undefined;
}

export async function updateWarehouse(
  db: Db,
  warehouseId: string,
  storeAccountId: string,
  data: UpdateWarehouseOpts,
): Promise<Warehouse> {
  const set: Partial<typeof warehouses.$inferInsert> & { updatedAt?: Date } = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) set.name = data.name;
  if (data.type !== undefined) set.type = data.type;
  if (data.address !== undefined) set.address = data.address;
  if (data.priority !== undefined) set.priority = data.priority;
  if (data.isEnabledForCheckout !== undefined) set.isEnabledForCheckout = data.isEnabledForCheckout;
  if (data.leadTimeDays !== undefined) set.leadTimeDays = data.leadTimeDays;
  if (data.isActive !== undefined) set.isActive = data.isActive;

  const [updated] = await db
    .update(warehouses)
    .set(set)
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Warehouse not found"), { statusCode: 404 });
  }
  return updated;
}

/**
 * Soft-delete a warehouse (sets isActive=false).
 * Warehouses are never hard-deleted to preserve event history.
 */
export async function deleteWarehouse(
  db: Db,
  warehouseId: string,
  storeAccountId: string,
): Promise<boolean> {
  const [updated] = await db
    .update(warehouses)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: warehouses.id });
  return updated !== undefined;
}

// ── Inventory Levels ──────────────────────────────────────────────────────────

export async function listInventoryLevels(
  db: Db,
  storeAccountId: string,
  opts: ListInventoryOpts,
): Promise<PaginatedResult<InventoryLevel>> {
  const conditions = [eq(inventoryLevels.storeAccountId, storeAccountId)];
  if (opts.warehouseId !== undefined) {
    conditions.push(eq(inventoryLevels.warehouseId, opts.warehouseId));
  }
  if (opts.sku !== undefined) {
    conditions.push(ilike(inventoryLevels.sku, `%${opts.sku}%`));
  }
  if (opts.variantId !== undefined) {
    conditions.push(eq(inventoryLevels.variantId, opts.variantId));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [totalRow, items] = await Promise.all([
    db
      .select({ count: count() })
      .from(inventoryLevels)
      .where(where)
      .then((rows) => rows[0]),
    db
      .select()
      .from(inventoryLevels)
      .where(where)
      .orderBy(asc(inventoryLevels.sku))
      .limit(opts.limit)
      .offset(offset),
  ]);

  const total = Number(totalRow?.count ?? 0);
  return {
    items,
    total,
    page: opts.page,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function getInventoryLevel(
  db: Db,
  warehouseId: string,
  sku: string,
  storeAccountId: string,
): Promise<InventoryLevel | null> {
  const [row] = await db
    .select()
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.warehouseId, warehouseId),
        eq(inventoryLevels.sku, sku),
        eq(inventoryLevels.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getInventoryLevelById(
  db: Db,
  levelId: string,
  storeAccountId: string,
): Promise<InventoryLevel | null> {
  const [row] = await db
    .select()
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.id, levelId),
        eq(inventoryLevels.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Returns the sum of qtyAvailable across all active warehouses that are enabled
 * for checkout for the given SKU.
 */
export async function getAvailableQtyAcrossWarehouses(
  db: Db,
  sku: string,
  storeAccountId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${inventoryLevels.qtyAvailable}), 0)` })
    .from(inventoryLevels)
    .innerJoin(
      warehouses,
      and(
        eq(inventoryLevels.warehouseId, warehouses.id),
        eq(warehouses.isActive, true),
        eq(warehouses.isEnabledForCheckout, true),
      ),
    )
    .where(
      and(
        eq(inventoryLevels.sku, sku),
        eq(inventoryLevels.storeAccountId, storeAccountId),
      ),
    );
  return Number(row?.total ?? 0);
}

/**
 * Returns aggregate inventory quantities for a store, optionally filtered by
 * warehouse.
 */
export async function getTotalInventorySummary(
  db: Db,
  storeAccountId: string,
  warehouseId?: string | undefined,
): Promise<InventorySummary> {
  const conditions = [eq(inventoryLevels.storeAccountId, storeAccountId)];
  if (warehouseId !== undefined) {
    conditions.push(eq(inventoryLevels.warehouseId, warehouseId));
  }

  const [row] = await db
    .select({
      totalSkus: sql<number>`COUNT(DISTINCT ${inventoryLevels.sku})`,
      totalQtyAvailable: sql<number>`COALESCE(SUM(${inventoryLevels.qtyAvailable}), 0)`,
      totalQtyReserved: sql<number>`COALESCE(SUM(${inventoryLevels.qtyReserved}), 0)`,
      totalQtyIncoming: sql<number>`COALESCE(SUM(${inventoryLevels.qtyIncoming}), 0)`,
    })
    .from(inventoryLevels)
    .where(and(...conditions));

  return {
    totalSkus: Number(row?.totalSkus ?? 0),
    totalQtyAvailable: Number(row?.totalQtyAvailable ?? 0),
    totalQtyReserved: Number(row?.totalQtyReserved ?? 0),
    totalQtyIncoming: Number(row?.totalQtyIncoming ?? 0),
  };
}

// ── Inventory Adjustments ─────────────────────────────────────────────────────

/**
 * Core transactional inventory adjustment.
 *
 * - For reason "incoming": adjusts qtyIncoming (not qtyAvailable).
 * - For all other reasons: adjusts qtyAvailable (can go negative — backorder).
 *
 * Returns the updated level and the created event.
 */
export async function adjustInventory(
  db: Db,
  storeAccountId: string,
  opts: AdjustOpts,
): Promise<{ level: InventoryLevel; event: InventoryEvent }> {
  return db.transaction(async (tx) => {
    const isIncoming = opts.reason === "incoming";

    // Build the upsert insert values.
    const insertValues: typeof inventoryLevels.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      qtyAvailable: isIncoming ? 0 : opts.delta,
      qtyReserved: 0,
      qtyIncoming: isIncoming ? opts.delta : 0,
    };
    if (opts.variantId !== undefined) insertValues.variantId = opts.variantId;

    // Build the conflict update set.
    const conflictSet = isIncoming
      ? {
          qtyIncoming: sql`${inventoryLevels.qtyIncoming} + ${opts.delta}`,
          updatedAt: new Date(),
        }
      : {
          qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${opts.delta}`,
          updatedAt: new Date(),
        };

    await tx
      .insert(inventoryLevels)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [inventoryLevels.warehouseId, inventoryLevels.sku],
        set: conflictSet,
      });

    // Fetch the updated level.
    const [level] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.warehouseId, opts.warehouseId),
          eq(inventoryLevels.sku, opts.sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!level) throw new Error("Failed to fetch inventory level after upsert");

    const qtyAfter = isIncoming ? level.qtyIncoming : level.qtyAvailable;

    // Build the event insert.
    const eventValues: typeof inventoryEvents.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      delta: opts.delta,
      reason: opts.reason,
      qtyAfter,
    };
    if (opts.variantId !== undefined) eventValues.variantId = opts.variantId;
    if (opts.referenceType !== undefined) eventValues.referenceType = opts.referenceType;
    if (opts.referenceId !== undefined) eventValues.referenceId = opts.referenceId;
    if (opts.createdBy !== undefined) eventValues.createdBy = opts.createdBy;
    if (opts.notes !== undefined) eventValues.notes = opts.notes;

    const [event] = await tx.insert(inventoryEvents).values(eventValues).returning();
    if (!event) throw new Error("Failed to insert inventory event");

    return { level, event };
  });
}

/**
 * Absolute set of inventory quantities for a (warehouse, sku).
 *
 * Computes the delta from the current qtyAvailable and records an "adjustment"
 * event. Returns the updated level.
 */
export async function setInventoryLevel(
  db: Db,
  storeAccountId: string,
  opts: SetInventoryOpts,
): Promise<InventoryLevel> {
  const qtyReserved = opts.qtyReserved ?? 0;
  const qtyIncoming = opts.qtyIncoming ?? 0;

  return db.transaction(async (tx) => {
    // Fetch current level to compute delta for the event.
    const [current] = await tx
      .select({ qtyAvailable: inventoryLevels.qtyAvailable })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.warehouseId, opts.warehouseId),
          eq(inventoryLevels.sku, opts.sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    const delta = opts.qtyAvailable - (current?.qtyAvailable ?? 0);

    // Upsert the absolute values.
    const insertValues: typeof inventoryLevels.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      qtyAvailable: opts.qtyAvailable,
      qtyReserved,
      qtyIncoming,
    };
    if (opts.variantId !== undefined) insertValues.variantId = opts.variantId;

    await tx
      .insert(inventoryLevels)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [inventoryLevels.warehouseId, inventoryLevels.sku],
        set: {
          qtyAvailable: opts.qtyAvailable,
          qtyReserved,
          qtyIncoming,
          updatedAt: new Date(),
        },
      });

    const [level] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.warehouseId, opts.warehouseId),
          eq(inventoryLevels.sku, opts.sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!level) throw new Error("Failed to fetch inventory level after set");

    // Record the adjustment event (delta may be 0 for pure qty_reserved/incoming changes).
    const eventValues: typeof inventoryEvents.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      delta,
      reason: "adjustment",
      qtyAfter: level.qtyAvailable,
    };
    if (opts.variantId !== undefined) eventValues.variantId = opts.variantId;

    await tx.insert(inventoryEvents).values(eventValues);

    return level;
  });
}

/**
 * Transfers `qty` units of a SKU from one warehouse to another.
 * Records transfer_out from the source and transfer_in at the destination.
 */
export async function transferInventory(
  db: Db,
  storeAccountId: string,
  opts: TransferOpts,
): Promise<{ from: { level: InventoryLevel; event: InventoryEvent }; to: { level: InventoryLevel; event: InventoryEvent } }> {
  return db.transaction(async (tx) => {
    const sharedOpts = {
      sku: opts.sku,
      ...(opts.variantId !== undefined && { variantId: opts.variantId }),
      ...(opts.notes !== undefined && { notes: opts.notes }),
    };

    const from = await adjustInventory(tx as unknown as Db, storeAccountId, {
      warehouseId: opts.fromWarehouseId,
      delta: -opts.qty,
      reason: "transfer_out",
      ...sharedOpts,
    });

    const to = await adjustInventory(tx as unknown as Db, storeAccountId, {
      warehouseId: opts.toWarehouseId,
      delta: opts.qty,
      reason: "transfer_in",
      ...sharedOpts,
    });

    return { from, to };
  });
}

/**
 * Reserves inventory for an order:
 * decrements qtyAvailable by qty, increments qtyReserved by qty.
 * Records a "sale" event.
 */
export async function reserveInventory(
  db: Db,
  storeAccountId: string,
  opts: ReserveOpts,
): Promise<InventoryLevel> {
  return db.transaction(async (tx) => {
    await tx
      .insert(inventoryLevels)
      .values({
        storeAccountId,
        warehouseId: opts.warehouseId,
        sku: opts.sku,
        qtyAvailable: -opts.qty,
        qtyReserved: opts.qty,
        qtyIncoming: 0,
      })
      .onConflictDoUpdate({
        target: [inventoryLevels.warehouseId, inventoryLevels.sku],
        set: {
          qtyAvailable: sql`${inventoryLevels.qtyAvailable} - ${opts.qty}`,
          qtyReserved: sql`${inventoryLevels.qtyReserved} + ${opts.qty}`,
          updatedAt: new Date(),
        },
      });

    const [level] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.warehouseId, opts.warehouseId),
          eq(inventoryLevels.sku, opts.sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!level) throw new Error("Failed to fetch inventory level after reserve");

    const eventValues: typeof inventoryEvents.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      delta: -opts.qty,
      reason: "sale",
      qtyAfter: level.qtyAvailable,
    };

    await tx.insert(inventoryEvents).values(eventValues);

    return level;
  });
}

/**
 * Releases a reservation (e.g. order cancelled):
 * increments qtyAvailable by qty, decrements qtyReserved by qty.
 * Records a "return" event.
 */
export async function releaseReservation(
  db: Db,
  storeAccountId: string,
  opts: ReserveOpts,
): Promise<InventoryLevel> {
  return db.transaction(async (tx) => {
    await tx
      .insert(inventoryLevels)
      .values({
        storeAccountId,
        warehouseId: opts.warehouseId,
        sku: opts.sku,
        qtyAvailable: opts.qty,
        qtyReserved: 0,
        qtyIncoming: 0,
      })
      .onConflictDoUpdate({
        target: [inventoryLevels.warehouseId, inventoryLevels.sku],
        set: {
          qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${opts.qty}`,
          qtyReserved: sql`${inventoryLevels.qtyReserved} - ${opts.qty}`,
          updatedAt: new Date(),
        },
      });

    const [level] = await tx
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.warehouseId, opts.warehouseId),
          eq(inventoryLevels.sku, opts.sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!level) throw new Error("Failed to fetch inventory level after release");

    const eventValues: typeof inventoryEvents.$inferInsert = {
      storeAccountId,
      warehouseId: opts.warehouseId,
      sku: opts.sku,
      delta: opts.qty,
      reason: "return",
      qtyAfter: level.qtyAvailable,
    };

    await tx.insert(inventoryEvents).values(eventValues);

    return level;
  });
}

// ── Inventory Events ──────────────────────────────────────────────────────────

export async function listInventoryEvents(
  db: Db,
  storeAccountId: string,
  opts: ListEventsOpts,
): Promise<PaginatedResult<InventoryEvent>> {
  const conditions = [eq(inventoryEvents.storeAccountId, storeAccountId)];
  if (opts.warehouseId !== undefined) {
    conditions.push(eq(inventoryEvents.warehouseId, opts.warehouseId));
  }
  if (opts.sku !== undefined) {
    conditions.push(ilike(inventoryEvents.sku, `%${opts.sku}%`));
  }
  if (opts.reason !== undefined) {
    conditions.push(eq(inventoryEvents.reason, opts.reason));
  }
  if (opts.referenceType !== undefined) {
    conditions.push(eq(inventoryEvents.referenceType, opts.referenceType));
  }
  if (opts.referenceId !== undefined) {
    conditions.push(eq(inventoryEvents.referenceId, opts.referenceId));
  }
  if (opts.from !== undefined) {
    conditions.push(gte(inventoryEvents.createdAt, new Date(opts.from)));
  }
  if (opts.to !== undefined) {
    conditions.push(lte(inventoryEvents.createdAt, new Date(opts.to)));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.limit;

  const [totalRow, items] = await Promise.all([
    db
      .select({ count: count() })
      .from(inventoryEvents)
      .where(where)
      .then((rows) => rows[0]),
    db
      .select()
      .from(inventoryEvents)
      .where(where)
      .orderBy(desc(inventoryEvents.createdAt))
      .limit(opts.limit)
      .offset(offset),
  ]);

  const total = Number(totalRow?.count ?? 0);
  return {
    items,
    total,
    page: opts.page,
    totalPages: Math.ceil(total / opts.limit),
  };
}
