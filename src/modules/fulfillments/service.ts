import type { Db } from "../../db/client.js";
import {
  orders,
  orderItems,
} from "../../db/schema/orders.js";
import {
  orderFulfillments,
  fulfillmentItems,
  fulfillmentTrackingEvents,
} from "../../db/schema/fulfillments.js";
import {
  inventoryLevels,
  inventoryReservations,
} from "../../db/schema/inventory.js";
import { eq, and, inArray, sql } from "drizzle-orm";

// ── Order status machine ──────────────────────────────────────────────────────

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:    ["confirmed", "cancelled"],
  confirmed:  ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped:    ["delivered", "cancelled"],
  delivered:  ["refunded"],
  cancelled:  [],
  refunded:   [],
};

export function canTransition(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export async function updateOrderStatus(
  db: Db,
  orderId: string,
  storeAccountId: string,
  newStatus: string,
): Promise<{ ok: boolean; error?: string }> {
  const [existing] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!existing) {
    return { ok: false, error: "Order not found" };
  }

  if (!canTransition(existing.status, newStatus)) {
    return { ok: false, error: `Invalid transition from ${existing.status} to ${newStatus}` };
  }

  const upd: {
    status: typeof orders.$inferInsert["status"];
    updatedAt: Date;
    cancelledAt?: Date;
    processedAt?: Date;
  } = {
    status: newStatus as typeof orders.$inferInsert["status"],
    updatedAt: new Date(),
  };

  if (newStatus === "cancelled") {
    upd.cancelledAt = new Date();
  }
  if (newStatus === "confirmed") {
    upd.processedAt = new Date();
  }

  await db
    .update(orders)
    .set(upd)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)));

  if (newStatus === "cancelled") {
    await releaseOrderInventory(db, orderId);
  }

  return { ok: true };
}

