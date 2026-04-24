import { eq, and, asc, isNull, sum } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import {
  bundleOptionGroups,
  bundleComponents,
  products,
  productVariants,
  inventoryLevels,
  warehouses,
} from "../../db/schema/index.js";
import type { BundleOptionGroup, BundleComponent } from "../../db/schema/bundles.js";

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Verify a product exists for the given store account and is type='bundle'.
 * Returns the product row on success.
 * Throws 404 if not found, 422 if found but not a bundle.
 */
async function requireBundleProduct(db: Db, bundleProductId: string, storeAccountId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, bundleProductId),
        eq(products.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!product) {
    throw Object.assign(new Error("Bundle product not found"), { statusCode: 404 });
  }
  if (product.type !== "bundle") {
    throw Object.assign(
      new Error("Product is not of type 'bundle'"),
      { statusCode: 422 },
    );
  }
  return product;
}

// ── Bundle details ─────────────────────────────────────────────────────────────

export async function getBundleDetails(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
): Promise<{ groups: BundleOptionGroup[]; components: BundleComponent[] } | null> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, bundleProductId),
        eq(products.storeAccountId, storeAccountId),
        eq(products.type, "bundle"),
      ),
    )
    .limit(1);

  if (!product) return null;

  const groups = await db
    .select()
    .from(bundleOptionGroups)
    .where(
      and(
        eq(bundleOptionGroups.bundleProductId, bundleProductId),
        eq(bundleOptionGroups.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(bundleOptionGroups.sortOrder));

  const components = await db
    .select()
    .from(bundleComponents)
    .where(
      and(
        eq(bundleComponents.bundleProductId, bundleProductId),
        eq(bundleComponents.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(bundleComponents.sortOrder));

  return { groups, components };
}

// ── Option groups ──────────────────────────────────────────────────────────────

export async function createOptionGroup(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  data: {
    name: string;
    minSelect?: number;
    maxSelect?: number;
    isRequired?: boolean;
    sortOrder?: number;
  },
): Promise<BundleOptionGroup> {
  await requireBundleProduct(db, bundleProductId, storeAccountId);

  const values: {
    storeAccountId: string;
    bundleProductId: string;
    name: string;
    minSelect?: number;
    maxSelect?: number;
    isRequired?: boolean;
    sortOrder?: number;
  } = {
    storeAccountId,
    bundleProductId,
    name: data.name,
  };

  if (data.minSelect !== undefined) values.minSelect = data.minSelect;
  if (data.maxSelect !== undefined) values.maxSelect = data.maxSelect;
  if (data.isRequired !== undefined) values.isRequired = data.isRequired;
  if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;

  try {
    const [row] = await db.insert(bundleOptionGroups).values(values).returning();
    if (!row) throw new Error("Failed to create option group");
    return row;
  } catch (err) {
    // Unique constraint: duplicate name within this bundle
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes("unique") &&
      err.message.toLowerCase().includes("bundle_option_groups_bundle_name_idx")
    ) {
      throw Object.assign(
        new Error("An option group with this name already exists in this bundle"),
        { statusCode: 409 },
      );
    }
    // Also catch Postgres error code 23505 via cause/code property
    const anyErr = err as Record<string, unknown>;
    if (anyErr["code"] === "23505") {
      throw Object.assign(
        new Error("An option group with this name already exists in this bundle"),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

export async function updateOptionGroup(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  groupId: string,
  data: {
    name?: string;
    minSelect?: number;
    maxSelect?: number;
    isRequired?: boolean;
    sortOrder?: number;
  },
): Promise<BundleOptionGroup> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set["name"] = data.name;
  if (data.minSelect !== undefined) set["minSelect"] = data.minSelect;
  if (data.maxSelect !== undefined) set["maxSelect"] = data.maxSelect;
  if (data.isRequired !== undefined) set["isRequired"] = data.isRequired;
  if (data.sortOrder !== undefined) set["sortOrder"] = data.sortOrder;

  const [row] = await db
    .update(bundleOptionGroups)
    .set(set)
    .where(
      and(
        eq(bundleOptionGroups.id, groupId),
        eq(bundleOptionGroups.bundleProductId, bundleProductId),
        eq(bundleOptionGroups.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!row) {
    throw Object.assign(new Error("Option group not found"), { statusCode: 404 });
  }
  return row;
}

export async function deleteOptionGroup(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  groupId: string,
): Promise<boolean> {
  const rows = await db
    .delete(bundleOptionGroups)
    .where(
      and(
        eq(bundleOptionGroups.id, groupId),
        eq(bundleOptionGroups.bundleProductId, bundleProductId),
        eq(bundleOptionGroups.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: bundleOptionGroups.id });
  return rows.length > 0;
}

// ── Components ─────────────────────────────────────────────────────────────────

export async function addComponent(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  data: {
    componentProductId?: string;
    componentVariantId?: string;
    optionGroupId?: string;
    quantity?: number;
    sortOrder?: number;
  },
): Promise<BundleComponent> {
  await requireBundleProduct(db, bundleProductId, storeAccountId);

  const values: {
    storeAccountId: string;
    bundleProductId: string;
    componentProductId?: string;
    componentVariantId?: string;
    optionGroupId?: string;
    quantity?: number;
    sortOrder?: number;
  } = {
    storeAccountId,
    bundleProductId,
  };

  if (data.componentProductId !== undefined) values.componentProductId = data.componentProductId;
  if (data.componentVariantId !== undefined) values.componentVariantId = data.componentVariantId;
  if (data.optionGroupId !== undefined) values.optionGroupId = data.optionGroupId;
  if (data.quantity !== undefined) values.quantity = data.quantity;
  if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;

  const [row] = await db.insert(bundleComponents).values(values).returning();
  if (!row) throw new Error("Failed to add component");
  return row;
}

export async function updateComponent(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  componentId: string,
  data: {
    quantity?: number;
    sortOrder?: number;
    optionGroupId?: string | null;
  },
): Promise<BundleComponent> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.quantity !== undefined) set["quantity"] = data.quantity;
  if (data.sortOrder !== undefined) set["sortOrder"] = data.sortOrder;
  // optionGroupId can be explicitly set to null (removing from a group)
  if ("optionGroupId" in data) set["optionGroupId"] = data.optionGroupId ?? null;

  const [row] = await db
    .update(bundleComponents)
    .set(set)
    .where(
      and(
        eq(bundleComponents.id, componentId),
        eq(bundleComponents.bundleProductId, bundleProductId),
        eq(bundleComponents.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!row) {
    throw Object.assign(new Error("Component not found"), { statusCode: 404 });
  }
  return row;
}

export async function removeComponent(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
  componentId: string,
): Promise<boolean> {
  const rows = await db
    .delete(bundleComponents)
    .where(
      and(
        eq(bundleComponents.id, componentId),
        eq(bundleComponents.bundleProductId, bundleProductId),
        eq(bundleComponents.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: bundleComponents.id });
  return rows.length > 0;
}

// ── Stock computation ──────────────────────────────────────────────────────────

export async function computeBundleStock(
  db: Db,
  bundleProductId: string,
  storeAccountId: string,
): Promise<{
  qtyAvailable: number;
  componentBreakdown: Array<{
    sku: string;
    qtyAvailable: number;
    requiredQty: number;
    contribution: number;
  }>;
}> {
  // Load required components (optionGroupId IS NULL)
  const requiredComponents = await db
    .select()
    .from(bundleComponents)
    .where(
      and(
        eq(bundleComponents.bundleProductId, bundleProductId),
        eq(bundleComponents.storeAccountId, storeAccountId),
        isNull(bundleComponents.optionGroupId),
      ),
    );

  if (requiredComponents.length === 0) {
    return { qtyAvailable: 0, componentBreakdown: [] };
  }

  const breakdown: Array<{
    sku: string;
    qtyAvailable: number;
    requiredQty: number;
    contribution: number;
  }> = [];

  for (const component of requiredComponents) {
    let sku: string | null = null;

    if (component.componentVariantId) {
      // Resolve SKU from product variant
      const [variant] = await db
        .select({ sku: productVariants.sku })
        .from(productVariants)
        .where(eq(productVariants.id, component.componentVariantId))
        .limit(1);
      sku = variant?.sku ?? null;
    } else if (component.componentProductId) {
      // Resolve SKU from product (simple product)
      const [product] = await db
        .select({ sku: products.sku })
        .from(products)
        .where(eq(products.id, component.componentProductId))
        .limit(1);
      sku = product?.sku ?? null;
    }

    if (!sku) continue;

    // Sum qtyAvailable across all active warehouses enabled for checkout
    const [stockRow] = await db
      .select({ total: sum(inventoryLevels.qtyAvailable) })
      .from(inventoryLevels)
      .innerJoin(
        warehouses,
        and(
          eq(warehouses.id, inventoryLevels.warehouseId),
          eq(warehouses.isActive, true),
          eq(warehouses.isEnabledForCheckout, true),
          eq(warehouses.storeAccountId, storeAccountId),
        ),
      )
      .where(
        and(
          eq(inventoryLevels.sku, sku),
          eq(inventoryLevels.storeAccountId, storeAccountId),
        ),
      );

    const totalQty = Number(stockRow?.total ?? 0);
    const requiredQty = component.quantity;
    const contribution = Math.floor(totalQty / requiredQty);

    breakdown.push({
      sku,
      qtyAvailable: totalQty,
      requiredQty,
      contribution,
    });
  }

  // Bundle stock = min over all required components
  const qtyAvailable =
    breakdown.length === 0
      ? 0
      : Math.min(...breakdown.map((c) => c.contribution));

  return { qtyAvailable, componentBreakdown: breakdown };
}
