import { and, eq, sql, inArray, gte, lte } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { orders, orderItems, customers } from "../../db/schema/index.js";

// ── Revenue Summary ───────────────────────────────────────────────────────────

export async function getRevenueSummary(
  db: Db,
  storeAccountId: string,
  from: Date,
  to: Date,
  groupBy: "day" | "week" | "month",
): Promise<{ period: string; revenue: number; orders: number }[]> {
  const rows = await db
    .select({
      period: sql<string>`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${orders.createdAt})::text`,
      revenue: sql<string>`COALESCE(SUM(${orders.totalCents}), 0)`,
      orders: sql<string>`COUNT(${orders.id})`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeAccountId, storeAccountId),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
      ),
    )
    .groupBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${orders.createdAt})`)
    .orderBy(sql`DATE_TRUNC(${sql.raw(`'${groupBy}'`)}, ${orders.createdAt}) ASC`);

  return rows.map((r) => ({
    period: r.period,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

// ── Orders Summary ────────────────────────────────────────────────────────────

export async function getOrdersSummary(
  db: Db,
  storeAccountId: string,
  from: Date,
  to: Date,
): Promise<{
  total: number;
  totalRevenue: number;
  avgOrderValue: number;
  byStatus: Record<string, number>;
}> {
  const rows = await db
    .select({
      status: orders.status,
      orderCount: sql<string>`COUNT(${orders.id})`,
      revenueSum: sql<string>`COALESCE(SUM(${orders.totalCents}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeAccountId, storeAccountId),
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
      ),
    )
    .groupBy(orders.status);

  let total = 0;
  let totalRevenue = 0;
  const byStatus: Record<string, number> = {};

  for (const row of rows) {
    const cnt = Number(row.orderCount);
    total += cnt;
    totalRevenue += Number(row.revenueSum);
    byStatus[row.status] = cnt;
  }

  return {
    total,
    totalRevenue,
    avgOrderValue: total > 0 ? Math.round(totalRevenue / total) : 0,
    byStatus,
  };
}

// ── Top Products ──────────────────────────────────────────────────────────────

export async function getTopProducts(
  db: Db,
  storeAccountId: string,
  from: Date,
  to: Date,
  limit: number,
): Promise<{ productId: string; title: string; quantity: number; revenue: number }[]> {
  const rows = await db
    .select({
      productId: orderItems.productId,
      title: orderItems.title,
      quantity: sql<string>`SUM(${orderItems.quantity})`,
      revenue: sql<string>`SUM(${orderItems.totalPriceCents})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.storeAccountId, storeAccountId),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
      ),
    )
    .groupBy(orderItems.productId, orderItems.title)
    .orderBy(sql`SUM(${orderItems.totalPriceCents}) DESC`)
    .limit(limit);

  return rows
    .filter((r) => r.productId !== null)
    .map((r) => ({
      productId: r.productId as string,
      title: r.title,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
}

// ── Customer Stats ────────────────────────────────────────────────────────────

export async function getCustomerStats(
  db: Db,
  storeAccountId: string,
  from: Date,
  to: Date,
): Promise<{ newCustomers: number; activeCustomers: number; returningCustomers: number }> {
  // New customers: created_at within range.
  const [newRow] = await db
    .select({ value: sql<string>`COUNT(${customers.id})` })
    .from(customers)
    .where(
      and(
        eq(customers.storeAccountId, storeAccountId),
        gte(customers.createdAt, from),
        lte(customers.createdAt, to),
      ),
    );

  // Active customers: have at least one order in range.
  const [activeRow] = await db
    .select({ value: sql<string>`COUNT(DISTINCT ${orders.customerId})` })
    .from(orders)
    .where(
      and(
        eq(orders.storeAccountId, storeAccountId),
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
        sql`${orders.customerId} IS NOT NULL`,
      ),
    );

  // Returning customers: have more than 1 order total (ordersCount > 1).
  const [returningRow] = await db
    .select({ value: sql<string>`COUNT(${customers.id})` })
    .from(customers)
    .where(
      and(
        eq(customers.storeAccountId, storeAccountId),
        sql`${customers.ordersCount} > 1`,
      ),
    );

  return {
    newCustomers: Number(newRow?.value ?? 0),
    activeCustomers: Number(activeRow?.value ?? 0),
    returningCustomers: Number(returningRow?.value ?? 0),
  };
}
