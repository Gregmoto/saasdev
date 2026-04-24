import { eq, and, lt, inArray, asc, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  inventoryReservations,
  storeInventoryConfig,
  inventoryLevels,
  inventoryEvents,
  warehouses,
  shopWarehouses,
} from "../../db/schema/index.js";
import type {
  InventoryReservation,
  StoreInventoryConfig,
  AllocationStrategy,
} from "../../db/schema/inventory.js";

// ── Config ────────────────────────────────────────────────────────────────────

export async function getStoreInventoryConfig(
  db: Db,
  storeAccountId: string,
): Promise<StoreInventoryConfig> {
  const [existing] = await db
    .select()
    .from(storeInventoryConfig)
    .where(eq(storeInventoryConfig.storeAccountId, storeAccountId))
    .limit(1);

  if (existing) {
    return existing;
  }

  // Upsert default row
  const [created] = await db
    .insert(storeInventoryConfig)
    .values({
      storeAccountId,
      commitTrigger: "payment",
      allocationStrategy: "priority",
      reservationTimeoutMinutes: 30,
      autoExpire: true,
    })
    .onConflictDoUpdate({
      target: storeInventoryConfig.storeAccountId,
      set: {
        updatedAt: sql`now()`,
      },
    })
    .returning();

  if (!created) throw new Error("Failed to create default inventory config");
  return created;
}

export async function updateStoreInventoryConfig(
  db: Db,
  storeAccountId: string,
  data: {
    commitTrigger?: "payment" | "fulfillment";
    allocationStrategy?: AllocationStrategy;
    reservationTimeoutMinutes?: number;
    autoExpire?: boolean;
  },
): Promise<StoreInventoryConfig> {
  const setValues: Record<string, unknown> = {
    updatedAt: sql`now()`,
  };

  if (data.commitTrigger !== undefined) setValues["commitTrigger"] = data.commitTrigger;
  if (data.allocationStrategy !== undefined) setValues["allocationStrategy"] = data.allocationStrategy;
  if (data.reservationTimeoutMinutes !== undefined) setValues["reservationTimeoutMinutes"] = data.reservationTimeoutMinutes;
  if (data.autoExpire !== undefined) setValues["autoExpire"] = data.autoExpire;

  const insertValues: {
    storeAccountId: string;
    commitTrigger?: "payment" | "fulfillment";
    allocationStrategy?: AllocationStrategy;
    reservationTimeoutMinutes?: number;
    autoExpire?: boolean;
  } = { storeAccountId };

  if (data.commitTrigger !== undefined) insertValues.commitTrigger = data.commitTrigger;
  if (data.allocationStrategy !== undefined) insertValues.allocationStrategy = data.allocationStrategy;
  if (data.reservationTimeoutMinutes !== undefined) insertValues.reservationTimeoutMinutes = data.reservationTimeoutMinutes;
  if (data.autoExpire !== undefined) insertValues.autoExpire = data.autoExpire;

  const [updated] = await db
    .insert(storeInventoryConfig)
    .values(insertValues)
    .onConflictDoUpdate({
      target: storeInventoryConfig.storeAccountId,
      set: setValues,
    })
    .returning();

  if (!updated) throw new Error("Failed to upsert inventory config");
  return updated;
}

// ── Allocation ────────────────────────────────────────────────────────────────

