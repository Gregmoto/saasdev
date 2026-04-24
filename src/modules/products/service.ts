import { eq, and, ilike, desc, asc, count, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { products, productVariants, productCategories, shopProductVisibility } from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  createCategorySchema,
  updateCategorySchema,
  productQuerySchema,
} from "./schemas.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type CreateProductData = z.infer<typeof createProductSchema>;
type UpdateProductData = z.infer<typeof updateProductSchema>;
type CreateVariantData = z.infer<typeof createVariantSchema>;
type UpdateVariantData = z.infer<typeof updateVariantSchema>;
type CreateCategoryData = z.infer<typeof createCategorySchema>;
type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
type ProductQueryOpts = z.infer<typeof productQuerySchema>;

// ── Categories ────────────────────────────────────────────────────────────────

export async function listCategories(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.storeAccountId, storeAccountId))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
}

export async function createCategory(
  db: Db,
  storeAccountId: string,
  data: CreateCategoryData,
) {
  const [row] = await db
    .insert(productCategories)
    .values({
      storeAccountId,
      name: data.name,
      slug: data.slug,
      ...(data.parentId !== undefined && { parentId: data.parentId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    })
    .returning();
  if (!row) throw new Error("Failed to create category");
  return row;
}

export async function updateCategory(
  db: Db,
  categoryId: string,
  storeAccountId: string,
  data: UpdateCategoryData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set["name"] = data.name;
  if (data.slug !== undefined) set["slug"] = data.slug;
  if (data.parentId !== undefined) set["parentId"] = data.parentId;
  if (data.description !== undefined) set["description"] = data.description;
  if (data.sortOrder !== undefined) set["sortOrder"] = data.sortOrder;

  const [row] = await db
    .update(productCategories)
    .set(set)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw Object.assign(new Error("Category not found"), { statusCode: 404 });
  return row;
}

export async function deleteCategory(
  db: Db,
  categoryId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: productCategories.id });
  return rows.length > 0;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function listProducts(
  db: Db,
  storeAccountId: string,
  opts: ProductQueryOpts,
) {
  const { page, limit, search, status, categoryId, shopId, sort = "createdAt", order = "desc" } = opts;
  const offset = (page - 1) * limit;

  // Build the where conditions.
  const conditions = [eq(products.storeAccountId, storeAccountId)];
  if (search) conditions.push(ilike(products.name, `%${search}%`));
  if (status) conditions.push(eq(products.status, status));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  const where = and(...conditions);

  // Resolve sort column.
  const sortCol =
    sort === "name"
      ? products.name
      : sort === "price"
        ? products.priceCents
        : products.createdAt;

  const orderFn = order === "asc" ? asc : desc;

  if (shopId) {
    // ── Shop-context view: LEFT JOIN with shop_product_visibility ─────────────
    // Returns all master-catalog products enriched with per-shop visibility status.
    const visConditions = [
      eq(shopProductVisibility.shopId, shopId),
      eq(shopProductVisibility.storeAccountId, storeAccountId),
    ];

    const [countRow] = await db
      .select({ total: count() })
      .from(products)
      .leftJoin(
        shopProductVisibility,
        and(
          eq(shopProductVisibility.productId, products.id),
          ...visConditions,
        ),
      )
      .where(where);

    const total = Number(countRow?.total ?? 0);

    const rows = await db
      .select({
        // All product columns
        id: products.id,
        storeAccountId: products.storeAccountId,
        categoryId: products.categoryId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        status: products.status,
        priceCents: products.priceCents,
        compareAtPriceCents: products.compareAtPriceCents,
        taxable: products.taxable,
        trackInventory: products.trackInventory,
        inventoryQuantity: products.inventoryQuantity,
        weight: products.weight,
        sku: products.sku,
        barcode: products.barcode,
        images: products.images,
        metadata: products.metadata,
        publishedAt: products.publishedAt,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        // Per-shop visibility (null = not activated for this shop)
        shopIsPublished: shopProductVisibility.isPublished,
        shopPublishedAt: shopProductVisibility.publishedAt,
      })
      .from(products)
      .leftJoin(
        shopProductVisibility,
        and(
          eq(shopProductVisibility.productId, products.id),
          ...visConditions,
        ),
      )
      .where(where)
      .orderBy(orderFn(sortCol))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      shopIsPublished: r.shopIsPublished ?? false,
      shopPublishedAt: r.shopPublishedAt ?? null,
    }));

    return { items, total, page, totalPages: Math.ceil(total / limit), shopId };
  }

  // ── Master catalog view (no shop context) ─────────────────────────────────
  const [countRow] = await db
    .select({ total: count() })
    .from(products)
    .where(where);

  const total = Number(countRow?.total ?? 0);

  const items = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(orderFn(sortCol))
    .limit(limit)
    .offset(offset);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    shopId: null,
  };
}

