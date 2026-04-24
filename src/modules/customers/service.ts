import { and, eq, ilike, desc, asc, count, sql, or } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { customers, customerAddresses, customerShops, orders } from "../../db/schema/index.js";
import type { CreateCustomerInput, UpdateCustomerInput, CreateAddressInput, UpdateAddressInput } from "./schemas.js";

// ── List customers ────────────────────────────────────────────────────────────

export interface ListCustomersOpts {
  page: number;
  limit: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  acceptsMarketing?: boolean | undefined;
  shopId?: string | undefined;
  sort: "createdAt" | "totalSpentCents" | "ordersCount";
  order: "asc" | "desc";
}

export async function listCustomers(
  db: Db,
  storeAccountId: string,
  opts: ListCustomersOpts,
) {
  const { page, limit, search, isActive, acceptsMarketing, shopId, sort, order: dir } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(customers.storeAccountId, storeAccountId)];

  if (search) {
    conditions.push(
      or(
        ilike(customers.email, `%${search}%`),
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
      )!,
    );
  }
  if (isActive !== undefined) {
    conditions.push(eq(customers.isActive, isActive));
  }
  if (acceptsMarketing !== undefined) {
    conditions.push(eq(customers.acceptsMarketing, acceptsMarketing));
  }

  const where = and(...conditions);

  const sortCol =
    sort === "totalSpentCents"
      ? customers.totalSpentCents
      : sort === "ordersCount"
        ? customers.ordersCount
        : customers.createdAt;

  const orderExpr = dir === "asc" ? asc(sortCol) : desc(sortCol);

  if (shopId) {
    // Inner-join with customer_shops to filter to customers who have ordered from this shop.
    const [countRow] = await db
      .select({ total: count() })
      .from(customers)
      .innerJoin(
        customerShops,
        and(
          eq(customerShops.customerId, customers.id),
          eq(customerShops.shopId, shopId),
        ),
      )
      .where(where);
    const total = countRow?.total ?? 0;

    const items = await db
      .select({ customers })
      .from(customers)
      .innerJoin(
        customerShops,
        and(
          eq(customerShops.customerId, customers.id),
          eq(customerShops.shopId, shopId),
        ),
      )
      .where(where)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset)
      .then((rows) => rows.map((r) => r.customers));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  const [countRow] = await db
    .select({ total: count() })
    .from(customers)
    .where(where);
  const total = countRow?.total ?? 0;

  const items = await db
    .select()
    .from(customers)
    .where(where)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Get customer (with addresses) ─────────────────────────────────────────────

export async function getCustomer(
  db: Db,
  customerId: string,
  storeAccountId: string,
) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!customer) return null;

  const addresses = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeAccountId, storeAccountId),
      ),
    );

  return { ...customer, addresses };
}

// ── Create customer ───────────────────────────────────────────────────────────

export async function createCustomer(
  db: Db,
  storeAccountId: string,
  data: CreateCustomerInput,
) {
  const insertValues: typeof customers.$inferInsert = {
    storeAccountId,
    email: data.email,
  };

  if (data.firstName !== undefined) insertValues.firstName = data.firstName;
  if (data.lastName !== undefined) insertValues.lastName = data.lastName;
  if (data.phone !== undefined) insertValues.phone = data.phone;
  if (data.acceptsMarketing !== undefined) insertValues.acceptsMarketing = data.acceptsMarketing;
  if (data.notes !== undefined) insertValues.notes = data.notes;
  if (data.tags !== undefined) insertValues.tags = data.tags;

  try {
    const [customer] = await db.insert(customers).values(insertValues).returning();
    if (!customer) throw new Error("Failed to create customer");
    return customer;
  } catch (err: unknown) {
    // Unique constraint: email already exists for this store
    const msg = (err as Error).message ?? "";
    if (msg.includes("customers_store_email_idx") || msg.includes("unique")) {
      throw Object.assign(
        new Error("A customer with this email already exists in this store"),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

// ── Update customer ───────────────────────────────────────────────────────────

export async function updateCustomer(
  db: Db,
  customerId: string,
  storeAccountId: string,
  data: UpdateCustomerInput,
) {
  const updateValues: Partial<typeof customers.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.firstName !== undefined) updateValues.firstName = data.firstName;
  if (data.lastName !== undefined) updateValues.lastName = data.lastName;
  if (data.phone !== undefined) updateValues.phone = data.phone;
  if (data.acceptsMarketing !== undefined) updateValues.acceptsMarketing = data.acceptsMarketing;
  if (data.notes !== undefined) updateValues.notes = data.notes;
  if (data.tags !== undefined) updateValues.tags = data.tags;
  if (data.isActive !== undefined) updateValues.isActive = data.isActive;

  const [updated] = await db
    .update(customers)
    .set(updateValues)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Customer not found"), { statusCode: 404 });
  }
  return updated;
}

// ── Delete customer (soft) ────────────────────────────────────────────────────

export async function deleteCustomer(
  db: Db,
  customerId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: customers.id });
  return rows.length > 0;
}

// ── Merge customers ───────────────────────────────────────────────────────────

export async function mergeCustomers(
  db: Db,
  storeAccountId: string,
  sourceId: string,
  targetId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Reassign orders from source to target
    await tx
      .update(orders)
      .set({ customerId: targetId, updatedAt: new Date() })
      .where(
        and(
          eq(orders.customerId, sourceId),
          eq(orders.storeAccountId, storeAccountId),
        ),
      );

    // Reassign addresses from source to target
    await tx
      .update(customerAddresses)
      .set({ customerId: targetId, updatedAt: new Date() })
      .where(
        and(
          eq(customerAddresses.customerId, sourceId),
          eq(customerAddresses.storeAccountId, storeAccountId),
        ),
      );

    // Delete the source customer
    await tx
      .delete(customers)
      .where(
        and(
          eq(customers.id, sourceId),
          eq(customers.storeAccountId, storeAccountId),
        ),
      );
  });
}

