import { eq, and, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import * as ImportService from "./service.js";
import { validateShopifyCredentials, fetchShopifyData } from "./connectors/shopify.js";
import { validateWooCommerceCredentials, fetchWooCommerceData } from "./connectors/woocommerce.js";
import { validatePrestaShopCredentials, fetchPrestaShopData } from "./connectors/prestashop.js";
import { products, productVariants, customers, orders, orderItems } from "../../db/schema/index.js";
import {
  importProfiles,
  importJobs,
  importConflicts,
} from "../../db/schema/import-center.js";
import type {
  PlatformData,
  PlatformProduct,
  PlatformCustomer,
  PlatformOrder,
} from "./connectors/types.js";
import type {
  ImportFieldMapping,
  ImportStats,
  ImportDryRunResults,
  EntityImportStats,
  ShopifyCredentials,
  WooCommerceCredentials,
  PrestaShopCredentials,
  ImportJob,
  ImportMode,
  EntityProgress,
  ConflictField,
} from "../../db/schema/import-center.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 100;

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(name: string, suffix?: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
  return suffix ? `${base}-${suffix}` : base;
}

function extractField(
  raw: Record<string, unknown>,
  mapping: Record<string, string> | undefined,
  ourField: string,
  defaultField: string,
): string {
  const mappedField = mapping?.[ourField] ?? defaultField;
  return String(raw[mappedField] ?? "");
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Progress checkpointing ────────────────────────────────────────────────────

async function checkpointProgress(
  db: Db,
  jobId: string,
  entity: "products" | "customers" | "orders",
  progress: EntityProgress,
  entityStats: EntityImportStats,
): Promise<void> {
  await db
    .update(importJobs)
    .set({
      progress: sql`jsonb_set(${importJobs.progress}, '{${sql.raw(entity)}}', ${JSON.stringify(progress)}::jsonb)`,
      stats: sql`jsonb_set(${importJobs.stats}, '{${sql.raw(entity)}}', ${JSON.stringify(entityStats)}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));
}

// ── Conflict recording ────────────────────────────────────────────────────────

function recordConflict(
  db: Db,
  storeAccountId: string,
  jobId: string,
  entity: "products" | "customers" | "orders",
  externalId: string,
  internalId: string,
  fields: ConflictField[],
): void {
  db.insert(importConflicts)
    .values({
      storeAccountId,
      jobId,
      entity,
      externalId,
      internalId,
      conflictFields: fields,
    })
    .catch(() => undefined);
}

// ── Batched product import ────────────────────────────────────────────────────

async function importProductsBatched(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformProducts: PlatformProduct[],
  fieldMapping: ImportFieldMapping,
  mode: ImportMode,
  isDryRun: boolean,
  existingProgress: EntityProgress | undefined,
): Promise<EntityImportStats> {
  const stats: EntityImportStats = {
    total: platformProducts.length,
    created: 0,
    skipped: 0,
    errored: 0,
  };

  const mapping = fieldMapping.products;

  // Sort by externalId for resumability
  const sorted = [...platformProducts].sort((a, b) =>
    a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0,
  );

  // Skip already-processed items on resume
  const lastExternalId = existingProgress?.lastExternalId ?? null;
  const toProcess = lastExternalId
    ? sorted.filter((p) => p.externalId > lastExternalId)
    : sorted;

  // Restore counts from existing progress
  let processedCount = existingProgress?.processed ?? 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    for (const product of batch) {
      try {
        const name =
          extractField(product.raw, mapping, "name", "title") ||
          product.name ||
          "Unnamed";
        const sku =
          extractField(product.raw, mapping, "sku", "sku") ||
          (product.sku ?? `import-${product.externalId}`);
        const priceField = mapping?.["priceCents"] ?? "price";
        const rawPrice = product.raw[priceField];
        const priceCents =
          typeof rawPrice === "number"
            ? Math.round(rawPrice * 100)
            : product.price !== undefined
              ? Math.round(product.price * 100)
              : 0;
        const statusRaw =
          extractField(product.raw, mapping, "status", "status") ||
          product.status;
        const productStatus: "draft" | "published" | "archived" =
          statusRaw === "active"
            ? "published"
            : statusRaw === "archived"
              ? "archived"
              : "draft";
        const hasVariants = (product.variants?.length ?? 0) > 1;
        const productType: "simple" | "variable" = hasVariants
          ? "variable"
          : "simple";

        // Find existing by SKU
        const existingBySku = await db
          .select({ id: products.id, name: products.name, priceCents: products.priceCents, status: products.status })
          .from(products)
          .where(
            and(
              eq(products.storeAccountId, storeAccountId),
              eq(products.sku, sku),
            ),
          )
          .limit(1);

        // EAN fallback: if no SKU match, try barcode column on product
        let existingRow = existingBySku[0] as typeof existingBySku[0] | undefined;
        if (!existingRow && product.ean) {
          const existingByEan = await db
            .select({ id: products.id, name: products.name, priceCents: products.priceCents, status: products.status })
            .from(products)
            .where(
              and(
                eq(products.storeAccountId, storeAccountId),
                eq(products.barcode, product.ean),
              ),
            )
            .limit(1);
          existingRow = existingByEan[0];
        }

        if (isDryRun) {
          if (existingRow) {
            if (mode === "create_only") {
              stats.skipped++;
            } else if (mode === "update_existing" || mode === "create_and_update") {
              stats.created++; // counts as "would update"
            } else {
              stats.skipped++;
            }
          } else {
            if (mode === "update_existing") {
              stats.skipped++;
            } else {
              stats.created++;
            }
          }
          processedCount++;
          continue;
        }

        if (existingRow) {
          if (mode === "create_only") {
            stats.skipped++;
          } else if (mode === "update_existing" || mode === "create_and_update") {
            // Detect conflicts (informational)
            const conflictFields: ConflictField[] = [];
            if (existingRow.name !== name) {
              conflictFields.push({
                field: "name",
                existingValue: existingRow.name,
                incomingValue: name,
              });
            }
            if (existingRow.priceCents !== priceCents) {
              conflictFields.push({
                field: "priceCents",
                existingValue: existingRow.priceCents,
                incomingValue: priceCents,
              });
            }
            if (existingRow.status !== productStatus) {
              conflictFields.push({
                field: "status",
                existingValue: existingRow.status,
                incomingValue: productStatus,
              });
            }
            if (conflictFields.length > 0) {
              recordConflict(
                db,
                storeAccountId,
                jobId,
                "products",
                product.externalId,
                existingRow.id,
                conflictFields,
              );
            }

            // Apply update
            const updateValues: Partial<typeof products.$inferInsert> = {
              name,
              priceCents,
              status: productStatus,
              type: productType,
              updatedAt: new Date(),
            };
            if (product.description !== undefined) {
              updateValues.description = product.description;
            }

            await db
              .update(products)
              .set(updateValues)
              .where(eq(products.id, existingRow.id));

            stats.created++; // counts updates as "created" for stats compatibility

            ImportService.appendJobLog(db, jobId, {
              ts: nowIso(),
              level: "info",
              entity: "products",
              message: `Updated product '${name}'`,
              externalId: product.externalId,
            }).catch(() => undefined);
          } else {
            stats.skipped++;
          }
        } else {
          // No existing product
          if (mode === "update_existing") {
            stats.skipped++;
          } else {
            // create_only or create_and_update → create
            const baseSlug = slugify(name);
            const slugConflict = await db
              .select({ id: products.id })
              .from(products)
              .where(
                and(
                  eq(products.storeAccountId, storeAccountId),
                  eq(products.slug, baseSlug),
                ),
              )
              .limit(1);

            const finalSlug =
              slugConflict.length > 0
                ? slugify(name, product.externalId)
                : baseSlug;

            const insertValues: typeof products.$inferInsert = {
              storeAccountId,
              name,
              slug: finalSlug,
              priceCents,
              status: productStatus,
              type: productType,
            };
            if (sku) insertValues.sku = sku;
            if (product.description !== undefined) {
              insertValues.description = product.description;
            }
            if (product.ean !== undefined) {
              insertValues.barcode = product.ean;
            }

            const [inserted] = await db
              .insert(products)
              .values(insertValues)
              .returning({ id: products.id });

            if (!inserted) {
              stats.errored++;
              processedCount++;
              continue;
            }

            // Insert variants for variable products
            if (hasVariants && product.variants && product.variants.length > 0) {
              const variantValues = product.variants.map((v, idx) => {
                const variantInsert: typeof productVariants.$inferInsert = {
                  storeAccountId,
                  productId: inserted.id,
                  title: v.title,
                  priceCents:
                    v.price !== undefined
                      ? Math.round(v.price * 100)
                      : priceCents,
                  inventoryQuantity: v.inventoryQuantity ?? 0,
                  options: v.options ?? {},
                  sortOrder: idx,
                };
                if (v.sku !== undefined) variantInsert.sku = v.sku;
                if (v.ean !== undefined) variantInsert.barcode = v.ean;
                return variantInsert;
              });
              await db.insert(productVariants).values(variantValues);
            }

            stats.created++;

            ImportService.appendJobLog(db, jobId, {
              ts: nowIso(),
              level: "info",
              entity: "products",
              message: `Created product '${name}'`,
              externalId: product.externalId,
            }).catch(() => undefined);
          }
        }
      } catch (err) {
        stats.errored++;
        const msg = err instanceof Error ? err.message : String(err);
        await ImportService.appendJobLog(db, jobId, {
          ts: nowIso(),
          level: "error",
          entity: "products",
          message: `Failed to import product: ${msg}`,
          externalId: product.externalId,
        }).catch(() => undefined);
      }

      processedCount++;
    }

    // Checkpoint after each batch
    if (!isDryRun) {
      const lastItem = batch[batch.length - 1];
      const lastId = lastItem?.externalId ?? null;
      await checkpointProgress(
        db,
        jobId,
        "products",
        { processed: processedCount, lastExternalId: lastId },
        stats,
      );
    }
  }

  return stats;
}

// ── Batched customer import ───────────────────────────────────────────────────

async function importCustomersBatched(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformCustomers: PlatformCustomer[],
  fieldMapping: ImportFieldMapping,
  mode: ImportMode,
  isDryRun: boolean,
  existingProgress: EntityProgress | undefined,
): Promise<EntityImportStats> {
  const stats: EntityImportStats = {
    total: platformCustomers.length,
    created: 0,
    skipped: 0,
    errored: 0,
  };

  const mapping = fieldMapping.customers;

  // Sort by externalId for resumability
  const sorted = [...platformCustomers].sort((a, b) =>
    a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0,
  );

  const lastExternalId = existingProgress?.lastExternalId ?? null;
  const toProcess = lastExternalId
    ? sorted.filter((c) => c.externalId > lastExternalId)
    : sorted;

  let processedCount = existingProgress?.processed ?? 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    for (const customer of batch) {
      try {
        const email =
          extractField(customer.raw, mapping, "email", "email") ||
          customer.email;

        if (!email) {
          stats.errored++;
          processedCount++;
          continue;
        }

        const existingRows = await db
          .select({
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            phone: customers.phone,
          })
          .from(customers)
          .where(
            and(
              eq(customers.storeAccountId, storeAccountId),
              eq(customers.email, email),
            ),
          )
          .limit(1);

        const existingRow = existingRows[0] as typeof existingRows[0] | undefined;

        const firstName =
          extractField(customer.raw, mapping, "firstName", "first_name") ||
          customer.firstName ||
          undefined;
        const lastName =
          extractField(customer.raw, mapping, "lastName", "last_name") ||
          customer.lastName ||
          undefined;
        const phone =
          extractField(customer.raw, mapping, "phone", "phone") ||
          customer.phone ||
          undefined;

        if (isDryRun) {
          if (existingRow) {
            if (mode === "create_only") {
              stats.skipped++;
            } else {
              stats.created++;
            }
          } else {
            if (mode === "update_existing") {
              stats.skipped++;
            } else {
              stats.created++;
            }
          }
          processedCount++;
          continue;
        }

        if (existingRow) {
          if (mode === "create_only") {
            stats.skipped++;
          } else if (mode === "update_existing" || mode === "create_and_update") {
            // Detect conflicts
            const conflictFields: ConflictField[] = [];
            if (firstName !== undefined && existingRow.firstName !== firstName) {
              conflictFields.push({
                field: "firstName",
                existingValue: existingRow.firstName,
                incomingValue: firstName,
              });
            }
            if (lastName !== undefined && existingRow.lastName !== lastName) {
              conflictFields.push({
                field: "lastName",
                existingValue: existingRow.lastName,
                incomingValue: lastName,
              });
            }
            if (phone !== undefined && existingRow.phone !== phone) {
              conflictFields.push({
                field: "phone",
                existingValue: existingRow.phone,
                incomingValue: phone,
              });
            }
            if (conflictFields.length > 0) {
              recordConflict(
                db,
                storeAccountId,
                jobId,
                "customers",
                customer.externalId,
                existingRow.id,
                conflictFields,
              );
            }

            const updateValues: Partial<typeof customers.$inferInsert> = {
              updatedAt: new Date(),
            };
            if (firstName !== undefined) updateValues.firstName = firstName;
            if (lastName !== undefined) updateValues.lastName = lastName;
            if (phone !== undefined) updateValues.phone = phone;

            await db
              .update(customers)
              .set(updateValues)
              .where(eq(customers.id, existingRow.id));

            stats.created++;

            ImportService.appendJobLog(db, jobId, {
              ts: nowIso(),
              level: "info",
              entity: "customers",
              message: `Updated customer '${email}'`,
              externalId: customer.externalId,
            }).catch(() => undefined);
          } else {
            stats.skipped++;
          }
        } else {
          if (mode === "update_existing") {
            stats.skipped++;
          } else {
            const insertValues: typeof customers.$inferInsert = {
              storeAccountId,
              email,
            };
            if (firstName !== undefined) insertValues.firstName = firstName;
            if (lastName !== undefined) insertValues.lastName = lastName;
            if (phone !== undefined) insertValues.phone = phone;

            await db.insert(customers).values(insertValues);
            stats.created++;

            ImportService.appendJobLog(db, jobId, {
              ts: nowIso(),
              level: "info",
              entity: "customers",
              message: `Created customer '${email}'`,
              externalId: customer.externalId,
            }).catch(() => undefined);
          }
        }
      } catch (err) {
        stats.errored++;
        const msg = err instanceof Error ? err.message : String(err);
        await ImportService.appendJobLog(db, jobId, {
          ts: nowIso(),
          level: "error",
          entity: "customers",
          message: `Failed to import customer: ${msg}`,
          externalId: customer.externalId,
        }).catch(() => undefined);
      }

      processedCount++;
    }

    // Checkpoint after each batch
    if (!isDryRun) {
      const lastItem = batch[batch.length - 1];
      const lastId = lastItem?.externalId ?? null;
      await checkpointProgress(
        db,
        jobId,
        "customers",
        { processed: processedCount, lastExternalId: lastId },
        stats,
      );
    }
  }

  return stats;
}

// ── Batched order import ──────────────────────────────────────────────────────

async function importOrdersBatched(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformOrders: PlatformOrder[],
  fieldMapping: ImportFieldMapping,
  _mode: ImportMode, // orders are always create_only
  isDryRun: boolean,
  existingProgress: EntityProgress | undefined,
): Promise<EntityImportStats> {
  const stats: EntityImportStats = {
    total: platformOrders.length,
    created: 0,
    skipped: 0,
    errored: 0,
  };

  const mapping = fieldMapping.orders;

  // Sort by externalId for resumability
  const sorted = [...platformOrders].sort((a, b) =>
    a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0,
  );

  const lastExternalId = existingProgress?.lastExternalId ?? null;
  const toProcess = lastExternalId
    ? sorted.filter((o) => o.externalId > lastExternalId)
    : sorted;

  let processedCount = existingProgress?.processed ?? 0;
  let orderCounter = Date.now();

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    for (const order of batch) {
      try {
        const externalId =
          extractField(order.raw, mapping, "externalId", "id") ||
          order.externalId;

        // Check for duplicate via metadata->>'externalId' (always create_only for orders)
        const existing = await db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.storeAccountId, storeAccountId),
              sql`${orders.metadata}->>'externalId' = ${externalId}`,
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          stats.skipped++;
          processedCount++;
          continue;
        }

        if (isDryRun) {
          stats.created++;
          processedCount++;
          continue;
        }

        const rawStatus = order.financialStatus ?? order.status;
        const orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" =
          rawStatus === "paid" || rawStatus === "active"
            ? "confirmed"
            : rawStatus === "cancelled"
              ? "cancelled"
              : rawStatus === "refunded"
                ? "refunded"
                : rawStatus === "shipped"
                  ? "shipped"
                  : rawStatus === "delivered"
                    ? "delivered"
                    : "pending";

        const paymentStatus: "unpaid" | "paid" | "partially_refunded" | "refunded" | "voided" =
          rawStatus === "paid" || order.financialStatus === "paid"
            ? "paid"
            : rawStatus === "refunded" || order.financialStatus === "refunded"
              ? "refunded"
              : "unpaid";

        const totalCents = Math.round(order.totalPrice * 100);
        const orderNumber = order.orderNumber ?? String(++orderCounter);
        const currency = order.currency ?? "SEK";

        const customerEmail =
          extractField(order.raw, mapping, "customerEmail", "email") ||
          order.customerEmail ||
          undefined;

        const insertValues: typeof orders.$inferInsert = {
          storeAccountId,
          orderNumber,
          status: orderStatus,
          paymentStatus,
          subtotalCents: totalCents,
          totalCents,
          currency,
          metadata: { externalId },
        };
        if (customerEmail !== undefined) {
          insertValues.customerEmail = customerEmail;
        }

        const [inserted] = await db
          .insert(orders)
          .values(insertValues)
          .returning({ id: orders.id });

        if (!inserted) {
          stats.errored++;
          processedCount++;
          continue;
        }

        if (order.lineItems && order.lineItems.length > 0) {
          const itemValues = order.lineItems.map((li) => {
            const item: typeof orderItems.$inferInsert = {
              orderId: inserted.id,
              storeAccountId,
              title: li.name,
              quantity: li.quantity,
              unitPriceCents: Math.round(li.price * 100),
              totalPriceCents: Math.round(li.price * li.quantity * 100),
            };
            if (li.sku !== undefined) item.sku = li.sku;
            return item;
          });
          await db.insert(orderItems).values(itemValues);
        }

        stats.created++;

        ImportService.appendJobLog(db, jobId, {
          ts: nowIso(),
          level: "info",
          entity: "orders",
          message: `Created order '${orderNumber}'`,
          externalId,
        }).catch(() => undefined);
      } catch (err) {
        stats.errored++;
        const msg = err instanceof Error ? err.message : String(err);
        await ImportService.appendJobLog(db, jobId, {
          ts: nowIso(),
          level: "error",
          entity: "orders",
          message: `Failed to import order: ${msg}`,
          externalId: order.externalId,
        }).catch(() => undefined);
      }

      processedCount++;
    }

    // Checkpoint after each batch
    if (!isDryRun) {
      const lastItem = batch[batch.length - 1];
      const lastId = lastItem?.externalId ?? null;
      await checkpointProgress(
        db,
        jobId,
        "orders",
        { processed: processedCount, lastExternalId: lastId },
        stats,
      );
    }
  }

  return stats;
}

// ── Credential validation ──────────────────────────────────────────────────────

export async function executeValidation(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<void> {
  let job: ImportJob | null = null;
  try {
    job = await ImportService.getJobRaw(db, jobId, storeAccountId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== "draft" && job.status !== "validating") {
      throw new Error(`Job ${jobId} is in status '${job.status}', cannot validate`);
    }

    await ImportService.markJobValidating(db, jobId);

    const creds = ImportService.getDecryptedJobCredentials(job);
    if (!creds) {
      await ImportService.markJobFailed(db, jobId, "No credentials found on job");
      return;
    }

    let result: { valid: boolean; error?: string };

    if (job.platform === "shopify") {
      result = await validateShopifyCredentials(creds as ShopifyCredentials);
    } else if (job.platform === "woocommerce") {
      result = await validateWooCommerceCredentials(creds as WooCommerceCredentials);
    } else {
      result = await validatePrestaShopCredentials(creds as PrestaShopCredentials);
    }

    if (!result.valid) {
      await ImportService.markJobFailed(
        db,
        jobId,
        `Credential validation failed: ${result.error ?? "unknown error"}`,
      );
      return;
    }

    await ImportService.markJobPending(db, jobId);
    await ImportService.appendJobLog(db, jobId, {
      ts: nowIso(),
      level: "info",
      entity: "system",
      message: "Credential validation successful",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (job) {
      await ImportService.markJobFailed(db, jobId, msg).catch(() => undefined);
    }
  }
}

// ── Import execution ───────────────────────────────────────────────────────────

export async function executeImportJob(
  db: Db,
  jobId: string,
  storeAccountId: string,
): Promise<void> {
  let job: ImportJob | null = null;
  try {
    job = await ImportService.getJobRaw(db, jobId, storeAccountId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== "pending" && job.status !== "dry_running") {
      throw new Error(
        `Job ${jobId} is in status '${job.status}', expected 'pending' or 'dry_running'`,
      );
    }

    if (job.isDryRun) {
      await ImportService.markJobDryRunning(db, jobId);
    } else {
      await ImportService.markJobRunning(db, jobId);
    }

    const creds = ImportService.getDecryptedJobCredentials(job);
    if (!creds) throw new Error("No credentials on job");

    const entities = (job.selectedEntities ?? []) as string[];
    if (entities.length === 0) throw new Error("No entities selected");

    // Fetch data from platform
    let data: Partial<PlatformData>;
    if (job.platform === "shopify") {
      data = await fetchShopifyData(
        creds as ShopifyCredentials,
        entities as ("products" | "customers" | "orders")[],
      );
    } else if (job.platform === "woocommerce") {
      data = await fetchWooCommerceData(
        creds as WooCommerceCredentials,
        entities as ("products" | "customers" | "orders")[],
      );
    } else {
      data = await fetchPrestaShopData(
        creds as PrestaShopCredentials,
        entities as ("products" | "customers" | "orders")[],
      );
    }

    const fieldMapping = (job.fieldMapping ?? {}) as ImportFieldMapping;
    const mode: ImportMode = job.importMode ?? "create_only";
    const progress = job.progress ?? {};
    const stats: ImportStats = {};
    const dryRunResults: ImportDryRunResults = {};

    // Process each entity
    for (const entity of entities) {
      if (entity === "products" && data.products) {
        const existingProgress = progress.products ?? undefined;
        const result = await importProductsBatched(
          db,
          jobId,
          storeAccountId,
          data.products,
          fieldMapping,
          mode,
          job.isDryRun,
          existingProgress,
        );
        if (job.isDryRun) {
          dryRunResults.products = {
            total: result.total,
            wouldCreate: result.created,
            wouldSkip: result.skipped,
            sample: data.products.slice(0, 10).map((p) => p.raw),
          };
        } else {
          stats.products = result;
        }
      }

      if (entity === "customers" && data.customers) {
        const existingProgress = progress.customers ?? undefined;
        const result = await importCustomersBatched(
          db,
          jobId,
          storeAccountId,
          data.customers,
          fieldMapping,
          mode,
          job.isDryRun,
          existingProgress,
        );
        if (job.isDryRun) {
          dryRunResults.customers = {
            total: result.total,
            wouldCreate: result.created,
            wouldSkip: result.skipped,
            sample: data.customers.slice(0, 10).map((c) => c.raw),
          };
        } else {
          stats.customers = result;
        }
      }

      if (entity === "orders" && data.orders) {
        const existingProgress = progress.orders ?? undefined;
        const result = await importOrdersBatched(
          db,
          jobId,
          storeAccountId,
          data.orders,
          fieldMapping,
          mode,
          job.isDryRun,
          existingProgress,
        );
        if (job.isDryRun) {
          dryRunResults.orders = {
            total: result.total,
            wouldCreate: result.created,
            wouldSkip: result.skipped,
            sample: data.orders.slice(0, 10).map((o) => o.raw),
          };
        } else {
          stats.orders = result;
        }
      }
    }

    if (job.isDryRun) {
      await ImportService.updateJobDryRunResults(db, jobId, dryRunResults);
      await ImportService.markJobCompleted(db, jobId, {});
    } else {
      await ImportService.markJobCompleted(db, jobId, stats);
    }

    // If linked to a profile, save fieldMapping back to the profile for reuse
    if (job.profileId && !job.isDryRun && Object.keys(fieldMapping).length > 0) {
      await db
        .update(importProfiles)
        .set({ defaultFieldMapping: fieldMapping, updatedAt: new Date() })
        .where(eq(importProfiles.id, job.profileId));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (job) {
      await ImportService.markJobFailed(db, jobId, msg).catch(() => undefined);
    }
  }
}

// ── Backward-compatible named exports ─────────────────────────────────────────

export async function importProducts(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformProducts: PlatformProduct[],
  fieldMapping: ImportFieldMapping,
  isDryRun: boolean,
): Promise<EntityImportStats> {
  return importProductsBatched(
    db,
    jobId,
    storeAccountId,
    platformProducts,
    fieldMapping,
    "create_only",
    isDryRun,
    undefined,
  );
}

export async function importCustomers(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformCustomers: PlatformCustomer[],
  fieldMapping: ImportFieldMapping,
  isDryRun: boolean,
): Promise<EntityImportStats> {
  return importCustomersBatched(
    db,
    jobId,
    storeAccountId,
    platformCustomers,
    fieldMapping,
    "create_only",
    isDryRun,
    undefined,
  );
}

export async function importOrders(
  db: Db,
  jobId: string,
  storeAccountId: string,
  platformOrders: PlatformOrder[],
  fieldMapping: ImportFieldMapping,
  isDryRun: boolean,
): Promise<EntityImportStats> {
  return importOrdersBatched(
    db,
    jobId,
    storeAccountId,
    platformOrders,
    fieldMapping,
    "create_only",
    isDryRun,
    undefined,
  );
}
