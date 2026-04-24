import { and, eq, ilike, sql, sum, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  b2bCompanies,
  b2bPriceLists,
  b2bPriceListItems,
  b2bPaymentTerms,
  b2bMinimumOrders,
  b2bReorderTemplates,
  b2bCreditEvents,
} from "../../db/schema/b2b.js";
import { inventoryLevels, warehouses } from "../../db/schema/inventory.js";
import { products, productVariants } from "../../db/schema/products.js";
import type { z } from "zod";
import type {
  createB2bCompanySchema,
  updateB2bCompanySchema,
  createPriceListSchema,
  updatePriceListSchema,
  upsertPriceListItemSchema,
  createPaymentTermsSchema,
  updatePaymentTermsSchema,
  createMinimumOrderSchema,
  updateMinimumOrderSchema,
  createReorderTemplateSchema,
  updateReorderTemplateSchema,
  addCreditEventSchema,
} from "./schemas.js";

// ── Companies ─────────────────────────────────────────────────────────────────

export async function createB2bCompany(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createB2bCompanySchema>,
) {
  const row: typeof b2bCompanies.$inferInsert = {
    storeAccountId,
    name: data.name,
  };
  if (data.orgNumber !== undefined) row.orgNumber = data.orgNumber;
  if (data.vatNumber !== undefined) row.vatNumber = data.vatNumber;
  if (data.website !== undefined) row.website = data.website;
  if (data.industry !== undefined) row.industry = data.industry;
  if (data.customerId !== undefined) row.customerId = data.customerId;
  if (data.salesRepUserId !== undefined) row.salesRepUserId = data.salesRepUserId;
  if (data.defaultPriceListId !== undefined) row.defaultPriceListId = data.defaultPriceListId;
  if (data.defaultPaymentTermsId !== undefined) row.defaultPaymentTermsId = data.defaultPaymentTermsId;
  if (data.creditLimitCents !== undefined) row.creditLimitCents = data.creditLimitCents;
  if (data.allowCreditOverdraft !== undefined) row.allowCreditOverdraft = data.allowCreditOverdraft;
  if (data.showWarehouseAvailability !== undefined) row.showWarehouseAvailability = data.showWarehouseAvailability;
  if (data.showRetailPrice !== undefined) row.showRetailPrice = data.showRetailPrice;
  if (data.notes !== undefined) row.notes = data.notes;

  const [company] = await db.insert(b2bCompanies).values(row).returning();
  return company;
}

export async function listB2bCompanies(
  db: Db,
  storeAccountId: string,
  opts: { page: number; limit: number; status?: string; search?: string },
) {
  const conditions = [eq(b2bCompanies.storeAccountId, storeAccountId)];
  if (opts.status) {
    conditions.push(
      eq(b2bCompanies.status, opts.status as "pending" | "approved" | "suspended" | "rejected"),
    );
  }
  if (opts.search) {
    conditions.push(ilike(b2bCompanies.name, `%${opts.search}%`));
  }

  const offset = (opts.page - 1) * opts.limit;
  const rows = await db
    .select()
    .from(b2bCompanies)
    .where(and(...conditions))
    .limit(opts.limit)
    .offset(offset);

  return { data: rows, page: opts.page, limit: opts.limit };
}