// ── Count customers ───────────────────────────────────────────────────────────

export async function countCustomers(db: Db, storeAccountId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(customers)
    .where(eq(customers.storeAccountId, storeAccountId));
  return row?.total ?? 0;
}

// ── List addresses ────────────────────────────────────────────────────────────

export async function listAddresses(
  db: Db,
  customerId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeAccountId, storeAccountId),
      ),
    );
}

// ── Create address ────────────────────────────────────────────────────────────

export async function createAddress(
  db: Db,
  customerId: string,
  storeAccountId: string,
  data: CreateAddressInput,
) {
  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.customerId, customerId),
            eq(customerAddresses.storeAccountId, storeAccountId),
          ),
        );
    }

    const insertValues: typeof customerAddresses.$inferInsert = {
      customerId,
      storeAccountId,
      type: data.type,
      address1: data.address1,
      city: data.city,
      country: data.country,
      isDefault: data.isDefault ?? false,
    };

    if (data.firstName !== undefined) insertValues.firstName = data.firstName;
    if (data.lastName !== undefined) insertValues.lastName = data.lastName;
    if (data.company !== undefined) insertValues.company = data.company;
    if (data.address2 !== undefined) insertValues.address2 = data.address2;
    if (data.province !== undefined) insertValues.province = data.province;
    if (data.zip !== undefined) insertValues.zip = data.zip;
    if (data.phone !== undefined) insertValues.phone = data.phone;

    const [address] = await tx.insert(customerAddresses).values(insertValues).returning();
    if (!address) throw new Error("Failed to create address");
    return address;
  });
}

// ── Update address ────────────────────────────────────────────────────────────

export async function updateAddress(
  db: Db,
  addressId: string,
  customerId: string,
  storeAccountId: string,
  data: UpdateAddressInput,
) {
  return db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(customerAddresses.customerId, customerId),
            eq(customerAddresses.storeAccountId, storeAccountId),
          ),
        );
    }

    const updateValues: Partial<typeof customerAddresses.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.firstName !== undefined) updateValues.firstName = data.firstName;
    if (data.lastName !== undefined) updateValues.lastName = data.lastName;
    if (data.company !== undefined) updateValues.company = data.company;
    if (data.address1 !== undefined) updateValues.address1 = data.address1;
    if (data.address2 !== undefined) updateValues.address2 = data.address2;
    if (data.city !== undefined) updateValues.city = data.city;
    if (data.province !== undefined) updateValues.province = data.province;
    if (data.zip !== undefined) updateValues.zip = data.zip;
    if (data.country !== undefined) updateValues.country = data.country;
    if (data.phone !== undefined) updateValues.phone = data.phone;
    if (data.isDefault !== undefined) updateValues.isDefault = data.isDefault;

    const [updated] = await tx
      .update(customerAddresses)
      .set(updateValues)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customerId),
          eq(customerAddresses.storeAccountId, storeAccountId),
        ),
      )
      .returning();

    if (!updated) {
      throw Object.assign(new Error("Address not found"), { statusCode: 404 });
    }
    return updated;
  });
}

// ── Customer-shop analytics ───────────────────────────────────────────────────

// Returns which shops a customer has ordered from, with per-shop analytics.
export async function getCustomerShops(
  db: Db,
  customerId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(customerShops)
    .where(
      and(
        eq(customerShops.customerId, customerId),
        eq(customerShops.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(desc(customerShops.lastOrderAt));
}

// Aggregate shop analytics across all customers for a given shop.
export async function getShopCustomerStats(
  db: Db,
  shopId: string,
  storeAccountId: string,
) {
  const rows = await db
    .select({
      totalCustomers: count(),
      totalRevenue: sql<number>`coalesce(sum(total_spent_cents), 0)`.mapWith(Number),
      avgOrderValue: sql<number>`coalesce(avg(total_spent_cents / nullif(orders_count, 0)), 0)`.mapWith(Number),
      totalOrders: sql<number>`coalesce(sum(orders_count), 0)`.mapWith(Number),
    })
    .from(customerShops)
    .where(
      and(
        eq(customerShops.shopId, shopId),
        eq(customerShops.storeAccountId, storeAccountId),
      ),
    );

  return rows[0] ?? { totalCustomers: 0, totalRevenue: 0, avgOrderValue: 0, totalOrders: 0 };
}

// Top customers by spend for a shop.
export async function getTopCustomersByShop(
  db: Db,
  shopId: string,
  storeAccountId: string,
  limit = 20,
) {
  return db
    .select({
      customerId: customerShops.customerId,
      ordersCount: customerShops.ordersCount,
      totalSpentCents: customerShops.totalSpentCents,
      firstOrderAt: customerShops.firstOrderAt,
      lastOrderAt: customerShops.lastOrderAt,
    })
    .from(customerShops)
    .where(
      and(
        eq(customerShops.shopId, shopId),
        eq(customerShops.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(desc(customerShops.totalSpentCents))
    .limit(limit);
}

// ── Delete address ────────────────────────────────────────────────────────────

export async function deleteAddress(
  db: Db,
  addressId: string,
  customerId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, addressId),
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: customerAddresses.id });
  return rows.length > 0;
}
