import { eq, and, sql, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  carts,
  cartItems,
  shippingMethods,
  checkoutSessions,
} from "../../db/schema/index.js";
import {
  inventoryLevels,
  inventoryReservations,
} from "../../db/schema/index.js";
import { orders, orderItems } from "../../db/schema/index.js";

// ── Cart functions ────────────────────────────────────────────────────────────

export async function getOrCreateCart(
  db: Db,
  opts: {
    storeAccountId: string;
    shopId: string;
    sessionId?: string;
    userId?: string;
  },
): Promise<typeof carts.$inferSelect> {
  const { storeAccountId, shopId, sessionId, userId } = opts;

  // Try to find existing open cart
  const conditions = [
    eq(carts.storeAccountId, storeAccountId),
    eq(carts.shopId, shopId),
  ];

  if (userId) {
    conditions.push(eq(carts.userId, userId));
  } else if (sessionId) {
    conditions.push(eq(carts.sessionId, sessionId));
  }

  const [existing] = await db
    .select()
    .from(carts)
    .where(and(...conditions))
    .limit(1);

  if (existing) return existing;

  // Create new cart
  const insertValues: typeof carts.$inferInsert = {
    storeAccountId,
    shopId,
  };
  if (userId !== undefined) insertValues.userId = userId;
  if (sessionId !== undefined) insertValues.sessionId = sessionId;

  const [created] = await db.insert(carts).values(insertValues).returning();
  if (!created) throw new Error("Failed to create cart");
  return created;
}

export async function getCartWithItems(
  db: Db,
  cartId: string,
  storeAccountId: string,
): Promise<{
  cart: typeof carts.$inferSelect;
  items: (typeof cartItems.$inferSelect)[];
} | null> {
  const [cart] = await db
    .select()
    .from(carts)
    .where(
      and(eq(carts.id, cartId), eq(carts.storeAccountId, storeAccountId)),
    )
    .limit(1);

  if (!cart) return null;

  const items = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.storeAccountId, storeAccountId),
      ),
    );

  return { cart, items };
}

export async function addCartItem(
  db: Db,
  cartId: string,
  storeAccountId: string,
  item: {
    variantId?: string;
    productId?: string;
    sku?: string;
    title: string;
    variantTitle?: string;
    quantity: number;
    unitPriceCents: number;
    metadata?: Record<string, unknown>;
  },
): Promise<typeof cartItems.$inferSelect> {
  // If variantId already in cart: increment quantity instead of inserting new row
  if (item.variantId) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.storeAccountId, storeAccountId),
          eq(cartItems.variantId, item.variantId),
        ),
      )
      .limit(1);

    if (existing) {
      const newQty = existing.quantity + item.quantity;
      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: newQty,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing.id))
        .returning();
      if (!updated) throw new Error("Failed to update cart item");
      return updated;
    }
  }

  const insertValues: typeof cartItems.$inferInsert = {
    cartId,
    storeAccountId,
    title: item.title,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
  };

  if (item.variantId !== undefined) insertValues.variantId = item.variantId;
  if (item.productId !== undefined) insertValues.productId = item.productId;
  if (item.sku !== undefined) insertValues.sku = item.sku;
  if (item.variantTitle !== undefined) insertValues.variantTitle = item.variantTitle;
  if (item.metadata !== undefined) insertValues.metadata = item.metadata;

  const [created] = await db.insert(cartItems).values(insertValues).returning();
  if (!created) throw new Error("Failed to create cart item");
  return created;
}

export async function updateCartItem(
  db: Db,
  cartItemId: string,
  cartId: string,
  storeAccountId: string,
  updates: {
    quantity: number; // if 0, delete
  },
): Promise<void> {
  if (updates.quantity === 0) {
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.id, cartItemId),
          eq(cartItems.cartId, cartId),
          eq(cartItems.storeAccountId, storeAccountId),
        ),
      );
    return;
  }

  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.id, cartItemId),
        eq(cartItems.cartId, cartId),
        eq(cartItems.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!item) {
    throw Object.assign(new Error("Cart item not found"), { statusCode: 404 });
  }

  await db
    .update(cartItems)
    .set({
      quantity: updates.quantity,
      updatedAt: new Date(),
    })
    .where(eq(cartItems.id, cartItemId));
}