export async function getB2bCompany(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [company] = await db
    .select()
    .from(b2bCompanies)
    .where(and(eq(b2bCompanies.id, id), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .limit(1);
  if (!company) return null;

  let priceList = null;
  if (company.defaultPriceListId) {
    const [pl] = await db
      .select()
      .from(b2bPriceLists)
      .where(eq(b2bPriceLists.id, company.defaultPriceListId))
      .limit(1);
    priceList = pl ?? null;
  }

  let paymentTerms = null;
  if (company.defaultPaymentTermsId) {
    const [pt] = await db
      .select()
      .from(b2bPaymentTerms)
      .where(eq(b2bPaymentTerms.id, company.defaultPaymentTermsId))
      .limit(1);
    paymentTerms = pt ?? null;
  }

  return { ...company, priceList, paymentTerms };
}

export async function updateB2bCompany(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updateB2bCompanySchema>,
) {
  const upd: Partial<typeof b2bCompanies.$inferInsert> = {};
  if (data.name !== undefined) upd.name = data.name;
  if (data.orgNumber !== undefined) upd.orgNumber = data.orgNumber;
  if (data.vatNumber !== undefined) upd.vatNumber = data.vatNumber;
  if (data.website !== undefined) upd.website = data.website;
  if (data.industry !== undefined) upd.industry = data.industry;
  if (data.customerId !== undefined) upd.customerId = data.customerId;
  if (data.salesRepUserId !== undefined) upd.salesRepUserId = data.salesRepUserId;
  if (data.defaultPriceListId !== undefined) upd.defaultPriceListId = data.defaultPriceListId;
  if (data.defaultPaymentTermsId !== undefined) upd.defaultPaymentTermsId = data.defaultPaymentTermsId;
  if (data.creditLimitCents !== undefined) upd.creditLimitCents = data.creditLimitCents;
  if (data.allowCreditOverdraft !== undefined) upd.allowCreditOverdraft = data.allowCreditOverdraft;
  if (data.showWarehouseAvailability !== undefined) upd.showWarehouseAvailability = data.showWarehouseAvailability;
  if (data.showRetailPrice !== undefined) upd.showRetailPrice = data.showRetailPrice;
  if (data.notes !== undefined) upd.notes = data.notes;
  if (data.status !== undefined) upd.status = data.status;
  upd.updatedAt = new Date();

  const [updated] = await db
    .update(b2bCompanies)
    .set(upd)
    .where(and(eq(b2bCompanies.id, id), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function approveB2bCompany(
  db: Db,
  id: string,
  storeAccountId: string,
  approvedByUserId: string,
) {
  const [updated] = await db
    .update(b2bCompanies)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedByUserId,
      updatedAt: new Date(),
    })
    .where(and(eq(b2bCompanies.id, id), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function suspendB2bCompany(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [updated] = await db
    .update(b2bCompanies)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(and(eq(b2bCompanies.id, id), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function getCompanyCreditBalance(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [company] = await db
    .select({ creditLimitCents: b2bCompanies.creditLimitCents })
    .from(b2bCompanies)
    .where(and(eq(b2bCompanies.id, id), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .limit(1);
  if (!company) return null;

  const [result] = await db
    .select({ total: sum(b2bCreditEvents.amountCents) })
    .from(b2bCreditEvents)
    .where(
      and(
        eq(b2bCreditEvents.b2bCompanyId, id),
        eq(b2bCreditEvents.storeAccountId, storeAccountId),
      ),
    );

  const usedCreditCents = Number(result?.total ?? 0);
  const creditLimitCents = company.creditLimitCents;
  const availableCreditCents = creditLimitCents - usedCreditCents;

  return { usedCreditCents, creditLimitCents, availableCreditCents };
}

// ── Price Lists ───────────────────────────────────────────────────────────────

export async function listPriceLists(
  db: Db,
  storeAccountId: string,
  opts: { page: number; limit: number; enabled?: boolean },
) {
  const conditions = [eq(b2bPriceLists.storeAccountId, storeAccountId)];
  if (opts.enabled !== undefined) {
    conditions.push(eq(b2bPriceLists.enabled, opts.enabled));
  }

  const offset = (opts.page - 1) * opts.limit;
  const rows = await db
    .select()
    .from(b2bPriceLists)
    .where(and(...conditions))
    .limit(opts.limit)
    .offset(offset);

  return { data: rows, page: opts.page, limit: opts.limit };
}

export async function createPriceList(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createPriceListSchema>,
) {
  if (data.isDefault) {
    await db
      .update(b2bPriceLists)
      .set({ isDefault: false })
      .where(eq(b2bPriceLists.storeAccountId, storeAccountId));
  }

  const row: typeof b2bPriceLists.$inferInsert = {
    storeAccountId,
    name: data.name,
    discountType: data.discountType,
  };
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.globalDiscountValue !== undefined) row.globalDiscountValue = String(data.globalDiscountValue);
  if (data.isDefault !== undefined) row.isDefault = data.isDefault;
  if (data.enabled !== undefined) row.enabled = data.enabled;

  const [pl] = await db.insert(b2bPriceLists).values(row).returning();
  return pl;
}

export async function updatePriceList(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updatePriceListSchema>,
) {
  if (data.isDefault) {
    await db
      .update(b2bPriceLists)
      .set({ isDefault: false })
      .where(and(eq(b2bPriceLists.storeAccountId, storeAccountId)));
  }

  const upd: Partial<typeof b2bPriceLists.$inferInsert> = {};
  if (data.name !== undefined) upd.name = data.name;
  if (data.currency !== undefined) upd.currency = data.currency;
  if (data.discountType !== undefined) upd.discountType = data.discountType;
  if (data.globalDiscountValue !== undefined) upd.globalDiscountValue = String(data.globalDiscountValue);
  if (data.isDefault !== undefined) upd.isDefault = data.isDefault;
  if (data.enabled !== undefined) upd.enabled = data.enabled;
  upd.updatedAt = new Date();

  const [updated] = await db
    .update(b2bPriceLists)
    .set(upd)
    .where(and(eq(b2bPriceLists.id, id), eq(b2bPriceLists.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function deletePriceList(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  // Guard: don't delete if any companies are using it
  const [usingCompany] = await db
    .select({ id: b2bCompanies.id })
    .from(b2bCompanies)
    .where(
      and(
        eq(b2bCompanies.storeAccountId, storeAccountId),
        eq(b2bCompanies.defaultPriceListId, id),
      ),
    )
    .limit(1);

  if (usingCompany) {
    throw new Error("Price list is in use by one or more companies");
  }

  const [deleted] = await db
    .delete(b2bPriceLists)
    .where(and(eq(b2bPriceLists.id, id), eq(b2bPriceLists.storeAccountId, storeAccountId)))
    .returning();
  return deleted ?? null;
}

export async function listPriceListItems(
  db: Db,
  priceListId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(b2bPriceListItems)
    .where(
      and(
        eq(b2bPriceListItems.priceListId, priceListId),
        eq(b2bPriceListItems.storeAccountId, storeAccountId),
      ),
    );
}

export async function upsertPriceListItem(
  db: Db,
  priceListId: string,
  storeAccountId: string,
  data: z.infer<typeof upsertPriceListItemSchema>,
) {
  const row: typeof b2bPriceListItems.$inferInsert = {
    priceListId,
    storeAccountId,
    productId: data.productId,
  };
  if (data.variantId !== undefined) row.variantId = data.variantId;
  if (data.priceCents !== undefined) row.priceCents = data.priceCents;
  if (data.discountPercentage !== undefined) row.discountPercentage = String(data.discountPercentage);
  if (data.minimumQuantity !== undefined) row.minimumQuantity = data.minimumQuantity;
  if (data.maximumQuantity !== undefined) row.maximumQuantity = data.maximumQuantity;
  if (data.enabled !== undefined) row.enabled = data.enabled;

  // Build conflict target – variantId may be null
  const [item] = await db
    .insert(b2bPriceListItems)
    .values(row)
    .onConflictDoUpdate({
      target: [b2bPriceListItems.priceListId, b2bPriceListItems.productId, b2bPriceListItems.variantId],
      set: {
        priceCents: row.priceCents,
        discountPercentage: row.discountPercentage,
        minimumQuantity: row.minimumQuantity,
        maximumQuantity: row.maximumQuantity,
        enabled: row.enabled,
        updatedAt: new Date(),
      },
    })
    .returning();
  return item;
}

export async function removePriceListItem(
  db: Db,
  itemId: string,
  storeAccountId: string,
) {
  const [deleted] = await db
    .delete(b2bPriceListItems)
    .where(
      and(
        eq(b2bPriceListItems.id, itemId),
        eq(b2bPriceListItems.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  return deleted ?? null;
}

export async function resolveB2bPrice(
  db: Db,
  storeAccountId: string,
  companyId: string,
  productId: string,
  variantId?: string,
  quantity?: number,
) {
  // 1. Load company's default price list
  const [company] = await db
    .select({ defaultPriceListId: b2bCompanies.defaultPriceListId })
    .from(b2bCompanies)
    .where(and(eq(b2bCompanies.id, companyId), eq(b2bCompanies.storeAccountId, storeAccountId)))
    .limit(1);

  if (!company?.defaultPriceListId) return null;

  const [priceList] = await db
    .select()
    .from(b2bPriceLists)
    .where(eq(b2bPriceLists.id, company.defaultPriceListId))
    .limit(1);

  if (!priceList) return null;

  // 2. Look for item-level override — variantId match first, then productId only
  let item: typeof b2bPriceListItems.$inferSelect | null = null;
  if (variantId) {
    const [variantItem] = await db
      .select()
      .from(b2bPriceListItems)
      .where(
        and(
          eq(b2bPriceListItems.priceListId, priceList.id),
          eq(b2bPriceListItems.productId, productId),
          eq(b2bPriceListItems.variantId, variantId),
          eq(b2bPriceListItems.enabled, true),
        ),
      )
      .limit(1);
    item = variantItem ?? null;
  }

  if (!item) {
    const [productItem] = await db
      .select()
      .from(b2bPriceListItems)
      .where(
        and(
          eq(b2bPriceListItems.priceListId, priceList.id),
          eq(b2bPriceListItems.productId, productId),
          isNull(b2bPriceListItems.variantId),
          eq(b2bPriceListItems.enabled, true),
        ),
      )
      .limit(1);
    item = productItem ?? null;
  }

  // 3. Resolve price based on discount type
  let resolvedPriceCents: number | null = null;
  let resolvedDiscountPercentage: number | null = null;
  const minimumQuantity = item?.minimumQuantity ?? 1;
  const maximumQuantity = item?.maximumQuantity ?? null;

  if (priceList.discountType === "fixed_price") {
    resolvedPriceCents = item?.priceCents ?? null;
  } else if (priceList.discountType === "percentage") {
    // Get product retail price
    let retailPriceCents: number | null = null;

    if (variantId) {
      const [variant] = await db
        .select({ priceCents: productVariants.priceCents })
        .from(productVariants)
        .where(eq(productVariants.id, variantId))
        .limit(1);
      retailPriceCents = variant?.priceCents ?? null;
    } else {
      const [product] = await db
        .select({ priceCents: products.priceCents })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      retailPriceCents = product?.priceCents ?? null;
    }

    if (retailPriceCents !== null) {
      // Item-level discount takes priority over global
      const discountPct = item?.discountPercentage
        ? Number(item.discountPercentage)
        : Number(priceList.globalDiscountValue);
      resolvedDiscountPercentage = discountPct;
      resolvedPriceCents = Math.round(retailPriceCents * (1 - discountPct / 100));
    }
  }

  // 4. Check minimumQuantity
  if (quantity !== undefined && quantity < minimumQuantity) {
    // Return price but caller should enforce MOQ
  }

  return {
    priceCents: resolvedPriceCents,
    minimumQuantity,
    maximumQuantity,
    discountPercentage: resolvedDiscountPercentage,
  };
}

// ── Payment Terms ─────────────────────────────────────────────────────────────

export async function listPaymentTerms(
  db: Db,
  storeAccountId: string,
) {
  return db
    .select()
    .from(b2bPaymentTerms)
    .where(eq(b2bPaymentTerms.storeAccountId, storeAccountId));
}

export async function createPaymentTerms(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createPaymentTermsSchema>,
) {
  if (data.isDefault) {
    await db
      .update(b2bPaymentTerms)
      .set({ isDefault: false })
      .where(eq(b2bPaymentTerms.storeAccountId, storeAccountId));
  }

  const row: typeof b2bPaymentTerms.$inferInsert = {
    storeAccountId,
    name: data.name,
    netDays: data.netDays,
  };
  if (data.earlyPaymentDiscountDays !== undefined) row.earlyPaymentDiscountDays = data.earlyPaymentDiscountDays;
  if (data.earlyPaymentDiscountPercent !== undefined) row.earlyPaymentDiscountPercent = String(data.earlyPaymentDiscountPercent);
  if (data.allowedMethods !== undefined) row.allowedMethods = data.allowedMethods;
  if (data.requiresPurchaseOrder !== undefined) row.requiresPurchaseOrder = data.requiresPurchaseOrder;
  if (data.isDefault !== undefined) row.isDefault = data.isDefault;

  const [pt] = await db.insert(b2bPaymentTerms).values(row).returning();
  return pt;
}

export async function updatePaymentTerms(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updatePaymentTermsSchema>,
) {
  if (data.isDefault) {
    await db
      .update(b2bPaymentTerms)
      .set({ isDefault: false })
      .where(eq(b2bPaymentTerms.storeAccountId, storeAccountId));
  }

  const upd: Partial<typeof b2bPaymentTerms.$inferInsert> = {};
  if (data.name !== undefined) upd.name = data.name;
  if (data.netDays !== undefined) upd.netDays = data.netDays;
  if (data.earlyPaymentDiscountDays !== undefined) upd.earlyPaymentDiscountDays = data.earlyPaymentDiscountDays;
  if (data.earlyPaymentDiscountPercent !== undefined) upd.earlyPaymentDiscountPercent = String(data.earlyPaymentDiscountPercent);
  if (data.allowedMethods !== undefined) upd.allowedMethods = data.allowedMethods;
  if (data.requiresPurchaseOrder !== undefined) upd.requiresPurchaseOrder = data.requiresPurchaseOrder;
  if (data.isDefault !== undefined) upd.isDefault = data.isDefault;

  const [updated] = await db
    .update(b2bPaymentTerms)
    .set(upd)
    .where(and(eq(b2bPaymentTerms.id, id), eq(b2bPaymentTerms.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function deletePaymentTerms(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  // Guard: don't delete if any companies use it
  const [usingCompany] = await db
    .select({ id: b2bCompanies.id })
    .from(b2bCompanies)
    .where(
      and(
        eq(b2bCompanies.storeAccountId, storeAccountId),
        eq(b2bCompanies.defaultPaymentTermsId, id),
      ),
    )
    .limit(1);

  if (usingCompany) {
    throw new Error("Payment terms are in use by one or more companies");
  }

  const [deleted] = await db
    .delete(b2bPaymentTerms)
    .where(and(eq(b2bPaymentTerms.id, id), eq(b2bPaymentTerms.storeAccountId, storeAccountId)))
    .returning();
  return deleted ?? null;
}

// ── Minimum Orders ────────────────────────────────────────────────────────────

export async function listMinimumOrders(
  db: Db,
  storeAccountId: string,
) {
  return db
    .select()
    .from(b2bMinimumOrders)
    .where(eq(b2bMinimumOrders.storeAccountId, storeAccountId));
}

export async function createMinimumOrder(
  db: Db,
  storeAccountId: string,
  data: z.infer<typeof createMinimumOrderSchema>,
) {
  const row: typeof b2bMinimumOrders.$inferInsert = {
    storeAccountId,
  };
  if (data.b2bCompanyId !== undefined) row.b2bCompanyId = data.b2bCompanyId;
  if (data.shopId !== undefined) row.shopId = data.shopId;
  if (data.minimumOrderCents !== undefined) row.minimumOrderCents = data.minimumOrderCents;
  if (data.minimumOrderQuantity !== undefined) row.minimumOrderQuantity = data.minimumOrderQuantity;
  if (data.minimumOrderLines !== undefined) row.minimumOrderLines = data.minimumOrderLines;
  if (data.enabled !== undefined) row.enabled = data.enabled;

  const [mo] = await db.insert(b2bMinimumOrders).values(row).returning();
  return mo;
}

export async function updateMinimumOrder(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updateMinimumOrderSchema>,
) {
  const upd: Partial<typeof b2bMinimumOrders.$inferInsert> = {};
  if (data.b2bCompanyId !== undefined) upd.b2bCompanyId = data.b2bCompanyId;
  if (data.shopId !== undefined) upd.shopId = data.shopId;
  if (data.minimumOrderCents !== undefined) upd.minimumOrderCents = data.minimumOrderCents;
  if (data.minimumOrderQuantity !== undefined) upd.minimumOrderQuantity = data.minimumOrderQuantity;
  if (data.minimumOrderLines !== undefined) upd.minimumOrderLines = data.minimumOrderLines;
  if (data.enabled !== undefined) upd.enabled = data.enabled;

  const [updated] = await db
    .update(b2bMinimumOrders)
    .set(upd)
    .where(and(eq(b2bMinimumOrders.id, id), eq(b2bMinimumOrders.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function deleteMinimumOrder(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [deleted] = await db
    .delete(b2bMinimumOrders)
    .where(and(eq(b2bMinimumOrders.id, id), eq(b2bMinimumOrders.storeAccountId, storeAccountId)))
    .returning();
  return deleted ?? null;
}

export async function validateMinimumOrder(
  db: Db,
  storeAccountId: string,
  companyId: string,
  orderTotalCents: number,
  totalQuantity: number,
  lineCount: number,
) {
  const violations: string[] = [];

  // Check company-specific rules first, then global
  const rules = await db
    .select()
    .from(b2bMinimumOrders)
    .where(
      and(
        eq(b2bMinimumOrders.storeAccountId, storeAccountId),
        eq(b2bMinimumOrders.enabled, true),
      ),
    );

  const companyRules = rules.filter((r) => r.b2bCompanyId === companyId);
  const globalRules = rules.filter((r) => r.b2bCompanyId === null);
  const applicableRules = companyRules.length > 0 ? companyRules : globalRules;

  for (const rule of applicableRules) {
    if (rule.minimumOrderCents !== null && orderTotalCents < rule.minimumOrderCents) {
      violations.push(
        `Order total must be at least ${rule.minimumOrderCents} cents (got ${orderTotalCents})`,
      );
    }
    if (rule.minimumOrderQuantity !== null && totalQuantity < rule.minimumOrderQuantity) {
      violations.push(
        `Order must have at least ${rule.minimumOrderQuantity} units (got ${totalQuantity})`,
      );
    }
    if (rule.minimumOrderLines !== null && lineCount < rule.minimumOrderLines) {
      violations.push(
        `Order must have at least ${rule.minimumOrderLines} line items (got ${lineCount})`,
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

// ── Reorder Templates ─────────────────────────────────────────────────────────

export async function listReorderTemplates(
  db: Db,
  storeAccountId: string,
  companyId: string,
) {
  return db
    .select()
    .from(b2bReorderTemplates)
    .where(
      and(
        eq(b2bReorderTemplates.storeAccountId, storeAccountId),
        eq(b2bReorderTemplates.b2bCompanyId, companyId),
      ),
    );
}

type TemplateItem = {
  productId: string;
  variantId?: string;
  sku?: string;
  name?: string;
  quantity: number;
};

function normalizeTemplateItems(
  items: Array<{
    productId: string;
    variantId?: string | undefined;
    sku?: string | undefined;
    name?: string | undefined;
    quantity: number;
  }>,
): TemplateItem[] {
  return items.map((item) => {
    const out: TemplateItem = { productId: item.productId, quantity: item.quantity };
    if (item.variantId !== undefined) out.variantId = item.variantId;
    if (item.sku !== undefined) out.sku = item.sku;
    if (item.name !== undefined) out.name = item.name;
    return out;
  });
}

export async function createReorderTemplate(
  db: Db,
  storeAccountId: string,
  companyId: string,
  data: z.infer<typeof createReorderTemplateSchema>,
) {
  const [template] = await db
    .insert(b2bReorderTemplates)
    .values({
      storeAccountId,
      b2bCompanyId: companyId,
      name: data.name,
      items: normalizeTemplateItems(data.items),
    })
    .returning();
  return template;
}

export async function updateReorderTemplate(
  db: Db,
  id: string,
  storeAccountId: string,
  data: z.infer<typeof updateReorderTemplateSchema>,
) {
  const upd: Partial<typeof b2bReorderTemplates.$inferInsert> = {};
  if (data.name !== undefined) upd.name = data.name;
  if (data.items !== undefined) upd.items = normalizeTemplateItems(data.items);
  upd.updatedAt = new Date();

  const [updated] = await db
    .update(b2bReorderTemplates)
    .set(upd)
    .where(and(eq(b2bReorderTemplates.id, id), eq(b2bReorderTemplates.storeAccountId, storeAccountId)))
    .returning();
  return updated ?? null;
}

export async function deleteReorderTemplate(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [deleted] = await db
    .delete(b2bReorderTemplates)
    .where(and(eq(b2bReorderTemplates.id, id), eq(b2bReorderTemplates.storeAccountId, storeAccountId)))
    .returning();
  return deleted ?? null;
}

export async function useReorderTemplate(
  db: Db,
  id: string,
  storeAccountId: string,
) {
  const [template] = await db
    .select()
    .from(b2bReorderTemplates)
    .where(and(eq(b2bReorderTemplates.id, id), eq(b2bReorderTemplates.storeAccountId, storeAccountId)))
    .limit(1);

  if (!template) return null;

  await db
    .update(b2bReorderTemplates)
    .set({
      useCount: sql`${b2bReorderTemplates.useCount} + 1`,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(b2bReorderTemplates.id, id));

  return template.items;
}

// ── Credit Ledger ─────────────────────────────────────────────────────────────

export async function addCreditEvent(
  db: Db,
  storeAccountId: string,
  companyId: string,
  data: z.infer<typeof addCreditEventSchema>,
) {
  const row: typeof b2bCreditEvents.$inferInsert = {
    storeAccountId,
    b2bCompanyId: companyId,
    type: data.type,
    amountCents: data.amountCents,
  };
  if (data.orderId !== undefined) row.orderId = data.orderId;
  if (data.reference !== undefined) row.reference = data.reference;
  if (data.notes !== undefined) row.notes = data.notes;

  const [event] = await db.insert(b2bCreditEvents).values(row).returning();

  // Recalculate used credit and update company
  const [result] = await db
    .select({ total: sum(b2bCreditEvents.amountCents) })
    .from(b2bCreditEvents)
    .where(
      and(
        eq(b2bCreditEvents.b2bCompanyId, companyId),
        eq(b2bCreditEvents.storeAccountId, storeAccountId),
      ),
    );

  const usedCreditCents = Number(result?.total ?? 0);
  await db
    .update(b2bCompanies)
    .set({ usedCreditCents, updatedAt: new Date() })
    .where(and(eq(b2bCompanies.id, companyId), eq(b2bCompanies.storeAccountId, storeAccountId)));

  return event;
}

export async function listCreditEvents(
  db: Db,
  storeAccountId: string,
  companyId: string,
) {
  return db
    .select()
    .from(b2bCreditEvents)
    .where(
      and(
        eq(b2bCreditEvents.b2bCompanyId, companyId),
        eq(b2bCreditEvents.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(sql`${b2bCreditEvents.createdAt} DESC`);
}

// ── Warehouse Availability ────────────────────────────────────────────────────

export async function getWarehouseAvailability(
  db: Db,
  storeAccountId: string,
  productId: string,
  variantId?: string,
) {
  const conditions = [
    eq(inventoryLevels.storeAccountId, storeAccountId),
    eq(warehouses.storeAccountId, storeAccountId),
  ];

  if (variantId) {
    conditions.push(eq(inventoryLevels.variantId, variantId));
  } else {
    // Match by productId via variant join — for simple products we match on variantId being null
    // and rely on the caller to provide at least variantId or accept all levels
    conditions.push(isNull(inventoryLevels.variantId));
  }

  const rows = await db
    .select({
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      qtyAvailable: inventoryLevels.qtyAvailable,
      qtyReserved: inventoryLevels.qtyReserved,
      qtyIncoming: inventoryLevels.qtyIncoming,
    })
    .from(inventoryLevels)
    .innerJoin(warehouses, eq(inventoryLevels.warehouseId, warehouses.id))
    .where(and(...conditions));

  return rows;
}
