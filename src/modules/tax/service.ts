import type { Db } from "../../db/client.js";
import { taxRates, storeTaxConfigs, productTaxCategories, orders } from "../../db/schema/index.js";
import { eq, and, isNull, or, lte, gte } from "drizzle-orm";
import type { TaxLineItem } from "../../db/schema/index.js";

// ── Tax rate CRUD ─────────────────────────────────────────────────────────────

export async function listTaxRates(db: Db, countryCode?: string) {
  const now = new Date();

  const conditions = [
    or(isNull(taxRates.validTo), gte(taxRates.validTo, now)),
  ];

  if (countryCode !== undefined) {
    conditions.push(eq(taxRates.countryCode, countryCode));
  }

  return db
    .select()
    .from(taxRates)
    .where(and(...conditions));
}

export async function getTaxRate(
  db: Db,
  countryCode: string,
  category: string,
): Promise<{ ratePercent: string; name: string } | null> {
  const now = new Date();

  const [row] = await db
    .select({ ratePercent: taxRates.ratePercent, name: taxRates.name })
    .from(taxRates)
    .where(
      and(
        eq(taxRates.countryCode, countryCode),
        eq(taxRates.category, category as typeof taxRates.category._.data),
        or(isNull(taxRates.validTo), gte(taxRates.validTo, now)),
        or(isNull(taxRates.validFrom), lte(taxRates.validFrom, now)),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function upsertTaxRate(
  db: Db,
  data: {
    countryCode: string;
    category: string;
    ratePercent: string;
    name: string;
    validFrom?: string;
    validTo?: string;
  },
) {
  const insertValues: typeof taxRates.$inferInsert = {
    countryCode: data.countryCode,
    category: data.category as typeof taxRates.category._.data,
    ratePercent: data.ratePercent,
    name: data.name,
  };

  if (data.validFrom !== undefined) {
    insertValues.validFrom = new Date(data.validFrom);
  }
  if (data.validTo !== undefined) {
    insertValues.validTo = new Date(data.validTo);
  }

  const [result] = await db
    .insert(taxRates)
    .values(insertValues)
    .onConflictDoUpdate({
      target: [taxRates.countryCode, taxRates.category],
      // Only update when validTo IS NULL (active rate) — matches the partial unique index
      set: {
        ratePercent: data.ratePercent,
        name: data.name,
        ...(data.validFrom !== undefined && { validFrom: new Date(data.validFrom) }),
        ...(data.validTo !== undefined && { validTo: new Date(data.validTo) }),
      },
    })
    .returning();

  return result;
}

export async function deleteTaxRate(db: Db, id: string) {
  await db.delete(taxRates).where(eq(taxRates.id, id));
}

// ── Store tax config ──────────────────────────────────────────────────────────

const DEFAULT_STORE_TAX_CONFIG = {
  defaultCountryCode: "SE",
  pricesIncludeTax: true,
  defaultTaxCategory: "standard" as const,
  b2bTaxExemptByDefault: false,
};

export async function getStoreTaxConfig(db: Db, storeAccountId: string) {
  const [row] = await db
    .select()
    .from(storeTaxConfigs)
    .where(eq(storeTaxConfigs.storeAccountId, storeAccountId))
    .limit(1);

  if (!row) {
    return { ...DEFAULT_STORE_TAX_CONFIG };
  }

  return {
    defaultCountryCode: row.defaultCountryCode,
    pricesIncludeTax: row.pricesIncludeTax,
    defaultTaxCategory: row.defaultTaxCategory,
    b2bTaxExemptByDefault: row.b2bTaxExemptByDefault,
  };
}

export async function upsertStoreTaxConfig(
  db: Db,
  storeAccountId: string,
  data: {
    defaultCountryCode: string;
    pricesIncludeTax: boolean;
    defaultTaxCategory: string;
    b2bTaxExemptByDefault: boolean;
  },
) {
  const [result] = await db
    .insert(storeTaxConfigs)
    .values({
      storeAccountId,
      defaultCountryCode: data.defaultCountryCode,
      pricesIncludeTax: data.pricesIncludeTax,
      defaultTaxCategory: data.defaultTaxCategory as typeof storeTaxConfigs.defaultTaxCategory._.data,
      b2bTaxExemptByDefault: data.b2bTaxExemptByDefault,
    })
    .onConflictDoUpdate({
      target: storeTaxConfigs.storeAccountId,
      set: {
        defaultCountryCode: data.defaultCountryCode,
        pricesIncludeTax: data.pricesIncludeTax,
        defaultTaxCategory: data.defaultTaxCategory as typeof storeTaxConfigs.defaultTaxCategory._.data,
        b2bTaxExemptByDefault: data.b2bTaxExemptByDefault,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

// ── Product tax category ──────────────────────────────────────────────────────

export async function setProductTaxCategory(
  db: Db,
  storeAccountId: string,
  productId: string,
  taxCategory: string,
) {
  const [result] = await db
    .insert(productTaxCategories)
    .values({
      storeAccountId,
      productId,
      taxCategory: taxCategory as typeof productTaxCategories.taxCategory._.data,
    })
    .onConflictDoUpdate({
      target: [productTaxCategories.storeAccountId, productTaxCategories.productId],
      set: {
        taxCategory: taxCategory as typeof productTaxCategories.taxCategory._.data,
      },
    })
    .returning();

  return result;
}

export async function getProductTaxCategory(
  db: Db,
  storeAccountId: string,
  productId: string,
): Promise<string> {
  const [row] = await db
    .select({ taxCategory: productTaxCategories.taxCategory })
    .from(productTaxCategories)
    .where(
      and(
        eq(productTaxCategories.storeAccountId, storeAccountId),
        eq(productTaxCategories.productId, productId),
      ),
    )
    .limit(1);

  if (row) {
    return row.taxCategory;
  }

  // Fall back to store config default
  const config = await getStoreTaxConfig(db, storeAccountId);
  return config.defaultTaxCategory;
}

// ── Core tax calculation ──────────────────────────────────────────────────────

export interface TaxCalculationResult {
  subtotalExTax: number;       // cents, excluding tax
  subtotalIncTax: number;      // cents, including tax
  totalTaxCents: number;       // total VAT/tax amount
  taxBreakdown: TaxLineItem[]; // per rate-line
  shippingExTax: number;
  shippingTaxCents: number;
  grandTotalCents: number;
}

interface TaxLineAccumulator {
  label: string;
  ratePercent: number;
  taxableAmountCents: number;
  taxAmountCents: number;
  category: string;
}

export async function calculateTax(
  db: Db,
  opts: {
    countryCode: string;
    items: Array<{
      productId?: string;
      amountCents: number;
      taxCategory?: string;
    }>;
    shippingCents: number;
    pricesIncludeTax: boolean;
    storeAccountId: string;
  },
): Promise<TaxCalculationResult> {
  const storeConfig = await getStoreTaxConfig(db, opts.storeAccountId);

  // Accumulate tax lines keyed by "label|ratePercent"
  const lineMap = new Map<string, TaxLineAccumulator>();

  let subtotalExTax = 0;
  let subtotalIncTax = 0;

  for (const item of opts.items) {
    // 1. Determine tax category for this item
    let category: string;
    if (item.taxCategory !== undefined) {
      category = item.taxCategory;
    } else if (item.productId !== undefined) {
      category = await getProductTaxCategory(db, opts.storeAccountId, item.productId);
    } else {
      category = storeConfig.defaultTaxCategory;
    }

    // 2. Look up the rate
    let rateValue = 0;
    let rateName = "Tax";
    if (category !== "exempt" && category !== "zero") {
      const rateRow = await getTaxRate(db, opts.countryCode, category);
      if (rateRow) {
        rateValue = parseFloat(rateRow.ratePercent);
        rateName = rateRow.name;
      }
    }

    // 3. Compute amounts
    let taxAmount: number;
    let exTax: number;
    let incTax: number;

    if (opts.pricesIncludeTax) {
      taxAmount = Math.round((item.amountCents * rateValue) / (100 + rateValue));
      exTax = item.amountCents - taxAmount;
      incTax = item.amountCents;
    } else {
      taxAmount = Math.round((item.amountCents * rateValue) / 100);
      exTax = item.amountCents;
      incTax = item.amountCents + taxAmount;
    }

    subtotalExTax += exTax;
    subtotalIncTax += incTax;

    // 4. Merge into line map
    const key = `${rateName}|${rateValue}`;
    const existing = lineMap.get(key);
    if (existing) {
      existing.taxableAmountCents += exTax;
      existing.taxAmountCents += taxAmount;
    } else {
      lineMap.set(key, {
        label: rateName,
        ratePercent: rateValue,
        taxableAmountCents: exTax,
        taxAmountCents: taxAmount,
        category,
      });
    }
  }

  // 5. Shipping tax — always uses store defaultTaxCategory
  let shippingTaxCents = 0;
  let shippingExTax = opts.shippingCents;

  if (opts.shippingCents > 0) {
    const shippingCategory = storeConfig.defaultTaxCategory;
    let shippingRate = 0;
    let shippingRateName = "Tax";

    if (shippingCategory !== "exempt" && shippingCategory !== "zero") {
      const rateRow = await getTaxRate(db, opts.countryCode, shippingCategory);
      if (rateRow) {
        shippingRate = parseFloat(rateRow.ratePercent);
        shippingRateName = rateRow.name;
      }
    }

    if (opts.pricesIncludeTax) {
      shippingTaxCents = Math.round((opts.shippingCents * shippingRate) / (100 + shippingRate));
      shippingExTax = opts.shippingCents - shippingTaxCents;
    } else {
      shippingTaxCents = Math.round((opts.shippingCents * shippingRate) / 100);
      shippingExTax = opts.shippingCents;
    }

    const key = `${shippingRateName}|${shippingRate}`;
    const existing = lineMap.get(key);
    if (existing) {
      existing.taxableAmountCents += shippingExTax;
      existing.taxAmountCents += shippingTaxCents;
    } else {
      lineMap.set(key, {
        label: shippingRateName,
        ratePercent: shippingRate,
        taxableAmountCents: shippingExTax,
        taxAmountCents: shippingTaxCents,
        category: shippingCategory,
      });
    }
  }

  // 6. Build taxBreakdown array — filter out zero-tax lines
  const taxBreakdown: TaxLineItem[] = Array.from(lineMap.values())
    .filter((line) => line.taxAmountCents > 0 || line.ratePercent > 0)
    .map((line) => ({
      label: line.label,
      ratePercent: line.ratePercent,
      taxableAmountCents: line.taxableAmountCents,
      taxAmountCents: line.taxAmountCents,
      category: line.category,
    }));

  const totalTaxCents = taxBreakdown.reduce((sum, l) => sum + l.taxAmountCents, 0);

  const shippingIncTax = opts.pricesIncludeTax
    ? opts.shippingCents
    : opts.shippingCents + shippingTaxCents;

  const grandTotalCents = subtotalIncTax + shippingIncTax;

  return {
    subtotalExTax,
    subtotalIncTax,
    totalTaxCents,
    taxBreakdown,
    shippingExTax,
    shippingTaxCents,
    grandTotalCents,
  };
}

export function formatTaxBreakdownForOrder(result: TaxCalculationResult): TaxLineItem[] {
  return result.taxBreakdown;
}

// ── Export-safe order totals ──────────────────────────────────────────────────

export interface OrderTaxExport {
  orderNumber: string;
  date: string;
  currency: string;
  subtotalExTaxCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
  taxLines: TaxLineItem[];
  countryCode: string;
}

export async function getOrderTaxExport(
  db: Db,
  orderId: string,
  storeAccountId: string,
): Promise<OrderTaxExport | null> {
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

  const taxLines: TaxLineItem[] = order.taxBreakdown ?? [];
  const totalTaxCents = order.taxCents;
  const grandTotalCents = order.totalCents;
  const subtotalExTaxCents = grandTotalCents - totalTaxCents;

  // Derive country code from shipping address if available
  const shippingAddress = order.shippingAddress as Record<string, unknown> | null | undefined;
  const countryCode =
    typeof shippingAddress?.countryCode === "string"
      ? shippingAddress.countryCode
      : typeof shippingAddress?.country === "string"
        ? shippingAddress.country
        : "XX";

  return {
    orderNumber: order.orderNumber,
    date: order.createdAt.toISOString(),
    currency: order.currency,
    subtotalExTaxCents,
    totalTaxCents,
    grandTotalCents,
    taxLines,
    countryCode,
  };
}
