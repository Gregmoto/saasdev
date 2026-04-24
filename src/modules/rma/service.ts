import type { Db } from "../../db/client.js";
import {
  rmas,
  rmaItems,
  rmaMessages,
  rmaAttachments,
  orders,
  orderItems,
  inventoryLevels,
  inventoryEvents,
  refunds,
} from "../../db/schema/index.js";
import { eq, and, inArray, sql, desc, asc } from "drizzle-orm";
import type { RmaItem } from "../../db/schema/rma.js";

// ── Status machine ─────────────────────────────────────────────────────────────

export const RMA_TRANSITIONS: Record<string, string[]> = {
  requested: ["approved", "denied", "closed"],
  approved: ["label_sent", "denied", "closed"],
  label_sent: ["received", "closed"],
  received: ["inspected", "closed"],
  inspected: ["refunded", "exchanged", "denied", "closed"],
  refunded: ["closed"],
  exchanged: ["closed"],
  denied: ["closed"],
  closed: [],
};

export function canRmaTransition(from: string, to: string): boolean {
  const allowed = RMA_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}

// ── generateRmaNumber ──────────────────────────────────────────────────────────

export async function generateRmaNumber(db: Db, storeAccountId: string): Promise<string> {
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(rmas)
    .where(eq(rmas.storeAccountId, storeAccountId));
  const n = parseInt(row?.count ?? "0", 10) + 1;
  return `RMA-${String(n).padStart(4, "0")}`;
}

// ── createRma ──────────────────────────────────────────────────────────────────

export async function createRma(
  db: Db,
  storeAccountId: string,
  actorUserId: string,
  data: {
    orderId: string;
    reason: string;
    notes?: string;
    shopId?: string;
    customerEmail?: string;
    items: Array<{
      orderItemId: string;
      sku?: string;
      quantityRequested: number;
    }>;
  },
) {
  // 1. Verify order belongs to storeAccountId and is not pending
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      customerId: orders.customerId,
      customerEmail: orders.customerEmail,
      shopId: orders.shopId,
    })
    .from(orders)
    .where(and(eq(orders.id, data.orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  if (order.status === "pending") {
    throw Object.assign(
      new Error("Cannot create RMA for a pending order. Order must be at least confirmed."),
      { statusCode: 422 },
    );
  }

  // 2. Verify each orderItemId belongs to orderId
  const orderItemIds = data.items.map((i) => i.orderItemId);
  const foundItems = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, data.orderId), inArray(orderItems.id, orderItemIds)));

  const foundIds = new Set(foundItems.map((i) => i.id));
  for (const itemId of orderItemIds) {
    if (!foundIds.has(itemId)) {
      throw Object.assign(
        new Error(`Order item ${itemId} does not belong to order ${data.orderId}`),
        { statusCode: 422 },
      );
    }
  }

  // 3. Generate RMA number
  const rmaNumber = await generateRmaNumber(db, storeAccountId);

  // 4. INSERT rma
  const insertValues: typeof rmas.$inferInsert = {
    storeAccountId,
    orderId: data.orderId,
    rmaNumber,
    reason: data.reason,
    status: "requested",
  };
  if (data.shopId !== undefined) insertValues.shopId = data.shopId;
  else if (order.shopId !== null) insertValues.shopId = order.shopId;
  if (order.customerId !== null) insertValues.customerId = order.customerId;
  if (data.customerEmail !== undefined) {
    insertValues.customerEmail = data.customerEmail;
  } else if (order.customerEmail !== null) {
    insertValues.customerEmail = order.customerEmail;
  }
  if (data.notes !== undefined) insertValues.notes = data.notes;

  const [rma] = await db.insert(rmas).values(insertValues).returning();
  const createdRma = rma!;

  // 5. INSERT rmaItems
  const itemRows: (typeof rmaItems.$inferInsert)[] = data.items.map((item) => {
    const row: typeof rmaItems.$inferInsert = {
      rmaId: createdRma.id,
      storeAccountId,
      orderItemId: item.orderItemId,
      quantityRequested: item.quantityRequested,
    };
    if (item.sku !== undefined) row.sku = item.sku;
    return row;
  });
  await db.insert(rmaItems).values(itemRows);

  // 6. INSERT system rmaMessage
  await db.insert(rmaMessages).values({
    rmaId: createdRma.id,
    storeAccountId,
    authorType: "system",
    body: `RMA initierad. Anledning: ${data.reason}`,
    isInternal: true,
  });

  // 7. Return rma
  return createdRma;
}