export async function clearCart(db: Db, cartId: string): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

export async function updateCart(
  db: Db,
  cartId: string,
  storeAccountId: string,
  updates: {
    couponCode?: string;
    notes?: string;
  },
): Promise<void> {
  // exactOptionalPropertyTypes: build update object imperatively
  const setValues: Partial<typeof carts.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (updates.couponCode !== undefined) setValues.couponCode = updates.couponCode;
  if (updates.notes !== undefined) setValues.notes = updates.notes;

  await db
    .update(carts)
    .set(setValues)
    .where(
      and(
        eq(carts.id, cartId),
        eq(carts.storeAccountId, storeAccountId),
      ),
    );
}

// ── Checkout functions ────────────────────────────────────────────────────────

export async function startCheckout(
  db: Db,
  opts: {
    storeAccountId: string;
    shopId: string;
    cartId: string;
    email?: string;
  },
): Promise<typeof checkoutSessions.$inferSelect> {
  const { storeAccountId, shopId, cartId, email } = opts;

  // Compute subtotal from cart items
  const items = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.storeAccountId, storeAccountId),
      ),
    );

  if (items.length === 0) {
    throw Object.assign(new Error("Cart is empty"), { statusCode: 400 });
  }

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // +30 minutes

  const insertValues: typeof checkoutSessions.$inferInsert = {
    storeAccountId,
    shopId,
    cartId,
    status: "pending",
    subtotalCents,
    discountCents: 0,
    taxCents: 0,
    shippingCents: 0,
    totalCents: subtotalCents,
    expiresAt,
  };

  if (email !== undefined) insertValues.email = email;

  const [session] = await db
    .insert(checkoutSessions)
    .values(insertValues)
    .returning();

  if (!session) throw new Error("Failed to create checkout session");
  return session;
}

export async function setCheckoutAddress(
  db: Db,
  sessionId: string,
  storeAccountId: string,
  opts: {
    email: string;
    shippingAddress: Record<string, unknown>;
    billingAddress: Record<string, unknown>;
  },
): Promise<typeof checkoutSessions.$inferSelect> {
  const [updated] = await db
    .update(checkoutSessions)
    .set({
      email: opts.email,
      shippingAddress: opts.shippingAddress,
      billingAddress: opts.billingAddress,
      status: "address",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(checkoutSessions.id, sessionId),
        eq(checkoutSessions.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Checkout session not found"), { statusCode: 404 });
  }
  return updated;
}

export async function setCheckoutShipping(
  db: Db,
  sessionId: string,
  storeAccountId: string,
  shippingMethodId: string,
): Promise<typeof checkoutSessions.$inferSelect> {
  // Fetch the current session
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, sessionId),
        eq(checkoutSessions.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!session) {
    throw Object.assign(new Error("Checkout session not found"), { statusCode: 404 });
  }

  // Fetch shipping method
  const [method] = await db
    .select()
    .from(shippingMethods)
    .where(
      and(
        eq(shippingMethods.id, shippingMethodId),
        eq(shippingMethods.storeAccountId, storeAccountId),
        eq(shippingMethods.isActive, true),
      ),
    )
    .limit(1);

  if (!method) {
    throw Object.assign(new Error("Shipping method not found"), { statusCode: 404 });
  }

  // Determine shipping cost — free if subtotal exceeds freeAboveCents
  let shippingCents = method.priceCents;
  if (method.freeAboveCents !== null && session.subtotalCents >= method.freeAboveCents) {
    shippingCents = 0;
  }

  // totalCents = subtotalCents - discountCents + taxCents + shippingCents
  const totalCents =
    session.subtotalCents -
    session.discountCents +
    session.taxCents +
    shippingCents;

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      selectedShippingMethodId: shippingMethodId,
      shippingCents,
      totalCents,
      status: "shipping",
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, sessionId))
    .returning();

  if (!updated) throw new Error("Failed to update checkout session");
  return updated;
}

