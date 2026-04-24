import { and, eq, ilike, desc, asc, count, sql, or, gte } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { orders, orderItems, customerShops } from "../../db/schema/index.js";
import { customers } from "../../db/schema/index.js";
import type { CreateOrderInput } from "./schemas.js";

// ── Order number generation ───────────────────────────────────────────────────

export async function generateOrderNumber(
  db: Db,
  storeAccountId: string,
): Promise<string> {
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

// ── List orders ───────────────────────────────────────────────────────────────

export interface ListOrdersOpts {
  page: number;
  limit: number;
  search?: string | undefined;
  status?: string | undefined;
  paymentStatus?: string | undefined;
  fulfillmentStatus?: string | undefined;
  customerId?: string | undefined;
  shopId?: string | undefined;
  sort: "createdAt" | "totalCents" | "orderNumber";
  order: "asc" | "desc";
}

export async function listOrders(
  db: Db,
  storeAccountId: string,
  opts: ListOrdersOpts,
) {
  const { page, limit, search, status, paymentStatus, fulfillmentStatus, customerId, shopId, sort, order: dir } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(orders.storeAccountId, storeAccountId)];

  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orders.customerEmail, `%${search}%`),
      )!,
    );
  }
  if (status) {
    conditions.push(eq(orders.status, status as typeof orders.status._.data));
  }
  if (paymentStatus) {
    conditions.push(eq(orders.paymentStatus, paymentStatus as typeof orders.paymentStatus._.data));
  }
  if (fulfillmentStatus) {
    conditions.push(
      eq(orders.fulfillmentStatus, fulfillmentStatus as typeof orders.fulfillmentStatus._.data),
    );
  }
  if (customerId) {
    conditions.push(eq(orders.customerId, customerId));
  }
  if (shopId) {
    conditions.push(eq(orders.shopId, shopId));
  }

  const where = and(...conditions);

  // Count total
  const [countRow] = await db
    .select({ total: count() })
    .from(orders)
    .where(where);
  const total = countRow?.total ?? 0;

  // Determine sort column
  const sortCol =
    sort === "totalCents"
      ? orders.totalCents
      : sort === "orderNumber"
        ? orders.orderNumber
        : orders.createdAt;

  const orderExpr = dir === "asc" ? asc(sortCol) : desc(sortCol);

  const rows = await db
    .select({
      id: orders.id,
      storeAccountId: orders.storeAccountId,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      shopId: orders.shopId,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentStatus: orders.fulfillmentStatus,
      customerEmail: orders.customerEmail,
      customerFirstName: orders.customerFirstName,
      customerLastName: orders.customerLastName,
      subtotalCents: orders.subtotalCents,
      discountCents: orders.discountCents,
      taxCents: orders.taxCents,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
      currency: orders.currency,
      notes: orders.notes,
      tags: orders.tags,
      processedAt: orders.processedAt,
      cancelledAt: orders.cancelledAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      itemsCount: sql<number>`(
        select count(*) from order_items
        where order_items.order_id = ${orders.id}
      )`.mapWith(Number),
    })
    .from(orders)
    .where(where)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    items: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Get order (with items) ────────────────────────────────────────────────────

export async function getOrder(
  db: Db,
  orderId: string,
  storeAccountId: string,
) {
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.storeAccountId, storeAccountId),
      ),
    );

  return { ...order, items };
}

// ── Create order ──────────────────────────────────────────────────────────────