export async function releaseOrderInventory(db: Db, orderId: string): Promise<void> {
  const reservations = await db
    .select({
      id: inventoryReservations.id,
      warehouseId: inventoryReservations.warehouseId,
      sku: inventoryReservations.sku,
      qtyReserved: inventoryReservations.qtyReserved,
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, orderId),
        inArray(inventoryReservations.status, ["pending", "committed"]),
      ),
    );

  if (reservations.length === 0) return;

  for (const reservation of reservations) {
    await db
      .update(inventoryLevels)
      .set({
        qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${reservation.qtyReserved}`,
        qtyReserved: sql`${inventoryLevels.qtyReserved} - ${reservation.qtyReserved}`,
      })
      .where(
        and(
          eq(inventoryLevels.warehouseId, reservation.warehouseId),
          eq(inventoryLevels.sku, reservation.sku),
        ),
      );
  }

  const ids = reservations.map((r) => r.id);
  await db
    .update(inventoryReservations)
    .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
    .where(inArray(inventoryReservations.id, ids));
}

// ── Fulfillment creation ──────────────────────────────────────────────────────

export async function createFulfillment(
  db: Db,
  storeAccountId: string,
  data: {
    orderId: string;
    items: Array<{ orderItemId: string; sku?: string; quantity: number }>;
    trackingNumber?: string;
    trackingCarrier?: string;
    trackingUrl?: string;
    shippingMethodName?: string;
    estimatedDeliveryAt?: string;
    notes?: string;
  },
): Promise<typeof orderFulfillments.$inferSelect> {
  // 1. Verify order belongs to storeAccountId and is in a fulfillable status
  const [order] = await db
    .select({ id: orders.id, status: orders.status, storeAccountId: orders.storeAccountId })
    .from(orders)
    .where(and(eq(orders.id, data.orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "confirmed" && order.status !== "processing") {
    throw new Error(`Order is not in a fulfillable status (current: ${order.status})`);
  }

  // 2. Verify each item and check quantities
  for (const item of data.items) {
    const [orderItem] = await db
      .select({ id: orderItems.id, quantity: orderItems.quantity, orderId: orderItems.orderId })
      .from(orderItems)
      .where(and(eq(orderItems.id, item.orderItemId), eq(orderItems.orderId, data.orderId)))
      .limit(1);

    if (!orderItem) {
      throw new Error(`Order item ${item.orderItemId} not found on order`);
    }

    // Count already fulfilled quantity for this item
    const existingFulfillments = await db
      .select({ quantity: fulfillmentItems.quantity })
      .from(fulfillmentItems)
      .innerJoin(
        orderFulfillments,
        eq(fulfillmentItems.fulfillmentId, orderFulfillments.id),
      )
      .where(
        and(
          eq(fulfillmentItems.orderItemId, item.orderItemId),
          inArray(orderFulfillments.status, ["pending", "packed", "shipped", "delivered"]),
        ),
      );

    const alreadyFulfilled = existingFulfillments.reduce((sum, f) => sum + f.quantity, 0);
    const remaining = orderItem.quantity - alreadyFulfilled;

    if (item.quantity > remaining) {
      throw new Error(
        `Item ${item.orderItemId}: requested quantity ${item.quantity} exceeds remaining unfulfilled quantity ${remaining}`,
      );
    }
  }

  // 3. INSERT into orderFulfillments
  const newFulfillmentData: typeof orderFulfillments.$inferInsert = {
    orderId: data.orderId,
    storeAccountId,
    status: "pending",
  };

  if (data.trackingNumber !== undefined) newFulfillmentData.trackingNumber = data.trackingNumber;
  if (data.trackingCarrier !== undefined) newFulfillmentData.trackingCarrier = data.trackingCarrier;
  if (data.trackingUrl !== undefined) newFulfillmentData.trackingUrl = data.trackingUrl;
  if (data.shippingMethodName !== undefined) newFulfillmentData.shippingMethodName = data.shippingMethodName;
  if (data.estimatedDeliveryAt !== undefined) newFulfillmentData.estimatedDeliveryAt = new Date(data.estimatedDeliveryAt);
  if (data.notes !== undefined) newFulfillmentData.notes = data.notes;

  const [createdFulfillment] = await db
    .insert(orderFulfillments)
    .values(newFulfillmentData)
    .returning();

  if (!createdFulfillment) {
    throw new Error("Failed to create fulfillment");
  }

  // 4. INSERT fulfillmentItems
  for (const item of data.items) {
    const fItemData: typeof fulfillmentItems.$inferInsert = {
      fulfillmentId: createdFulfillment.id,
      orderItemId: item.orderItemId,
      storeAccountId,
      quantity: item.quantity,
    };
    if (item.sku !== undefined) fItemData.sku = item.sku;

    await db.insert(fulfillmentItems).values(fItemData);
  }

  // 5. Commit inventory: for each item with a SKU
  for (const item of data.items) {
    const sku = item.sku;
    if (!sku) continue;

    // Find pending reservations for this order+sku and mark as committed
    const pendingReservations = await db
      .select({ id: inventoryReservations.id })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, data.orderId),
          eq(inventoryReservations.sku, sku),
          eq(inventoryReservations.status, "pending"),
        ),
      );

    if (pendingReservations.length > 0) {
      const pendingIds = pendingReservations.map((r) => r.id);
      await db
        .update(inventoryReservations)
        .set({ status: "committed", committedAt: new Date(), updatedAt: new Date() })
        .where(inArray(inventoryReservations.id, pendingIds));
    }

    // Find committed reservations for this order+sku to decrement qty_reserved
    const committedReservations = await db
      .select({ warehouseId: inventoryReservations.warehouseId, qtyReserved: inventoryReservations.qtyReserved })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, data.orderId),
          eq(inventoryReservations.sku, sku),
          eq(inventoryReservations.status, "committed"),
        ),
      );

    for (const reservation of committedReservations) {
      await db
        .update(inventoryLevels)
        .set({
          qtyReserved: sql`${inventoryLevels.qtyReserved} - ${item.quantity}`,
        })
        .where(
          and(
            eq(inventoryLevels.warehouseId, reservation.warehouseId),
            eq(inventoryLevels.sku, sku),
          ),
        );
    }
  }

  // 6. Check if all order items are now fulfilled
  const summary = await getFulfillmentSummary(db, data.orderId);

  if (summary.isComplete) {
    await db
      .update(orders)
      .set({ fulfillmentStatus: "fulfilled", fulfilledAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, data.orderId));
  } else {
    await db
      .update(orders)
      .set({ fulfillmentStatus: "partial", updatedAt: new Date() })
      .where(eq(orders.id, data.orderId));
  }

  // 7. Advance order to 'processing' if still 'confirmed'
  if (order.status === "confirmed") {
    await db
      .update(orders)
      .set({ status: "processing", updatedAt: new Date() })
      .where(and(eq(orders.id, data.orderId), eq(orders.status, "confirmed")));
  }

  return createdFulfillment;
}

export async function listFulfillments(
  db: Db,
  orderId: string,
  storeAccountId: string,
): Promise<(typeof orderFulfillments.$inferSelect)[]> {
  return db
    .select()
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.orderId, orderId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    );
}

export async function getFulfillment(
  db: Db,
  fulfillmentId: string,
  storeAccountId: string,
): Promise<typeof orderFulfillments.$inferSelect | null> {
  const [fulfillment] = await db
    .select()
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  return fulfillment ?? null;
}

export async function updateFulfillment(
  db: Db,
  fulfillmentId: string,
  storeAccountId: string,
  data: {
    status?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    trackingUrl?: string;
    shippingMethodName?: string;
    estimatedDeliveryAt?: string;
    notes?: string;
  },
): Promise<void> {
  const [existing] = await db
    .select({ status: orderFulfillments.status, orderId: orderFulfillments.orderId })
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Fulfillment not found");
  }

  const upd: Partial<typeof orderFulfillments.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (data.status !== undefined) {
    upd.status = data.status as typeof orderFulfillments.$inferInsert["status"];
  }
  if (data.trackingNumber !== undefined) upd.trackingNumber = data.trackingNumber;
  if (data.trackingCarrier !== undefined) upd.trackingCarrier = data.trackingCarrier;
  if (data.trackingUrl !== undefined) upd.trackingUrl = data.trackingUrl;
  if (data.shippingMethodName !== undefined) upd.shippingMethodName = data.shippingMethodName;
  if (data.estimatedDeliveryAt !== undefined) upd.estimatedDeliveryAt = new Date(data.estimatedDeliveryAt);
  if (data.notes !== undefined) upd.notes = data.notes;

  if (data.status === "shipped") {
    upd.shippedAt = new Date();

    // Advance order to shipped
    const orderUpd: {
      status: typeof orders.$inferInsert["status"];
      updatedAt: Date;
      trackingNumber?: string;
      trackingCarrier?: string;
      trackingUrl?: string;
      shippingMethodName?: string;
    } = { status: "shipped", updatedAt: new Date() };

    if (data.trackingNumber !== undefined) orderUpd.trackingNumber = data.trackingNumber;
    if (data.trackingCarrier !== undefined) orderUpd.trackingCarrier = data.trackingCarrier;
    if (data.trackingUrl !== undefined) orderUpd.trackingUrl = data.trackingUrl;
    if (data.shippingMethodName !== undefined) orderUpd.shippingMethodName = data.shippingMethodName;

    await db
      .update(orders)
      .set(orderUpd)
      .where(
        and(
          eq(orders.id, existing.orderId),
          eq(orders.storeAccountId, storeAccountId),
          inArray(orders.status, ["confirmed", "processing", "shipped"]),
        ),
      );
  }

  if (data.status === "delivered") {
    upd.deliveredAt = new Date();

    await db
      .update(orders)
      .set({ status: "delivered", updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, existing.orderId),
          eq(orders.storeAccountId, storeAccountId),
          inArray(orders.status, ["shipped", "delivered"]),
        ),
      );
  }

  if (data.status === "cancelled") {
    upd.cancelledAt = new Date();
    await releaseFulfillmentInventory(db, fulfillmentId);
  }

  await db
    .update(orderFulfillments)
    .set(upd)
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    );
}

export async function cancelFulfillment(
  db: Db,
  fulfillmentId: string,
  storeAccountId: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: orderFulfillments.id })
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Fulfillment not found");
  }

  await releaseFulfillmentInventory(db, fulfillmentId);

  await db
    .update(orderFulfillments)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    );
}

async function releaseFulfillmentInventory(db: Db, fulfillmentId: string): Promise<void> {
  // Get items in this fulfillment that have a SKU
  const fItems = await db
    .select({ orderItemId: fulfillmentItems.orderItemId, sku: fulfillmentItems.sku, quantity: fulfillmentItems.quantity })
    .from(fulfillmentItems)
    .where(eq(fulfillmentItems.fulfillmentId, fulfillmentId));

  const orderId = await (async () => {
    const [f] = await db
      .select({ orderId: orderFulfillments.orderId })
      .from(orderFulfillments)
      .where(eq(orderFulfillments.id, fulfillmentId))
      .limit(1);
    return f?.orderId;
  })();

  if (!orderId) return;

  for (const fItem of fItems) {
    if (!fItem.sku) continue;

    // Find committed reservations for this order+sku and restore inventory
    const reservations = await db
      .select({
        id: inventoryReservations.id,
        warehouseId: inventoryReservations.warehouseId,
        qtyReserved: inventoryReservations.qtyReserved,
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.sku, fItem.sku),
          inArray(inventoryReservations.status, ["pending", "committed"]),
        ),
      );

    const ids = reservations.map((r) => r.id);

    for (const reservation of reservations) {
      await db
        .update(inventoryLevels)
        .set({
          qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${fItem.quantity}`,
          qtyReserved: sql`${inventoryLevels.qtyReserved} - ${fItem.quantity}`,
        })
        .where(
          and(
            eq(inventoryLevels.warehouseId, reservation.warehouseId),
            eq(inventoryLevels.sku, fItem.sku),
          ),
        );
    }

    if (ids.length > 0) {
      await db
        .update(inventoryReservations)
        .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
        .where(inArray(inventoryReservations.id, ids));
    }
  }
}