// ── listRmas ───────────────────────────────────────────────────────────────────

export async function listRmas(
  db: Db,
  storeAccountId: string,
  query: {
    status?: string;
    orderId?: string;
    assignedToUserId?: string;
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(rmas.storeAccountId, storeAccountId)];

  if (query.status !== undefined) {
    conditions.push(
      eq(rmas.status, query.status as typeof rmas.$inferSelect["status"]),
    );
  }
  if (query.orderId !== undefined) {
    conditions.push(eq(rmas.orderId, query.orderId));
  }
  if (query.assignedToUserId !== undefined) {
    conditions.push(eq(rmas.assignedToUserId, query.assignedToUserId));
  }

  const offset = (query.page - 1) * query.limit;

  const rows = await db
    .select()
    .from(rmas)
    .where(and(...conditions))
    .orderBy(desc(rmas.createdAt))
    .limit(query.limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(rmas)
    .where(and(...conditions));

  const total = parseInt(countRow?.count ?? "0", 10);

  return {
    data: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── getRma ─────────────────────────────────────────────────────────────────────

export async function getRma(db: Db, rmaId: string, storeAccountId: string) {
  const [rma] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) return null;

  const items = await db
    .select()
    .from(rmaItems)
    .where(eq(rmaItems.rmaId, rmaId));

  const messages = await db
    .select()
    .from(rmaMessages)
    .where(eq(rmaMessages.rmaId, rmaId))
    .orderBy(asc(rmaMessages.createdAt));

  const attachments = await db
    .select()
    .from(rmaAttachments)
    .where(eq(rmaAttachments.rmaId, rmaId));

  return { ...rma, items, messages, attachments };
}

// ── updateRmaStatus ────────────────────────────────────────────────────────────

export async function updateRmaStatus(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  newStatus: string,
  notes?: string,
) {
  // 1. Load rma, check transition
  const [rma] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (!canRmaTransition(rma.status, newStatus)) {
    throw Object.assign(
      new Error(
        `Cannot transition RMA from '${rma.status}' to '${newStatus}'. Allowed: ${(RMA_TRANSITIONS[rma.status] ?? []).join(", ")}`,
      ),
      { statusCode: 422 },
    );
  }

  // 2. Build update imperatively
  const updateValues: Partial<typeof rmas.$inferInsert> = {
    status: newStatus as typeof rmas.$inferSelect["status"],
    updatedAt: new Date(),
  };

  if (newStatus === "approved") {
    updateValues.approvedAt = new Date();
  } else if (newStatus === "label_sent") {
    updateValues.labelSentAt = new Date();
  } else if (newStatus === "inspected") {
    updateValues.inspectedAt = new Date();
  } else if (
    newStatus === "refunded" ||
    newStatus === "exchanged" ||
    newStatus === "denied"
  ) {
    updateValues.resolvedAt = new Date();
  } else if (newStatus === "closed") {
    updateValues.closedAt = new Date();
  }

  // 3. UPDATE rma
  await db.update(rmas).set(updateValues).where(eq(rmas.id, rmaId));

  // 4. INSERT system rmaMessage
  const msgValues: typeof rmaMessages.$inferInsert = {
    rmaId,
    storeAccountId,
    authorType: "system",
    body: `Status ändrad till: ${newStatus}`,
    isInternal: true,
  };
  if (notes !== undefined) msgValues.body = `Status ändrad till: ${newStatus}. ${notes}`;
  await db.insert(rmaMessages).values(msgValues);

  // 5. Return updated rma
  const [updated] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
  return updated!;
}

// ── approveRma ─────────────────────────────────────────────────────────────────

export async function approveRma(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  data?: {
    returnLabelUrl?: string;
    returnLabelCarrier?: string;
  },
) {
  const rma = await updateRmaStatus(db, rmaId, storeAccountId, actorUserId, "approved");

  if (data && (data.returnLabelUrl !== undefined || data.returnLabelCarrier !== undefined)) {
    const labelUpdate: Partial<typeof rmas.$inferInsert> = { updatedAt: new Date() };
    if (data.returnLabelUrl !== undefined) labelUpdate.returnLabelUrl = data.returnLabelUrl;
    if (data.returnLabelCarrier !== undefined)
      labelUpdate.returnLabelCarrier = data.returnLabelCarrier;
    await db.update(rmas).set(labelUpdate).where(eq(rmas.id, rmaId));
    const [withLabel] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
    return withLabel!;
  }

  return rma;
}

// ── receiveRma ─────────────────────────────────────────────────────────────────

export async function receiveRma(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  data: {
    items: Array<{
      rmaItemId: string;
      quantityReceived: number;
    }>;
    notes?: string;
  },
) {
  // 1. Load rma, verify status
  const [rma] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (rma.status !== "approved" && rma.status !== "label_sent") {
    throw Object.assign(
      new Error(
        `Cannot receive RMA with status '${rma.status}'. Must be 'approved' or 'label_sent'.`,
      ),
      { statusCode: 422 },
    );
  }

  // 2. Update each rmaItem's quantityReceived
  for (const item of data.items) {
    await db
      .update(rmaItems)
      .set({ quantityReceived: item.quantityReceived, updatedAt: new Date() })
      .where(
        and(eq(rmaItems.id, item.rmaItemId), eq(rmaItems.rmaId, rmaId)),
      );
  }

  // 3. UPDATE rma: status = 'received', receivedAt = now()
  await db
    .update(rmas)
    .set({ status: "received", receivedAt: new Date(), updatedAt: new Date() })
    .where(eq(rmas.id, rmaId));

  // 4. INSERT system rmaMessage
  const msgBody = data.notes
    ? `Retur mottagen. ${data.notes}`
    : "Retur mottagen.";
  await db.insert(rmaMessages).values({
    rmaId,
    storeAccountId,
    authorType: "system",
    body: msgBody,
    isInternal: true,
  });

  // 5. Return updated rma
  const [updated] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
  return updated!;
}

// ── restockToWarehouse ────────────────────────────────────────────────────────

async function restockToWarehouse(
  db: Db,
  rmaId: string,
  rmaItem: RmaItem,
  warehouseId: string,
  storeAccountId: string,
) {
  if (!rmaItem.sku) return; // skip silently if no SKU

  const qty = rmaItem.quantityReceived ?? 0;
  if (qty <= 0) return;

  // UPSERT inventoryLevels
  await db
    .insert(inventoryLevels)
    .values({
      storeAccountId,
      warehouseId,
      sku: rmaItem.sku,
      qtyAvailable: qty,
    })
    .onConflictDoUpdate({
      target: [inventoryLevels.warehouseId, inventoryLevels.sku],
      set: {
        qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${qty}`,
        updatedAt: new Date(),
      },
    });

  // Get new qty after update
  const [level] = await db
    .select({ qtyAvailable: inventoryLevels.qtyAvailable })
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.warehouseId, warehouseId),
        eq(inventoryLevels.sku, rmaItem.sku),
      ),
    )
    .limit(1);

  const qtyAfter = level?.qtyAvailable ?? qty;

  // INSERT inventoryEvent
  const eventValues: typeof inventoryEvents.$inferInsert = {
    storeAccountId,
    warehouseId,
    sku: rmaItem.sku,
    delta: qty,
    reason: "return",
    referenceType: "rma",
    referenceId: rmaId,
    qtyAfter,
  };
  await db.insert(inventoryEvents).values(eventValues);
}

// ── inspectRma ─────────────────────────────────────────────────────────────────

export async function inspectRma(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  data: {
    items: Array<{
      rmaItemId: string;
      condition: "new" | "good" | "damaged" | "defective" | "missing_parts" | "unknown";
      disposition: "restock" | "refurbish" | "scrap" | "vendor_return" | "pending";
      restockedWarehouseId?: string;
      inspectionNotes?: string;
    }>;
  },
) {
  // 1. Load rma, verify status is 'received'
  const [rma] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (rma.status !== "received") {
    throw Object.assign(
      new Error(`Cannot inspect RMA with status '${rma.status}'. Must be 'received'.`),
      { statusCode: 422 },
    );
  }

  // 2. Process each item
  for (const itemData of data.items) {
    // a. Load rmaItem
    const [rmaItem] = await db
      .select()
      .from(rmaItems)
      .where(
        and(eq(rmaItems.id, itemData.rmaItemId), eq(rmaItems.rmaId, rmaId)),
      )
      .limit(1);

    if (!rmaItem) continue;

    // b. UPDATE rmaItems
    const itemUpdate: Partial<typeof rmaItems.$inferInsert> = {
      condition: itemData.condition,
      disposition: itemData.disposition,
      updatedAt: new Date(),
    };
    if (itemData.inspectionNotes !== undefined)
      itemUpdate.inspectionNotes = itemData.inspectionNotes;
    if (itemData.restockedWarehouseId !== undefined)
      itemUpdate.restockedWarehouseId = itemData.restockedWarehouseId;

    await db
      .update(rmaItems)
      .set(itemUpdate)
      .where(eq(rmaItems.id, itemData.rmaItemId));

    // c. Restock
    if (
      itemData.disposition === "restock" &&
      itemData.restockedWarehouseId !== undefined &&
      rmaItem.sku &&
      (rmaItem.quantityReceived ?? 0) > 0
    ) {
      await restockToWarehouse(
        db,
        rmaId,
        rmaItem,
        itemData.restockedWarehouseId,
        storeAccountId,
      );
    }

    // d. scrap / refurbish — log adjustment event (delta=0)
    if (
      (itemData.disposition === "scrap" || itemData.disposition === "refurbish") &&
      rmaItem.sku
    ) {
      const [level] = await db
        .select({ qtyAvailable: inventoryLevels.qtyAvailable })
        .from(inventoryLevels)
        .where(
          and(
            eq(inventoryLevels.sku, rmaItem.sku),
            eq(inventoryLevels.storeAccountId, storeAccountId),
          ),
        )
        .limit(1);

      // We need a warehouseId — use restockedWarehouseId if provided, otherwise skip
      if (itemData.restockedWarehouseId !== undefined) {
        const adjValues: typeof inventoryEvents.$inferInsert = {
          storeAccountId,
          warehouseId: itemData.restockedWarehouseId,
          sku: rmaItem.sku,
          delta: 0,
          reason: "adjustment",
          referenceType: "rma",
          referenceId: rmaId,
        };
        if (level !== undefined) adjValues.qtyAfter = level.qtyAvailable;
        await db.insert(inventoryEvents).values(adjValues);
      }
    }

    // e. vendor_return — log transfer_out
    if (itemData.disposition === "vendor_return" && rmaItem.sku) {
      const qty = rmaItem.quantityReceived ?? 0;
      if (qty > 0 && itemData.restockedWarehouseId !== undefined) {
        // Subtract from inventoryLevels
        await db
          .update(inventoryLevels)
          .set({
            qtyAvailable: sql`greatest(0, ${inventoryLevels.qtyAvailable} - ${qty})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventoryLevels.warehouseId, itemData.restockedWarehouseId),
              eq(inventoryLevels.sku, rmaItem.sku),
            ),
          );

        const [levelAfter] = await db
          .select({ qtyAvailable: inventoryLevels.qtyAvailable })
          .from(inventoryLevels)
          .where(
            and(
              eq(inventoryLevels.warehouseId, itemData.restockedWarehouseId),
              eq(inventoryLevels.sku, rmaItem.sku),
            ),
          )
          .limit(1);

        const transferOutValues: typeof inventoryEvents.$inferInsert = {
          storeAccountId,
          warehouseId: itemData.restockedWarehouseId,
          sku: rmaItem.sku,
          delta: -qty,
          reason: "transfer_out",
          referenceType: "rma",
          referenceId: rmaId,
        };
        if (levelAfter !== undefined) transferOutValues.qtyAfter = levelAfter.qtyAvailable;
        await db.insert(inventoryEvents).values(transferOutValues);
      }
    }
  }

  // 3. UPDATE rma status = 'inspected', inspectedAt = now()
  await db
    .update(rmas)
    .set({ status: "inspected", inspectedAt: new Date(), updatedAt: new Date() })
    .where(eq(rmas.id, rmaId));

  // 4. INSERT system message
  await db.insert(rmaMessages).values({
    rmaId,
    storeAccountId,
    authorType: "system",
    body: "Inspektion slutförd.",
    isInternal: true,
  });

  // 5. Return rma
  const [updated] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
  return updated!;
}

