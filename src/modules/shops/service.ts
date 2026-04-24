import { eq, and, ilike, desc, asc, count, sum, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  shops,
  shopDomains,
  shopProductVisibility,
  shopPrices,
  shopWarehouses,
  products,
  productVariants,
  inventoryLevels,
  warehouses,
} from "../../db/schema/index.js";
import type { ShopWarehouse } from "../../db/schema/shops.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShopProductQueryOpts {
  page: number;
  limit: number;
  search?: string | undefined;
  isPublished?: boolean | undefined;
  sort: "name" | "createdAt" | "publishedAt";
  order: "asc" | "desc";
}

// ── Shop CRUD ─────────────────────────────────────────────────────────────────

export async function listShops(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(shops)
    .where(eq(shops.storeAccountId, storeAccountId))
    .orderBy(asc(shops.sortOrder), asc(shops.name));
}

export async function getShop(db: Db, shopId: string, storeAccountId: string) {
  const [row] = await db
    .select()
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.storeAccountId, storeAccountId)))
    .limit(1);
  return row ?? null;
}

export async function countShops(db: Db, storeAccountId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(shops)
    .where(eq(shops.storeAccountId, storeAccountId));
  return row?.value ?? 0;
}

export async function createShop(
  db: Db,
  storeAccountId: string,
  data: {
    name: string;
    slug: string;
    defaultLanguage?: string;
    defaultCurrency?: string;
    themeId?: string;
    sortOrder?: number;
  },
) {
  try {
    const values: typeof shops.$inferInsert = {
      storeAccountId,
      name: data.name,
      slug: data.slug,
    };
    if (data.defaultLanguage !== undefined) values.defaultLanguage = data.defaultLanguage;
    if (data.defaultCurrency !== undefined) values.defaultCurrency = data.defaultCurrency;
    if (data.themeId !== undefined) values.themeId = data.themeId;
    if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;

    const [shop] = await db.insert(shops).values(values).returning();
    if (!shop) throw new Error("Failed to create shop");
    return shop;
  } catch (err: unknown) {
    const msg = (err as Error).message?.toLowerCase() ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      throw Object.assign(
        new Error("A shop with this slug already exists in your store."),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

export async function updateShop(
  db: Db,
  shopId: string,
  storeAccountId: string,
  data: {
    name?: string;
    defaultLanguage?: string;
    defaultCurrency?: string;
    themeId?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const set: Partial<typeof shops.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) set.name = data.name;
  if (data.defaultLanguage !== undefined) set.defaultLanguage = data.defaultLanguage;
  if (data.defaultCurrency !== undefined) set.defaultCurrency = data.defaultCurrency;
  if (data.themeId !== undefined) set.themeId = data.themeId;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) set.isActive = data.isActive;

  const [updated] = await db
    .update(shops)
    .set(set)
    .where(and(eq(shops.id, shopId), eq(shops.storeAccountId, storeAccountId)))
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Shop not found"), { statusCode: 404 });
  }
  return updated;
}

export async function deleteShop(
  db: Db,
  shopId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(shops)
    .where(and(eq(shops.id, shopId), eq(shops.storeAccountId, storeAccountId)))
    .returning({ id: shops.id });
  return rows.length > 0;
}

// ── Shop Domains ──────────────────────────────────────────────────────────────

export async function listShopDomains(
  db: Db,
  shopId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(shopDomains)
    .where(
      and(
        eq(shopDomains.shopId, shopId),
        eq(shopDomains.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(desc(shopDomains.isPrimary), asc(shopDomains.createdAt));
}

export async function addShopDomain(
  db: Db,
  shopId: string,
  storeAccountId: string,
  hostname: string,
) {
  try {
    const [domain] = await db
      .insert(shopDomains)
      .values({ shopId, storeAccountId, hostname })
      .returning();
    if (!domain) throw new Error("Failed to add domain");
    return domain;
  } catch (err: unknown) {
    const msg = (err as Error).message?.toLowerCase() ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      throw Object.assign(
        new Error("A shop domain with this hostname already exists."),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

export async function verifyShopDomain(
  db: Db,
  domainId: string,
  shopId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .update(shopDomains)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(
      and(
        eq(shopDomains.id, domainId),
        eq(shopDomains.shopId, shopId),
        eq(shopDomains.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: shopDomains.id });
  return rows.length > 0;
}

export async function setPrimaryShopDomain(
  db: Db,
  domainId: string,
  shopId: string,
  storeAccountId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Check the target domain exists and belongs to this shop/store.
    const [target] = await tx
      .select({ id: shopDomains.id })
      .from(shopDomains)
      .where(
        and(
          eq(shopDomains.id, domainId),
          eq(shopDomains.shopId, shopId),
          eq(shopDomains.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);

    if (!target) return false;

    // Clear primary flag for all domains in this shop.
    await tx
      .update(shopDomains)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(shopDomains.shopId, shopId),
          eq(shopDomains.storeAccountId, storeAccountId),
        ),
      );

    // Set this one as primary.
    await tx
      .update(shopDomains)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(shopDomains.id, domainId));

    return true;
  });
}

export async function removeShopDomain(
  db: Db,
  domainId: string,
  shopId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(shopDomains)
    .where(
      and(
        eq(shopDomains.id, domainId),
        eq(shopDomains.shopId, shopId),
        eq(shopDomains.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: shopDomains.id });
  return rows.length > 0;
}

// ── Product Visibility ────────────────────────────────────────────────────────

export async function listShopProducts(
  db: Db,
  shopId: string,
  storeAccountId: string,
  opts: ShopProductQueryOpts,
) {
  const { page, limit, search, isPublished, sort, order } = opts;
  const offset = (page - 1) * limit;

  // Build WHERE conditions on products.
  const conditions = [eq(products.storeAccountId, storeAccountId)];
  if (search !== undefined && search.length > 0) {
    conditions.push(ilike(products.name, `%${search}%`));
  }
  if (isPublished !== undefined) {
    conditions.push(
      eq(shopProductVisibility.isPublished, isPublished),
    );
  }

  // Build ORDER BY.
  const sortCol =
    sort === "name"
      ? products.name
      : sort === "createdAt"
        ? products.createdAt
        : shopProductVisibility.publishedAt;

  const orderFn = order === "asc" ? asc : desc;

  const [countRow] = await db
    .select({ total: count() })
    .from(products)
    .leftJoin(
      shopProductVisibility,
      and(
        eq(shopProductVisibility.productId, products.id),
        eq(shopProductVisibility.shopId, shopId),
      ),
    )
    .where(and(...conditions));

  const total = countRow?.total ?? 0;

  const rows = await db
    .select({
      id: products.id,
      storeAccountId: products.storeAccountId,
      name: products.name,
      slug: products.slug,
      status: products.status,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      isPublished: shopProductVisibility.isPublished,
      publishedAt: shopProductVisibility.publishedAt,
    })
    .from(products)
    .leftJoin(
      shopProductVisibility,
      and(
        eq(shopProductVisibility.productId, products.id),
        eq(shopProductVisibility.shopId, shopId),
      ),
    )
    .where(and(...conditions))
    .orderBy(orderFn(sortCol))
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    ...r,
    isPublished: r.isPublished ?? false,
    publishedAt: r.publishedAt ?? null,
  }));

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function setProductVisibility(
  db: Db,
  shopId: string,
  storeAccountId: string,
  productId: string,
  isPublished: boolean,
) {
  const now = new Date();
  const [row] = await db
    .insert(shopProductVisibility)
    .values({
      shopId,
      storeAccountId,
      productId,
      isPublished,
      publishedAt: isPublished ? now : null,
    })
    .onConflictDoUpdate({
      target: [shopProductVisibility.shopId, shopProductVisibility.productId],
      set: {
        isPublished,
        publishedAt: isPublished ? now : null,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error("Failed to set product visibility");
  return row;
}

export async function bulkSetProductVisibility(
  db: Db,
  shopId: string,
  storeAccountId: string,
  productIds: string[],
  isPublished: boolean,
): Promise<number> {
  if (productIds.length === 0) return 0;

  const now = new Date();
  let updatedCount = 0;

  // Process in batches to avoid parameter limits.
  const BATCH = 50;
  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH);
    const rows = await db
      .insert(shopProductVisibility)
      .values(
        batch.map((productId) => ({
          shopId,
          storeAccountId,
          productId,
          isPublished,
          publishedAt: isPublished ? now : null,
        })),
      )
      .onConflictDoUpdate({
        target: [shopProductVisibility.shopId, shopProductVisibility.productId],
        set: {
          isPublished,
          publishedAt: isPublished ? now : null,
          updatedAt: now,
        },
      })
      .returning({ id: shopProductVisibility.id });
    updatedCount += rows.length;
  }

  return updatedCount;
}

// ── Shop Prices ───────────────────────────────────────────────────────────────

export async function listShopPrices(
  db: Db,
  shopId: string,
  storeAccountId: string,
) {
  const rows = await db
    .select({
      id: shopPrices.id,
      shopId: shopPrices.shopId,
      storeAccountId: shopPrices.storeAccountId,
      variantId: shopPrices.variantId,
      priceCents: shopPrices.priceCents,
      compareAtPriceCents: shopPrices.compareAtPriceCents,
      currency: shopPrices.currency,
      createdAt: shopPrices.createdAt,
      updatedAt: shopPrices.updatedAt,
      variantTitle: productVariants.title,
      variantSku: productVariants.sku,
      masterPriceCents: productVariants.priceCents,
    })
    .from(shopPrices)
    .leftJoin(productVariants, eq(shopPrices.variantId, productVariants.id))
    .where(
      and(
        eq(shopPrices.shopId, shopId),
        eq(shopPrices.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(shopPrices.createdAt));

  return rows;
}

export async function getEffectivePrice(
  db: Db,
  shopId: string,
  variantId: string,
  storeAccountId: string,
): Promise<{
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  isOverride: boolean;
}> {
  // Check for shop-specific override first.
  const [override] = await db
    .select({
      priceCents: shopPrices.priceCents,
      compareAtPriceCents: shopPrices.compareAtPriceCents,
      currency: shopPrices.currency,
    })
    .from(shopPrices)
    .where(
      and(
        eq(shopPrices.shopId, shopId),
        eq(shopPrices.variantId, variantId),
        eq(shopPrices.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (override) {
    return {
      priceCents: override.priceCents,
      compareAtPriceCents: override.compareAtPriceCents ?? null,
      currency: override.currency,
      isOverride: true,
    };
  }

  // Fall back to master variant price.
  const [variant] = await db
    .select({
      priceCents: productVariants.priceCents,
      compareAtPriceCents: productVariants.compareAtPriceCents,
    })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  return {
    priceCents: variant?.priceCents ?? 0,
    compareAtPriceCents: variant?.compareAtPriceCents ?? null,
    currency: "SEK",
    isOverride: false,
  };
}

export async function setShopPrice(
  db: Db,
  shopId: string,
  storeAccountId: string,
  variantId: string,
  data: {
    priceCents: number;
    compareAtPriceCents?: number;
    currency: string;
  },
) {
  const now = new Date();
  const set: {
    priceCents: number;
    currency: string;
    updatedAt: Date;
    compareAtPriceCents?: number;
  } = {
    priceCents: data.priceCents,
    currency: data.currency,
    updatedAt: now,
  };
  if (data.compareAtPriceCents !== undefined) {
    set.compareAtPriceCents = data.compareAtPriceCents;
  }

  const insertValues: typeof shopPrices.$inferInsert = {
    shopId,
    storeAccountId,
    variantId,
    priceCents: data.priceCents,
    currency: data.currency,
  };
  if (data.compareAtPriceCents !== undefined) {
    insertValues.compareAtPriceCents = data.compareAtPriceCents;
  }

  const [row] = await db
    .insert(shopPrices)
    .values(insertValues)
    .onConflictDoUpdate({
      target: [shopPrices.shopId, shopPrices.variantId],
      set,
    })
    .returning();

  if (!row) throw new Error("Failed to set shop price");
  return row;
}

export async function bulkSetShopPrices(
  db: Db,
  shopId: string,
  storeAccountId: string,
  prices: Array<{
    variantId: string;
    priceCents: number;
    compareAtPriceCents?: number;
    currency?: string;
  }>,
): Promise<number> {
  if (prices.length === 0) return 0;

  let updatedCount = 0;
  const now = new Date();

  const BATCH = 50;
  for (let i = 0; i < prices.length; i += BATCH) {
    const batch = prices.slice(i, i + BATCH);

    const insertValues: (typeof shopPrices.$inferInsert)[] = batch.map((p) => {
      const v: typeof shopPrices.$inferInsert = {
        shopId,
        storeAccountId,
        variantId: p.variantId,
        priceCents: p.priceCents,
        currency: p.currency ?? "SEK",
      };
      if (p.compareAtPriceCents !== undefined) {
        v.compareAtPriceCents = p.compareAtPriceCents;
      }
      return v;
    });

    const rows = await db
      .insert(shopPrices)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [shopPrices.shopId, shopPrices.variantId],
        set: {
          priceCents: sql`excluded.price_cents`,
          compareAtPriceCents: sql`excluded.compare_at_price_cents`,
          currency: sql`excluded.currency`,
          updatedAt: now,
        },
      })
      .returning({ id: shopPrices.id });
    updatedCount += rows.length;
  }

  return updatedCount;
}

export async function deleteShopPrice(
  db: Db,
  shopId: string,
  storeAccountId: string,
  variantId: string,
): Promise<boolean> {
  const rows = await db
    .delete(shopPrices)
    .where(
      and(
        eq(shopPrices.shopId, shopId),
        eq(shopPrices.storeAccountId, storeAccountId),
        eq(shopPrices.variantId, variantId),
      ),
    )
    .returning({ id: shopPrices.id });
  return rows.length > 0;
}

// ── Shop Warehouses ───────────────────────────────────────────────────────────

export async function listShopWarehouses(
  db: Db,
  shopId: string,
  storeAccountId: string,
): Promise<
  (ShopWarehouse & {
    warehouseName: string;
    warehouseType: string;
    warehouseIsActive: boolean;
    warehouseLeadTimeDays: number;
  })[]
> {
  const rows = await db
    .select({
      id: shopWarehouses.id,
      storeAccountId: shopWarehouses.storeAccountId,
      shopId: shopWarehouses.shopId,
      warehouseId: shopWarehouses.warehouseId,
      priority: shopWarehouses.priority,
      createdAt: shopWarehouses.createdAt,
      updatedAt: shopWarehouses.updatedAt,
      warehouseName: warehouses.name,
      warehouseType: warehouses.type,
      warehouseIsActive: warehouses.isActive,
      warehouseLeadTimeDays: warehouses.leadTimeDays,
    })
    .from(shopWarehouses)
    .innerJoin(warehouses, eq(shopWarehouses.warehouseId, warehouses.id))
    .where(
      and(
        eq(shopWarehouses.shopId, shopId),
        eq(shopWarehouses.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(shopWarehouses.priority));

  return rows;
}

export async function addShopWarehouse(
  db: Db,
  shopId: string,
  storeAccountId: string,
  warehouseId: string,
  priority?: number,
): Promise<ShopWarehouse> {
  // Verify the warehouse exists and belongs to this store account.
  const [warehouse] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(
        eq(warehouses.id, warehouseId),
        eq(warehouses.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!warehouse) {
    throw Object.assign(new Error("Warehouse not found"), { statusCode: 404 });
  }

  const insertValues: typeof shopWarehouses.$inferInsert = {
    storeAccountId,
    shopId,
    warehouseId,
  };
  if (priority !== undefined) insertValues.priority = priority;

  const now = new Date();
  const [row] = await db
    .insert(shopWarehouses)
    .values(insertValues)
    .onConflictDoUpdate({
      target: [shopWarehouses.shopId, shopWarehouses.warehouseId],
      set: {
        priority: priority !== undefined ? priority : shopWarehouses.priority,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new Error("Failed to add shop warehouse");
  return row;
}

export async function updateShopWarehousePriority(
  db: Db,
  shopId: string,
  storeAccountId: string,
  warehouseId: string,
  priority: number,
): Promise<ShopWarehouse> {
  const [updated] = await db
    .update(shopWarehouses)
    .set({ priority, updatedAt: new Date() })
    .where(
      and(
        eq(shopWarehouses.shopId, shopId),
        eq(shopWarehouses.storeAccountId, storeAccountId),
        eq(shopWarehouses.warehouseId, warehouseId),
      ),
    )
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Shop warehouse link not found"), { statusCode: 404 });
  }
  return updated;
}

export async function removeShopWarehouse(
  db: Db,
  shopId: string,
  storeAccountId: string,
  warehouseId: string,
): Promise<boolean> {
  const rows = await db
    .delete(shopWarehouses)
    .where(
      and(
        eq(shopWarehouses.shopId, shopId),
        eq(shopWarehouses.storeAccountId, storeAccountId),
        eq(shopWarehouses.warehouseId, warehouseId),
      ),
    )
    .returning({ id: shopWarehouses.id });
  return rows.length > 0;
}

export interface ShopStockOpts {
  sku?: string | undefined;
  page: number;
  limit: number;
}

export async function getShopStock(
  db: Db,
  shopId: string,
  storeAccountId: string,
  opts: ShopStockOpts,
): Promise<{
  items: Array<{
    sku: string;
    qtyAvailable: number;
    qtyReserved: number;
    qtyIncoming: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  const { sku, page, limit } = opts;
  const offset = (page - 1) * limit;

  // Check whether this shop has linked warehouses.
  const [linkCount] = await db
    .select({ value: count() })
    .from(shopWarehouses)
    .where(
      and(
        eq(shopWarehouses.shopId, shopId),
        eq(shopWarehouses.storeAccountId, storeAccountId),
      ),
    );

  const hasLinkedWarehouses = (linkCount?.value ?? 0) > 0;

  // Build the base query differently depending on whether the shop has linked warehouses.
  if (hasLinkedWarehouses) {
    // Use only the warehouses linked to this shop.
    const skuConditions = [
      eq(shopWarehouses.shopId, shopId),
      eq(shopWarehouses.storeAccountId, storeAccountId),
    ];
    if (sku !== undefined && sku.length > 0) {
      skuConditions.push(ilike(inventoryLevels.sku, `%${sku}%`));
    }

    // Count distinct SKUs.
    const totalRows = await db
      .selectDistinct({ sku: inventoryLevels.sku })
      .from(inventoryLevels)
      .innerJoin(shopWarehouses, eq(inventoryLevels.warehouseId, shopWarehouses.warehouseId))
      .where(and(...skuConditions));

    const total = totalRows.length;

    const rows = await db
      .select({
        sku: inventoryLevels.sku,
        qtyAvailable: sum(inventoryLevels.qtyAvailable).mapWith(Number),
        qtyReserved: sum(inventoryLevels.qtyReserved).mapWith(Number),
        qtyIncoming: sum(inventoryLevels.qtyIncoming).mapWith(Number),
      })
      .from(inventoryLevels)
      .innerJoin(shopWarehouses, eq(inventoryLevels.warehouseId, shopWarehouses.warehouseId))
      .where(and(...skuConditions))
      .groupBy(inventoryLevels.sku)
      .orderBy(asc(inventoryLevels.sku))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        sku: r.sku,
        qtyAvailable: r.qtyAvailable ?? 0,
        qtyReserved: r.qtyReserved ?? 0,
        qtyIncoming: r.qtyIncoming ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } else {
    // Fall back to all active warehouses for the store account.
    const skuConditions = [
      eq(inventoryLevels.storeAccountId, storeAccountId),
      eq(warehouses.isActive, true),
    ];
    if (sku !== undefined && sku.length > 0) {
      skuConditions.push(ilike(inventoryLevels.sku, `%${sku}%`));
    }

    const totalRows = await db
      .selectDistinct({ sku: inventoryLevels.sku })
      .from(inventoryLevels)
      .innerJoin(warehouses, eq(inventoryLevels.warehouseId, warehouses.id))
      .where(and(...skuConditions));

    const total = totalRows.length;

    const rows = await db
      .select({
        sku: inventoryLevels.sku,
        qtyAvailable: sum(inventoryLevels.qtyAvailable).mapWith(Number),
        qtyReserved: sum(inventoryLevels.qtyReserved).mapWith(Number),
        qtyIncoming: sum(inventoryLevels.qtyIncoming).mapWith(Number),
      })
      .from(inventoryLevels)
      .innerJoin(warehouses, eq(inventoryLevels.warehouseId, warehouses.id))
      .where(and(...skuConditions))
      .groupBy(inventoryLevels.sku)
      .orderBy(asc(inventoryLevels.sku))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        sku: r.sku,
        qtyAvailable: r.qtyAvailable ?? 0,
        qtyReserved: r.qtyReserved ?? 0,
        qtyIncoming: r.qtyIncoming ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