// ── Tracking events ───────────────────────────────────────────────────────────

export async function addTrackingEvent(
  db: Db,
  fulfillmentId: string,
  storeAccountId: string,
  data: { status: string; description?: string; location?: string; occurredAt: string },
): Promise<void> {
  // Verify fulfillment belongs to store
  const [fulfillment] = await db
    .select({ id: orderFulfillments.id })
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.id, fulfillmentId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!fulfillment) {
    throw new Error("Fulfillment not found");
  }

  const eventData: typeof fulfillmentTrackingEvents.$inferInsert = {
    fulfillmentId,
    status: data.status,
    occurredAt: new Date(data.occurredAt),
  };

  if (data.description !== undefined) eventData.description = data.description;
  if (data.location !== undefined) eventData.location = data.location;

  await db.insert(fulfillmentTrackingEvents).values(eventData);

  // Cascade status update if status matches known transitions
  const statusLower = data.status.toLowerCase();
  if (statusLower.includes("shipped")) {
    await updateFulfillment(db, fulfillmentId, storeAccountId, { status: "shipped" });
  } else if (statusLower.includes("delivered")) {
    await updateFulfillment(db, fulfillmentId, storeAccountId, { status: "delivered" });
  }
}

export async function listTrackingEvents(
  db: Db,
  fulfillmentId: string,
): Promise<(typeof fulfillmentTrackingEvents.$inferSelect)[]> {
  return db
    .select()
    .from(fulfillmentTrackingEvents)
    .where(eq(fulfillmentTrackingEvents.fulfillmentId, fulfillmentId));
}