// ── addRmaMessage ──────────────────────────────────────────────────────────────

export async function addRmaMessage(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  data: {
    body: string;
    isInternal: boolean;
    authorType: "agent" | "customer" | "system";
    authorCustomerId?: string;
  },
) {
  // 1. Verify rma belongs to store
  const [rma] = await db
    .select({ id: rmas.id })
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }

  // 2. INSERT rmaMessage
  const msgValues: typeof rmaMessages.$inferInsert = {
    rmaId,
    storeAccountId,
    authorType: data.authorType,
    body: data.body,
    isInternal: data.isInternal,
    authorUserId: actorUserId,
  };
  if (data.authorCustomerId !== undefined) msgValues.authorCustomerId = data.authorCustomerId;

  const [msg] = await db.insert(rmaMessages).values(msgValues).returning();

  // 3. Return message
  return msg!;
}

// ── resolveRmaWithRefund ───────────────────────────────────────────────────────

export async function resolveRmaWithRefund(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  actorUserId: string,
  refundAmountCents: number,
) {
  // 1. Load rma, verify status is 'inspected'
  const [rma] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }
  if (rma.status !== "inspected") {
    throw Object.assign(
      new Error(`Cannot refund RMA with status '${rma.status}'. Must be 'inspected'.`),
      { statusCode: 422 },
    );
  }

  let refundId: string | undefined;

  // 2. If refundAmountCents > 0: INSERT refund
  if (refundAmountCents > 0) {
    const refundValues: typeof refunds.$inferInsert = {
      storeAccountId,
      orderId: rma.orderId,
      rmaId,
      amountCents: refundAmountCents,
      isManual: true,
      isPartial: true,
      reason: `RMA ${rma.rmaNumber}`,
      method: "other",
      status: "pending",
    };

    const [newRefund] = await db.insert(refunds).values(refundValues).returning();
    refundId = newRefund!.id;
  }

  // 3. UPDATE rma
  const rmaUpdate: Partial<typeof rmas.$inferInsert> = {
    status: "refunded",
    resolvedAt: new Date(),
    refundAmountCents,
    updatedAt: new Date(),
  };
  if (refundId !== undefined) rmaUpdate.refundId = refundId;
  await db.update(rmas).set(rmaUpdate).where(eq(rmas.id, rmaId));

  // 4. INSERT system message
  await db.insert(rmaMessages).values({
    rmaId,
    storeAccountId,
    authorType: "system",
    body: `Återbetalning registrerad: ${refundAmountCents} öre.`,
    isInternal: true,
  });

  // 5. Return
  const [updatedRma] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
  return { rma: updatedRma!, refundId };
}