export async function createOrder(
  db: Db,
  storeAccountId: string,
  data: CreateOrderInput,
  shopId?: string,
) {
  return db.transaction(async (tx) => {
    const orderNumber = await generateOrderNumber(tx as unknown as Db, storeAccountId);

    // Compute totals
    let subtotalCents = 0;
    let totalTaxCents = 0;
    for (const item of data.items) {
      subtotalCents += item.unitPriceCents * item.quantity;
      totalTaxCents += item.taxCents ?? 0;
    }
    const totalCents = subtotalCents + totalTaxCents;

    // Build insert values for order (handle exactOptionalPropertyTypes)
    const orderInsert: Parameters<typeof tx.insert>[0] extends never
      ? never
      : Record<string, unknown> = {
      storeAccountId,
      orderNumber,
      subtotalCents,
      taxCents: totalTaxCents,
      totalCents,
      currency: data.currency ?? "SEK",
    };

    if (data.customerId !== undefined) orderInsert["customerId"] = data.customerId;
    if (data.customerEmail !== undefined) orderInsert["customerEmail"] = data.customerEmail;
    if (data.customerFirstName !== undefined) orderInsert["customerFirstName"] = data.customerFirstName;
    if (data.customerLastName !== undefined) orderInsert["customerLastName"] = data.customerLastName;
    if (data.notes !== undefined) orderInsert["notes"] = data.notes;
    if (data.tags !== undefined) orderInsert["tags"] = data.tags;
    if (data.shippingAddress !== undefined) orderInsert["shippingAddress"] = data.shippingAddress;
    if (data.billingAddress !== undefined) orderInsert["billingAddress"] = data.billingAddress;
    if (shopId !== undefined) orderInsert["shopId"] = shopId;

    const [order] = await tx
      .insert(orders)
      .values(orderInsert as typeof orders.$inferInsert)
      .returning();

    if (!order) throw new Error("Failed to create order");

    // Insert items
    const itemInserts = data.items.map((item) => {
      const row: typeof orderItems.$inferInsert = {
        orderId: order.id,
        storeAccountId,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.unitPriceCents * item.quantity,
        taxCents: item.taxCents ?? 0,
      };
      if (item.productId !== undefined) row.productId = item.productId;
      if (item.variantId !== undefined) row.variantId = item.variantId;
      if (item.variantTitle !== undefined) row.variantTitle = item.variantTitle;
      if (item.sku !== undefined) row.sku = item.sku;
      return row;
    });

    const insertedItems = await tx.insert(orderItems).values(itemInserts).returning();

    // Update customer stats if customerId was provided
    if (data.customerId) {
      await tx
        .update(customers)
        .set({
          ordersCount: sql`${customers.ordersCount} + 1`,
          totalSpentCents: sql`${customers.totalSpentCents} + ${totalCents}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, data.customerId),
            eq(customers.storeAccountId, storeAccountId),
          ),
        );
    }

    // Upsert per-shop customer analytics
    if (data.customerId && shopId) {
      await tx
        .insert(customerShops)
        .values({
          storeAccountId,
          customerId: data.customerId,
          shopId,
          firstOrderAt: new Date(),
          lastOrderAt: new Date(),
          ordersCount: 1,
          totalSpentCents: totalCents,
        })
        .onConflictDoUpdate({
          target: [customerShops.customerId, customerShops.shopId],
          set: {
            lastOrderAt: new Date(),
            ordersCount: sql`customer_shops.orders_count + 1`,
            totalSpentCents: sql`customer_shops.total_spent_cents + ${totalCents}`,
            updatedAt: new Date(),
          },
        });
    }

    return { ...order, items: insertedItems };
  });
}

// ── Update order status ───────────────────────────────────────────────────────

export async function updateOrderStatus(
  db: Db,
  orderId: string,
  storeAccountId: string,
  status: string,
) {
  const updateValues: Partial<typeof orders.$inferInsert> = {
    status: status as typeof orders.status._.data,
    updatedAt: new Date(),
  };

  if (status === "confirmed") updateValues.processedAt = new Date();
  if (status === "cancelled") updateValues.cancelledAt = new Date();

  const [updated] = await db
    .update(orders)
    .set(updateValues)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  return updated;
}

// ── Update payment status ─────────────────────────────────────────────────────

export async function updatePaymentStatus(
  db: Db,
  orderId: string,
  storeAccountId: string,
  paymentStatus: string,
) {
  const [updated] = await db
    .update(orders)
    .set({
      paymentStatus: paymentStatus as typeof orders.paymentStatus._.data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  return updated;
}

// ── Update fulfillment status ─────────────────────────────────────────────────

export async function updateFulfillmentStatus(
  db: Db,
  orderId: string,
  storeAccountId: string,
  fulfillmentStatus: string,
) {
  const [updated] = await db
    .update(orders)
    .set({
      fulfillmentStatus: fulfillmentStatus as typeof orders.fulfillmentStatus._.data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  return updated;
}

// ── Count orders ──────────────────────────────────────────────────────────────

export async function countOrders(db: Db, storeAccountId: string): Promise<number> {
  // Count orders created in the CURRENT calendar month (UTC).
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [row] = await db
    .select({ total: count() })
    .from(orders)
    .where(
      and(
        eq(orders.storeAccountId, storeAccountId),
        gte(orders.createdAt, monthStart),
      ),
    );
  return row?.total ?? 0;
}

// ── Cancel order ──────────────────────────────────────────────────────────────

export async function cancelOrder(
  db: Db,
  orderId: string,
  storeAccountId: string,
) {
  const [updated] = await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  return updated;
}