export async function allocateInventory(
  db: Db,
  storeAccountId: string,
  opts: {
    orderId: string;
    shopId?: string;
    items: Array<{ sku: string; qty: number; variantId?: string }>;
    strategy?: AllocationStrategy;
    warehouseId?: string;
    expiresInMinutes?: number;
  },
): Promise<InventoryReservation[]> {
  return db.transaction(async (tx) => {
    const config = await getStoreInventoryConfig(tx as unknown as Db, storeAccountId);

    const strategy: AllocationStrategy = opts.strategy ?? config.allocationStrategy;

    // Compute expiresAt
    let expiresAt: Date | null = null;
    if (opts.expiresInMinutes !== undefined) {
      if (opts.expiresInMinutes > 0) {
        expiresAt = new Date(Date.now() + opts.expiresInMinutes * 60 * 1000);
      }
      // 0 = no expiry → leave null
    } else if (config.autoExpire && config.reservationTimeoutMinutes > 0) {
      expiresAt = new Date(Date.now() + config.reservationTimeoutMinutes * 60 * 1000);
    }

    const allCreated: InventoryReservation[] = [];

    for (const item of opts.items) {
      let candidateWarehouseIds: string[];

      if (strategy === "manual") {
        if (!opts.warehouseId) {
          throw new Error("warehouseId is required when strategy=manual");
        }
        candidateWarehouseIds = [opts.warehouseId];
      } else if (opts.shopId) {
        // Check if the shop has linked warehouses
        const shopLinks = await tx
          .select({ warehouseId: shopWarehouses.warehouseId })
          .from(shopWarehouses)
          .where(
            and(
              eq(shopWarehouses.shopId, opts.shopId),
              eq(shopWarehouses.storeAccountId, storeAccountId),
            ),
          )
          .orderBy(asc(shopWarehouses.priority));

        if (shopLinks.length > 0) {
          candidateWarehouseIds = shopLinks.map((r) => r.warehouseId);
        } else {
          // Fall back to global warehouse list using the chosen strategy order
          candidateWarehouseIds = await fetchGlobalWarehouseIds(tx as unknown as Db, storeAccountId, strategy);
        }
      } else {
        candidateWarehouseIds = await fetchGlobalWarehouseIds(tx as unknown as Db, storeAccountId, strategy);
      }

      let remainingQty = item.qty;

      for (const warehouseId of candidateWarehouseIds) {
        if (remainingQty <= 0) break;

        // Fetch current inventory level (with row lock via select for update pattern)
        const [level] = await tx
          .select()
          .from(inventoryLevels)
          .where(
            and(
              eq(inventoryLevels.warehouseId, warehouseId),
              eq(inventoryLevels.sku, item.sku),
              eq(inventoryLevels.storeAccountId, storeAccountId),
            ),
          )
          .limit(1);

        const available = level?.qtyAvailable ?? 0;
        if (available <= 0) continue;

        const allocatedQty = Math.min(available, remainingQty);

        // Decrement qtyAvailable, increment qtyReserved
        await tx
          .insert(inventoryLevels)
          .values({
            storeAccountId,
            warehouseId,
            sku: item.sku,
            qtyAvailable: -allocatedQty,
            qtyReserved: allocatedQty,
            ...(item.variantId !== undefined && { variantId: item.variantId }),
          })
          .onConflictDoUpdate({
            target: [inventoryLevels.warehouseId, inventoryLevels.sku],
            set: {
              qtyAvailable: sql`${inventoryLevels.qtyAvailable} - ${allocatedQty}`,
              qtyReserved: sql`${inventoryLevels.qtyReserved} + ${allocatedQty}`,
              updatedAt: sql`now()`,
            },
          });

        // Insert inventory event
        const eventValues: {
          storeAccountId: string;
          warehouseId: string;
          sku: string;
          delta: number;
          reason: "sale";
          referenceType: string;
          referenceId: string;
          variantId?: string;
        } = {
          storeAccountId,
          warehouseId,
          sku: item.sku,
          delta: -allocatedQty,
          reason: "sale",
          referenceType: "order",
          referenceId: opts.orderId,
        };
        if (item.variantId !== undefined) eventValues.variantId = item.variantId;

        await tx.insert(inventoryEvents).values(eventValues);

        // Insert reservation row
        const reservationValues: {
          storeAccountId: string;
          orderId: string;
          warehouseId: string;
          sku: string;
          qtyReserved: number;
          status: "pending";
          allocationStrategy: AllocationStrategy;
          shopId?: string;
          variantId?: string;
          expiresAt?: Date;
        } = {
          storeAccountId,
          orderId: opts.orderId,
          warehouseId,
          sku: item.sku,
          qtyReserved: allocatedQty,
          status: "pending",
          allocationStrategy: strategy,
        };
        if (opts.shopId !== undefined) reservationValues.shopId = opts.shopId;
        if (item.variantId !== undefined) reservationValues.variantId = item.variantId;
        if (expiresAt !== null) reservationValues.expiresAt = expiresAt;

        const [reservation] = await tx
          .insert(inventoryReservations)
          .values(reservationValues)
          .returning();

        if (!reservation) throw new Error("Failed to insert reservation row");
        allCreated.push(reservation);
        remainingQty -= allocatedQty;
      }

      if (remainingQty > 0) {
        throw new Error(`Insufficient stock for SKU ${item.sku}`);
      }
    }

    return allCreated;
  });
}

async function fetchGlobalWarehouseIds(
  db: Db,
  storeAccountId: string,
  strategy: AllocationStrategy,
): Promise<string[]> {
  const orderCol = strategy === "lowest_lead_time"
    ? asc(warehouses.leadTimeDays)
    : asc(warehouses.priority);

  const rows = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq(warehouses.storeAccountId, storeAccountId),
        eq(warehouses.isActive, true),
        eq(warehouses.isEnabledForCheckout, true),
      ),
    )
    .orderBy(orderCol);

  return rows.map((r) => r.id);
}

// ── Commit ────────────────────────────────────────────────────────────────────