export async function reserveInventory(
  db: Db,
  opts: {
    storeAccountId: string;
    shopId: string;
    checkoutSessionId: string;
    cartItems: (typeof cartItems.$inferSelect)[];
  },
): Promise<{ ok: boolean; insufficientSkus: string[] }> {
  const { storeAccountId, shopId, checkoutSessionId } = opts;
  const insufficientSkus: string[] = [];

  // Only check items with a SKU
  const skuItems = opts.cartItems.filter((item) => !!item.sku);

  if (skuItems.length === 0) {
    // No inventory-tracked items — advance to payment status
    await db
      .update(checkoutSessions)
      .set({ status: "payment", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, checkoutSessionId));
    return { ok: true, insufficientSkus: [] };
  }

  // Check availability for each SKU
  for (const item of skuItems) {
    const sku = item.sku!;

    const rows = await db
      .select({
        totalAvailable: sql<number>`SUM(${inventoryLevels.qtyAvailable})`.mapWith(Number),
      })
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.storeAccountId, storeAccountId),
          eq(inventoryLevels.sku, sku),
        ),
      );

    const totalAvailable = rows[0]?.totalAvailable ?? 0;
    if (totalAvailable < item.quantity) {
      insufficientSkus.push(sku);
    }
  }

  if (insufficientSkus.length > 0) {
    return { ok: false, insufficientSkus };
  }

  // All items have sufficient stock — create reservations within a transaction
  const reservationIds: string[] = [];

  await db.transaction(async (tx) => {
    for (const item of skuItems) {
      const sku = item.sku!;
      let remainingQty = item.quantity;

      // Get warehouse inventory levels, highest qty_available first
      const levels = await tx
        .select()
        .from(inventoryLevels)
        .where(
          and(
            eq(inventoryLevels.storeAccountId, storeAccountId),
            eq(inventoryLevels.sku, sku),
          ),
        );

      levels.sort((a, b) => b.qtyAvailable - a.qtyAvailable);

      for (const level of levels) {
        if (remainingQty <= 0) break;

        const allocateQty = Math.min(level.qtyAvailable, remainingQty);
        if (allocateQty <= 0) continue;

        remainingQty -= allocateQty;

        // Decrement qty_available, increment qty_reserved
        await tx
          .update(inventoryLevels)
          .set({
            qtyAvailable: sql`${inventoryLevels.qtyAvailable} - ${allocateQty}`,
            qtyReserved: sql`${inventoryLevels.qtyReserved} + ${allocateQty}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryLevels.id, level.id));

        // Insert reservation; orderId is required — use checkoutSessionId as
        // placeholder until the order is confirmed.
        const reservationInsert: typeof inventoryReservations.$inferInsert = {
          storeAccountId,
          shopId,
          orderId: checkoutSessionId,
          warehouseId: level.warehouseId,
          sku,
          qtyReserved: allocateQty,
          status: "pending",
          allocationStrategy: "priority",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };

        if (item.variantId !== undefined && item.variantId !== null) {
          reservationInsert.variantId = item.variantId;
        }

        const [reservation] = await tx
          .insert(inventoryReservations)
          .values(reservationInsert)
          .returning();

        if (reservation) {
          reservationIds.push(reservation.id);
        }
      }
    }

    // Store reservation IDs on the checkout session and advance to payment
    await tx
      .update(checkoutSessions)
      .set({
        reservationIds,
        status: "payment",
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, checkoutSessionId));
  });

  return { ok: true, insufficientSkus: [] };
}

export async function confirmCheckout(
  db: Db,
  sessionId: string,
  storeAccountId: string,
  opts: {
    paymentId: string;
  },
): Promise<{ orderId: string; orderNumber: string }> {
  return db.transaction(async (tx) => {
    // 1. Load checkout session
    const [session] = await tx
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.id, sessionId),
          eq(checkoutSessions.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!session) {
      throw Object.assign(new Error("Checkout session not found"), { statusCode: 404 });
    }

    if (session.status === "confirmed") {
      throw Object.assign(new Error("Checkout already confirmed"), { statusCode: 409 });
    }

    // Load cart items
    const items = await tx
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, session.cartId),
          eq(cartItems.storeAccountId, storeAccountId),
        ),
      );

    // 2. Generate order number
    const orderNumber = await generateOrderNumber(tx as unknown as Db, storeAccountId);

    // 3. Insert order
    const orderInsert: typeof orders.$inferInsert = {
      storeAccountId,
      orderNumber,
      status: "confirmed",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      subtotalCents: session.subtotalCents,
      discountCents: session.discountCents,
      taxCents: session.taxCents,
      shippingCents: session.shippingCents,
      totalCents: session.totalCents,
      currency: session.currency,
      processedAt: new Date(),
      metadata: { paymentId: opts.paymentId },
    };

    if (session.shopId !== undefined && session.shopId !== null) {
      orderInsert.shopId = session.shopId;
    }
    if (session.email !== undefined && session.email !== null) {
      orderInsert.customerEmail = session.email;
    }
    if (session.shippingAddress !== undefined && session.shippingAddress !== null) {
      orderInsert.shippingAddress = session.shippingAddress;
    }
    if (session.billingAddress !== undefined && session.billingAddress !== null) {
      orderInsert.billingAddress = session.billingAddress;
    }

    const [order] = await tx.insert(orders).values(orderInsert).returning();
    if (!order) throw new Error("Failed to create order");

    // 4. Insert order items
    const itemInserts: (typeof orderItems.$inferInsert)[] = items.map((item) => {
      const row: typeof orderItems.$inferInsert = {
        orderId: order.id,
        storeAccountId,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.unitPriceCents * item.quantity,
        taxCents: 0,
      };
      if (item.productId !== undefined && item.productId !== null) row.productId = item.productId;
      if (item.variantId !== undefined && item.variantId !== null) row.variantId = item.variantId;
      if (item.variantTitle !== undefined && item.variantTitle !== null) row.variantTitle = item.variantTitle;
      if (item.sku !== undefined && item.sku !== null) row.sku = item.sku;
      if (item.metadata !== undefined && item.metadata !== null) row.metadata = item.metadata;
      return row;
    });

    if (itemInserts.length > 0) {
      await tx.insert(orderItems).values(itemInserts);
    }

    // 5. Commit reservations — update orderId from placeholder to real order id
    const reservationIds = session.reservationIds ?? [];
    if (reservationIds.length > 0) {
      await tx
        .update(inventoryReservations)
        .set({
          status: "committed",
          committedAt: new Date(),
          updatedAt: new Date(),
          orderId: order.id,
        })
        .where(inArray(inventoryReservations.id, reservationIds));
    }

    // 6. Update checkout session
    await tx
      .update(checkoutSessions)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        orderId: order.id,
        updatedAt: new Date(),
      })
      .where(eq(checkoutSessions.id, sessionId));

    // 7. Clear the cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, session.cartId));

    // 8. Return result
    return { orderId: order.id, orderNumber: order.orderNumber };
  });
}

export async function abandonCheckout(db: Db, sessionId: string): Promise<void> {
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const reservationIds = session.reservationIds ?? [];
  if (reservationIds.length > 0) {
    await releaseReservations(db, reservationIds);
  }

  await db
    .update(checkoutSessions)
    .set({
      status: "abandoned",
      abandonedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, sessionId));
}

export async function releaseReservations(
  db: Db,
  reservationIds: string[],
): Promise<void> {
  if (reservationIds.length === 0) return;

  await db.transaction(async (tx) => {
    // Load all pending reservations
    const reservations = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          inArray(inventoryReservations.id, reservationIds),
          eq(inventoryReservations.status, "pending"),
        ),
      );

    for (const reservation of reservations) {
      // Return qty to available, subtract from reserved
      await tx
        .update(inventoryLevels)
        .set({
          qtyAvailable: sql`${inventoryLevels.qtyAvailable} + ${reservation.qtyReserved}`,
          qtyReserved: sql`${inventoryLevels.qtyReserved} - ${reservation.qtyReserved}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryLevels.warehouseId, reservation.warehouseId),
            eq(inventoryLevels.sku, reservation.sku),
          ),
        );
    }

    // Mark all as released
    await tx
      .update(inventoryReservations)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(inventoryReservations.id, reservationIds));
  });
}