export async function getProduct(
  db: Db,
  productId: string,
  storeAccountId: string,
) {
  const [row] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createProduct(
  db: Db,
  storeAccountId: string,
  data: CreateProductData,
) {
  const [row] = await db
    .insert(products)
    .values({
      storeAccountId,
      name: data.name,
      slug: data.slug,
      priceCents: data.priceCents,
      ...(data.status !== undefined && { status: data.status }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.compareAtPriceCents !== undefined && {
        compareAtPriceCents: data.compareAtPriceCents,
      }),
      ...(data.taxable !== undefined && { taxable: data.taxable }),
      ...(data.trackInventory !== undefined && { trackInventory: data.trackInventory }),
      ...(data.inventoryQuantity !== undefined && {
        inventoryQuantity: data.inventoryQuantity,
      }),
      ...(data.weight !== undefined && { weight: data.weight }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.images !== undefined && { images: data.images }),
    })
    .returning();
  if (!row) throw new Error("Failed to create product");
  return row;
}

export async function updateProduct(
  db: Db,
  productId: string,
  storeAccountId: string,
  data: UpdateProductData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set["name"] = data.name;
  if (data.slug !== undefined) set["slug"] = data.slug;
  if (data.priceCents !== undefined) set["priceCents"] = data.priceCents;
  if (data.status !== undefined) set["status"] = data.status;
  if (data.description !== undefined) set["description"] = data.description;
  if (data.categoryId !== undefined) set["categoryId"] = data.categoryId;
  if (data.compareAtPriceCents !== undefined) set["compareAtPriceCents"] = data.compareAtPriceCents;
  if (data.taxable !== undefined) set["taxable"] = data.taxable;
  if (data.trackInventory !== undefined) set["trackInventory"] = data.trackInventory;
  if (data.inventoryQuantity !== undefined) set["inventoryQuantity"] = data.inventoryQuantity;
  if (data.weight !== undefined) set["weight"] = data.weight;
  if (data.sku !== undefined) set["sku"] = data.sku;
  if (data.barcode !== undefined) set["barcode"] = data.barcode;
  if (data.images !== undefined) set["images"] = data.images;
  if (data.publishedAt !== undefined) set["publishedAt"] = new Date(data.publishedAt);

  const [row] = await db
    .update(products)
    .set(set)
    .where(
      and(
        eq(products.id, productId),
        eq(products.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw Object.assign(new Error("Product not found"), { statusCode: 404 });
  return row;
}

export async function deleteProduct(
  db: Db,
  productId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: products.id });
  return rows.length > 0;
}

export async function bulkDeleteProducts(
  db: Db,
  storeAccountId: string,
  ids: string[],
): Promise<number> {
  const rows = await db
    .delete(products)
    .where(
      and(
        eq(products.storeAccountId, storeAccountId),
        inArray(products.id, ids),
      ),
    )
    .returning({ id: products.id });
  return rows.length;
}

export async function countProducts(db: Db, storeAccountId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.storeAccountId, storeAccountId));
  return Number(row?.total ?? 0);
}

// ── Variants ──────────────────────────────────────────────────────────────────

export async function listVariants(
  db: Db,
  productId: string,
  storeAccountId: string,
) {
  return db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(productVariants.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
}

export async function createVariant(
  db: Db,
  productId: string,
  storeAccountId: string,
  data: CreateVariantData,
) {
  const [row] = await db
    .insert(productVariants)
    .values({
      productId,
      storeAccountId,
      title: data.title,
      priceCents: data.priceCents,
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.compareAtPriceCents !== undefined && {
        compareAtPriceCents: data.compareAtPriceCents,
      }),
      ...(data.inventoryQuantity !== undefined && {
        inventoryQuantity: data.inventoryQuantity,
      }),
      ...(data.options !== undefined && { options: data.options }),
    })
    .returning();
  if (!row) throw new Error("Failed to create variant");
  return row;
}

export async function updateVariant(
  db: Db,
  variantId: string,
  productId: string,
  storeAccountId: string,
  data: UpdateVariantData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) set["title"] = data.title;
  if (data.priceCents !== undefined) set["priceCents"] = data.priceCents;
  if (data.sortOrder !== undefined) set["sortOrder"] = data.sortOrder;
  if (data.sku !== undefined) set["sku"] = data.sku;
  if (data.barcode !== undefined) set["barcode"] = data.barcode;
  if (data.compareAtPriceCents !== undefined) set["compareAtPriceCents"] = data.compareAtPriceCents;
  if (data.inventoryQuantity !== undefined) set["inventoryQuantity"] = data.inventoryQuantity;
  if (data.options !== undefined) set["options"] = data.options;

  const [row] = await db
    .update(productVariants)
    .set(set)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId),
        eq(productVariants.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!row) throw Object.assign(new Error("Variant not found"), { statusCode: 404 });
  return row;
}

export async function deleteVariant(
  db: Db,
  variantId: string,
  productId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(productVariants)
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId),
        eq(productVariants.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: productVariants.id });
  return rows.length > 0;
}