export async function commitReservationsForOrder(
  db: Db,
  storeAccountId: string,
  orderId: string,
): Promise<InventoryReservation[]> {
  const updated = await db
    .update(inventoryReservations)
    .set({
      status: "committed",
      committedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(inventoryReservations.storeAccountId, storeAccountId),
        eq(inventoryReservations.orderId, orderId),
        eq(inventoryReservations.status, "pending"),
      ),
    )
    .returning();

  return updated;
}

// ── Release ───────────────────────────────────────────────────────────────────

export async function releaseReservationsForOrder(
  db: Db,
  storeAccountId: string,
  orderId: string,
): Promise<InventoryReservation[]> {
  return db.transaction(async (tx) => {
    // Fetch pending and committed reservations for this order
    const rows = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.storeAccountId, storeAccountId),
          eq(inventoryReservations.orderId, orderId),
          inArray(inventoryReservations.status, ["pending", "committed"]),
        ),
      );

    if (rows.length === 0) {
      return [];
    }

    for (const reservation of rows) {
      // Restore inventory: increment qtyAvailable, decrement qtyReserved
      await tx
        .insert(inventoryLevels)
        .values({
          storeAccountId,
          warehouseId: reservation.warehouseId,
          sku: reservation.sku,
          qtyAvailable: reservation.qtyReserved,
          qtyReserved: -reservation.qtyReserved,
        })
        .onConflictDoUpdate({
          target: [inventoryLevels.warehouseId, inventoryLevels.sku],
          set: {
            qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${reservation.qtyReserved}`,
            qtyReserved: sql`${inventoryLevels.qtyReserved} - ${reservation.qtyReserved}`,
            updatedAt: sql`now()`,
          },
        });

      // Insert return inventory event
      const eventValues: {
        storeAccountId: string;
        warehouseId: string;
        sku: string;
        delta: number;
        reason: "return";
        referenceType: string;
        referenceId: string;
        variantId?: string;
      } = {
        storeAccountId,
        warehouseId: reservation.warehouseId,
        sku: reservation.sku,
        delta: reservation.qtyReserved,
        reason: "return",
        referenceType: "order",
        referenceId: orderId,
      };
      if (reservation.variantId !== null && reservation.variantId !== undefined) {
        eventValues.variantId = reservation.variantId;
      }

      await tx.insert(inventoryEvents).values(eventValues);
    }

    // Mark all reservations as released
    const updated = await tx
      .update(inventoryReservations)
      .set({
        status: "released",
        releasedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(inventoryReservations.storeAccountId, storeAccountId),
          eq(inventoryReservations.orderId, orderId),
          inArray(inventoryReservations.status, ["pending", "committed"]),
        ),
      )
      .returning();

    return updated;
  });
}

// ── Expiry sweep ──────────────────────────────────────────────────────────────

export async function expireStaleReservations(
  db: Db,
  storeAccountId: string,
): Promise<number> {
  // Find all stale pending reservations for this store
  const stale = await db
    .select({ orderId: inventoryReservations.orderId })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.storeAccountId, storeAccountId),
        eq(inventoryReservations.status, "pending"),
        lt(inventoryReservations.expiresAt, sql`now()`),
      ),
    );

  if (stale.length === 0) {
    return 0;
  }

  // Deduplicate order IDs
  const uniqueOrderIds = [...new Set(stale.map((r) => r.orderId))];

  let totalExpired = 0;

  for (const orderId of uniqueOrderIds) {
    const released = await releaseReservationsForOrder(db, storeAccountId, orderId);
    totalExpired += released.length;
  }

  return totalExpired;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listReservations(
  db: Db,
  storeAccountId: string,
  opts: {
    orderId?: string;
    status?: "pending" | "committed" | "released" | "cancelled";
    warehouseId?: string;
    sku?: string;
    page: number;
    limit: number;
  },
): Promise<{ data: InventoryReservation[]; total: number; page: number; limit: number }> {
  const conditions = [eq(inventoryReservations.storeAccountId, storeAccountId)];

  if (opts.orderId !== undefined) conditions.push(eq(inventoryReservations.orderId, opts.orderId));
  if (opts.status !== undefined) conditions.push(eq(inventoryReservations.status, opts.status));
  if (opts.warehouseId !== undefined) conditions.push(eq(inventoryReservations.warehouseId, opts.warehouseId));
  if (opts.sku !== undefined) conditions.push(eq(inventoryReservations.sku, opts.sku));

  const offset = (opts.page - 1) * opts.limit;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(inventoryReservations)
      .where(and(...conditions))
      .orderBy(desc(inventoryReservations.createdAt))
      .limit(opts.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryReservations)
      .where(and(...conditions)),
  ]);

  return {
    data,
    total: countResult[0]?.count ?? 0,
    page: opts.page,
    limit: opts.limit,
  };
}