// ── Shipping method admin functions ───────────────────────────────────────────

export async function listShippingMethods(
  db: Db,
  storeAccountId: string,
  shopId?: string,
): Promise<(typeof shippingMethods.$inferSelect)[]> {
  const conditions = [eq(shippingMethods.storeAccountId, storeAccountId)];
  if (shopId !== undefined) {
    conditions.push(eq(shippingMethods.shopId, shopId));
  }

  return db
    .select()
    .from(shippingMethods)
    .where(and(...conditions))
    .orderBy(shippingMethods.sortOrder, shippingMethods.name);
}

export async function createShippingMethod(
  db: Db,
  storeAccountId: string,
  data: {
    shopId?: string;
    name: string;
    carrier?: string;
    estimatedDays?: number;
    priceCents: number;
    freeAboveCents?: number;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<typeof shippingMethods.$inferSelect> {
  const insertValues: typeof shippingMethods.$inferInsert = {
    storeAccountId,
    name: data.name,
    priceCents: data.priceCents,
  };

  if (data.shopId !== undefined) insertValues.shopId = data.shopId;
  if (data.carrier !== undefined) insertValues.carrier = data.carrier;
  if (data.estimatedDays !== undefined) insertValues.estimatedDays = data.estimatedDays;
  if (data.freeAboveCents !== undefined) insertValues.freeAboveCents = data.freeAboveCents;
  if (data.isActive !== undefined) insertValues.isActive = data.isActive;
  if (data.sortOrder !== undefined) insertValues.sortOrder = data.sortOrder;

  const [created] = await db
    .insert(shippingMethods)
    .values(insertValues)
    .returning();

  if (!created) throw new Error("Failed to create shipping method");
  return created;
}

export async function updateShippingMethod(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<{
    name: string;
    carrier: string;
    estimatedDays: number;
    priceCents: number;
    freeAboveCents: number;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<void> {
  const setValues: Partial<typeof shippingMethods.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) setValues.name = data.name;
  if (data.carrier !== undefined) setValues.carrier = data.carrier;
  if (data.estimatedDays !== undefined) setValues.estimatedDays = data.estimatedDays;
  if (data.priceCents !== undefined) setValues.priceCents = data.priceCents;
  if (data.freeAboveCents !== undefined) setValues.freeAboveCents = data.freeAboveCents;
  if (data.isActive !== undefined) setValues.isActive = data.isActive;
  if (data.sortOrder !== undefined) setValues.sortOrder = data.sortOrder;

  await db
    .update(shippingMethods)
    .set(setValues)
    .where(
      and(
        eq(shippingMethods.id, id),
        eq(shippingMethods.storeAccountId, storeAccountId),
      ),
    );
}

export async function deleteShippingMethod(
  db: Db,
  id: string,
  storeAccountId: string,
): Promise<void> {
  await db
    .delete(shippingMethods)
    .where(
      and(
        eq(shippingMethods.id, id),
        eq(shippingMethods.storeAccountId, storeAccountId),
      ),
    );
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function generateOrderNumber(db: Db, storeAccountId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const candidate = `ORD-${timestamp}-${suffix}`;

    const [existing] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.storeAccountId, storeAccountId),
          eq(orders.orderNumber, candidate),
        ),
      )
      .limit(1);

    if (!existing) return candidate;
  }
  throw new Error("Failed to generate a unique order number after 10 attempts");
}