// ── updateRma ──────────────────────────────────────────────────────────────────

export async function updateRma(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  data: {
    notes?: string;
    assignedToUserId?: string | null;
    returnLabelUrl?: string;
    returnLabelCarrier?: string;
    returnTrackingNumber?: string;
    refundAmountCents?: number;
  },
) {
  const [existing] = await db
    .select()
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }

  const updateValues: Partial<typeof rmas.$inferInsert> = { updatedAt: new Date() };
  if (data.notes !== undefined) updateValues.notes = data.notes;
  if ("assignedToUserId" in data) {
    if (data.assignedToUserId === null) {
      updateValues.assignedToUserId = null;
    } else if (data.assignedToUserId !== undefined) {
      updateValues.assignedToUserId = data.assignedToUserId;
    }
  }
  if (data.returnLabelUrl !== undefined) updateValues.returnLabelUrl = data.returnLabelUrl;
  if (data.returnLabelCarrier !== undefined)
    updateValues.returnLabelCarrier = data.returnLabelCarrier;
  if (data.returnTrackingNumber !== undefined)
    updateValues.returnTrackingNumber = data.returnTrackingNumber;
  if (data.refundAmountCents !== undefined)
    updateValues.refundAmountCents = data.refundAmountCents;

  await db.update(rmas).set(updateValues).where(eq(rmas.id, rmaId));

  const [updated] = await db.select().from(rmas).where(eq(rmas.id, rmaId)).limit(1);
  return updated!;
}

// ── getRmaMessages ─────────────────────────────────────────────────────────────

export async function getRmaMessages(db: Db, rmaId: string, storeAccountId: string) {
  // Verify rma belongs to store
  const [rma] = await db
    .select({ id: rmas.id })
    .from(rmas)
    .where(and(eq(rmas.id, rmaId), eq(rmas.storeAccountId, storeAccountId)))
    .limit(1);

  if (!rma) {
    throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  }

  return db
    .select()
    .from(rmaMessages)
    .where(eq(rmaMessages.rmaId, rmaId))
    .orderBy(asc(rmaMessages.createdAt));
}