// ── Order queries ─────────────────────────────────────────────────────────────

export async function getOrderWithFulfillments(
  db: Db,
  orderId: string,
  storeAccountId: string,
): Promise<{
  order: typeof orders.$inferSelect;
  items: (typeof orderItems.$inferSelect)[];
  fulfillments: Array<typeof orderFulfillments.$inferSelect & {
    items: (typeof fulfillmentItems.$inferSelect)[];
    trackingEvents: (typeof fulfillmentTrackingEvents.$inferSelect)[];
  }>;
} | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeAccountId, storeAccountId)))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const fulfillmentRows = await db
    .select()
    .from(orderFulfillments)
    .where(
      and(
        eq(orderFulfillments.orderId, orderId),
        eq(orderFulfillments.storeAccountId, storeAccountId),
      ),
    );

  const fulfillmentsWithDetails = await Promise.all(
    fulfillmentRows.map(async (f) => {
      const fItems = await db
        .select()
        .from(fulfillmentItems)
        .where(eq(fulfillmentItems.fulfillmentId, f.id));

      const trackingEvents = await db
        .select()
        .from(fulfillmentTrackingEvents)
        .where(eq(fulfillmentTrackingEvents.fulfillmentId, f.id));

      return { ...f, items: fItems, trackingEvents };
    }),
  );

  return { order, items, fulfillments: fulfillmentsWithDetails };
}

export async function getFulfillmentSummary(
  db: Db,
  orderId: string,
): Promise<{
  totalItems: number;
  fulfilledItems: number;
  isPartial: boolean;
  isComplete: boolean;
}> {
  const allOrderItems = await db
    .select({ id: orderItems.id, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const totalItems = allOrderItems.reduce((sum, i) => sum + i.quantity, 0);

  if (allOrderItems.length === 0) {
    return { totalItems: 0, fulfilledItems: 0, isPartial: false, isComplete: false };
  }

  const allOrderItemIds = allOrderItems.map((i) => i.id);

  const fulfilledRows = await db
    .select({ quantity: fulfillmentItems.quantity })
    .from(fulfillmentItems)
    .innerJoin(orderFulfillments, eq(fulfillmentItems.fulfillmentId, orderFulfillments.id))
    .where(
      and(
        inArray(fulfillmentItems.orderItemId, allOrderItemIds),
        inArray(orderFulfillments.status, ["pending", "packed", "shipped", "delivered"]),
      ),
    );

  const fulfilledItems = fulfilledRows.reduce((sum, r) => sum + r.quantity, 0);
  const isComplete = fulfilledItems >= totalItems;
  const isPartial = fulfilledItems > 0 && !isComplete;

  return { totalItems, fulfilledItems, isPartial, isComplete };
}
