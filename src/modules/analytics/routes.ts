import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte, sql, count } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import { orders, orderItems, customers, storeAccounts, supportTickets } from "../../db/schema/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultRange(fromStr?: string, toStr?: string): { from: Date; to: Date } {
  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

// ── Route handlers ────────────────────────────────────────────────────────────

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const platformPreHandler = [requireAuth, requirePlatformAdmin] as const;

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /api/analytics/overview ─────────────────────────────────────────────
  app.get(
    "/api/analytics/overview",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = request.query as { from?: string; to?: string; shopId?: string };
      const { from, to } = defaultRange(q.from, q.to);
      const storeId = request.storeAccount.id;

      // Previous period of equal length
      const periodMs = to.getTime() - from.getTime();
      const prevFrom = new Date(from.getTime() - periodMs);
      const prevTo = new Date(from.getTime());

      const shopFilter = q.shopId ? eq(orders.shopId, q.shopId) : sql`1=1`;

      // Current period aggregates
      const [curRow] = await app.db
        .select({
          orderCount: sql<string>`COUNT(${orders.id})`,
          gross: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END), 0)`,
          refunds: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} = 'refunded' THEN ${orders.totalCents} ELSE 0 END), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeAccountId, storeId),
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
            shopFilter,
          ),
        );

      // Previous period aggregates
      const [prevRow] = await app.db
        .select({
          orderCount: sql<string>`COUNT(${orders.id})`,
          gross: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeAccountId, storeId),
            gte(orders.createdAt, prevFrom),
            lte(orders.createdAt, prevTo),
            shopFilter,
          ),
        );

      // New customers in current period
      const [custRow] = await app.db
        .select({ value: sql<string>`COUNT(${customers.id})` })
        .from(customers)
        .where(
          and(
            eq(customers.storeAccountId, storeId),
            gte(customers.createdAt, from),
            lte(customers.createdAt, to),
          ),
        );

      const orderCountNum = Number(curRow?.orderCount ?? 0);
      const revenue = Number(curRow?.gross ?? 0);
      const refunds = Number(curRow?.refunds ?? 0);
      const netRevenue = revenue - refunds;
      const aov = orderCountNum > 0 ? Math.round(revenue / orderCountNum) : 0;

      return reply.send({
        orders: orderCountNum,
        revenue,
        netRevenue,
        aov,
        refunds,
        newCustomers: Number(custRow?.value ?? 0),
        prevOrders: Number(prevRow?.orderCount ?? 0),
        prevRevenue: Number(prevRow?.gross ?? 0),
      });
    },
  );

  // ── GET /api/analytics/top-products ─────────────────────────────────────────
  app.get(
    "/api/analytics/top-products",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = request.query as { from?: string; to?: string };
      const { from, to } = defaultRange(q.from, q.to);
      const storeId = request.storeAccount.id;

      const rows = await app.db
        .select({
          productId: orderItems.productId,
          title: orderItems.title,
          orderCount: sql<string>`COUNT(DISTINCT ${orderItems.orderId})`,
          quantity: sql<string>`SUM(${orderItems.quantity})`,
          revenue: sql<string>`SUM(${orderItems.totalPriceCents})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.storeAccountId, storeId),
            sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
          ),
        )
        .groupBy(orderItems.productId, orderItems.title)
        .orderBy(sql`COUNT(DISTINCT ${orderItems.orderId}) DESC`)
        .limit(10);

      return reply.send(
        rows.map((r) => ({
          productId: r.productId,
          title: r.title,
          orderCount: Number(r.orderCount),
          quantity: Number(r.quantity),
          revenue: Number(r.revenue),
        })),
      );
    },
  );

  // ── GET /api/analytics/orders-by-day ────────────────────────────────────────
  app.get(
    "/api/analytics/orders-by-day",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const q = request.query as { from?: string; to?: string };
      const { from, to } = defaultRange(q.from, q.to);
      const storeId = request.storeAccount.id;

      const rows = await app.db
        .select({
          day: sql<string>`DATE_TRUNC('day', ${orders.createdAt})::text`,
          orderCount: sql<string>`COUNT(${orders.id})`,
          revenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeAccountId, storeId),
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
          ),
        )
        .groupBy(sql`DATE_TRUNC('day', ${orders.createdAt})`)
        .orderBy(sql`DATE_TRUNC('day', ${orders.createdAt}) ASC`);

      return reply.send(
        rows.map((r) => ({
          day: r.day,
          orders: Number(r.orderCount),
          revenue: Number(r.revenue),
        })),
      );
    },
  );

  // ── GET /api/analytics/support-kpis ─────────────────────────────────────────
  app.get(
    "/api/analytics/support-kpis",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      // Open tickets
      const [openRow] = await app.db
        .select({ value: sql<string>`COUNT(${supportTickets.id})` })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.storeAccountId, storeId),
            sql`${supportTickets.status} IN ('open', 'in_progress', 'waiting_customer')`,
          ),
        );

      // Avg resolution time in hours for tickets resolved in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [avgRow] = await app.db
        .select({
          avgHours: sql<string>`COALESCE(
            AVG(
              EXTRACT(EPOCH FROM (${supportTickets.resolvedAt} - ${supportTickets.createdAt})) / 3600
            ), 0
          )`,
        })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.storeAccountId, storeId),
            sql`${supportTickets.resolvedAt} IS NOT NULL`,
            gte(supportTickets.resolvedAt, thirtyDaysAgo),
          ),
        );

      return reply.send({
        openTickets: Number(openRow?.value ?? 0),
        avgResolutionHours: Math.round(Number(avgRow?.avgHours ?? 0) * 10) / 10,
      });
    },
  );

  // ── GET /api/admin/analytics/platform ───────────────────────────────────────
  app.get(
    "/api/admin/analytics/platform",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const q = request.query as { from?: string; to?: string };
      const { from, to } = defaultRange(q.from, q.to);

      // Total store accounts
      const [totalRow] = await app.db
        .select({ value: sql<string>`COUNT(${storeAccounts.id})` })
        .from(storeAccounts);

      // Active store accounts
      const [activeRow] = await app.db
        .select({ value: sql<string>`COUNT(${storeAccounts.id})` })
        .from(storeAccounts)
        .where(eq(storeAccounts.status, "active"));

      // Total orders + gross revenue in range across all stores
      const [ordersRow] = await app.db
        .select({
          totalOrders: sql<string>`COUNT(${orders.id})`,
          grossRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END), 0)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
          ),
        );

      const totalOrders = Number(ordersRow?.totalOrders ?? 0);
      const grossRevenue = Number(ordersRow?.grossRevenue ?? 0);
      const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;

      // Top 10 store accounts by order revenue in range
      const topRows = await app.db
        .select({
          storeAccountId: orders.storeAccountId,
          orders: sql<string>`COUNT(${orders.id})`,
          revenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END), 0)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, from),
            lte(orders.createdAt, to),
          ),
        )
        .groupBy(orders.storeAccountId)
        .orderBy(sql`SUM(CASE WHEN ${orders.status} NOT IN ('cancelled','refunded') THEN ${orders.totalCents} ELSE 0 END) DESC`)
        .limit(10);

      // Enrich with store account name/slug
      const topStoreAccounts = await Promise.all(
        topRows.map(async (row) => {
          const [sa] = await app.db
            .select({ id: storeAccounts.id, name: storeAccounts.name, slug: storeAccounts.slug })
            .from(storeAccounts)
            .where(eq(storeAccounts.id, row.storeAccountId))
            .limit(1);
          return {
            id: row.storeAccountId,
            name: sa?.name ?? row.storeAccountId,
            slug: sa?.slug ?? "",
            orders: Number(row.orders),
            revenue: Number(row.revenue),
          };
        }),
      );

      return reply.send({
        totalStoreAccounts: Number(totalRow?.value ?? 0),
        activeStoreAccounts: Number(activeRow?.value ?? 0),
        totalOrders,
        grossRevenue,
        aov,
        topStoreAccounts,
      });
    },
  );
}
