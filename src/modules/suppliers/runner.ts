import { eq, and } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import * as SupplierService from "./service.js";
import { runFtpConnector } from "./connectors/ftp.js";
import { runSftpConnector } from "./connectors/sftp.js";
import { runApiConnector } from "./connectors/api.js";
import { parseRecords } from "./connectors/parser.js";
import { inventoryLevels, productVariants, products } from "../../db/schema/index.js";
import { supplierFeedRuns } from "../../db/schema/suppliers.js";
import type {
  MappingConfig,
  MatchRules,
  FeedRunLogEntry,
  SupplierFeed,
  PreviewRow,
  PreviewData,
} from "../../db/schema/suppliers.js";
import { resolveSkuMapping, createReviewItem } from "./review.js";

// ── ParsedRecord ──────────────────────────────────────────────────────────────

export interface ParsedRecord {
  sku?: string;
  ean?: string;
  qty: number;
  price?: number;
  costPrice?: number;
  raw?: Record<string, string>;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function executeFeedRun(
  db: Db,
  runId: string,
  storeAccountId: string,
  rawContent?: string,
  isDryRun?: boolean,
): Promise<void> {
  // 1. Fetch run row
  const run = await SupplierService.getRun(db, runId, storeAccountId);
  if (!run) {
    throw new Error(`Feed run not found: ${runId}`);
  }
  if (run.status !== "pending") {
    throw new Error(
      `Feed run ${runId} is not in pending status (current: ${run.status})`,
    );
  }

  // Use isDryRun from parameter or from the run row itself
  const dryRun = isDryRun ?? run.isDryRun ?? false;

  // 2. Fetch feed row
  const feed = await SupplierService.getFeed(db, run.feedId, storeAccountId);
  if (!feed) {
    throw new Error(`Supplier feed not found: ${run.feedId}`);
  }
  if (!feed.isActive) {
    throw new Error(`Supplier feed ${feed.id} is not active`);
  }

  // 3. Mark run as started
  await SupplierService.markRunStarted(db, runId);

  // 4. Local log helper
  async function log(
    level: FeedRunLogEntry["level"],
    message: string,
    rowIndex?: number,
  ): Promise<void> {
    const entry: FeedRunLogEntry = {
      ts: new Date().toISOString(),
      level,
      message,
    };
    if (rowIndex !== undefined) entry.rowIndex = rowIndex;

    console.log(`[supplier-run:${runId}] [${level}]${rowIndex !== undefined ? ` [row ${rowIndex}]` : ""} ${message}`);

    try {
      await SupplierService.appendRunLog(db, runId, entry);
    } catch (err) {
      console.error(`[supplier-run:${runId}] Failed to append log entry:`, err);
    }
  }

  // 5. Download / fetch step
  let records: ParsedRecord[];

  try {
    if (feed.connectorType === "api") {
      const creds = SupplierService.getDecryptedCredentials(feed) ?? {};
      const result = await runApiConnector(feed, creds);
      records = result.records;
      await log("info", `API connector fetched ${records.length} records`);
    } else {
      let content: string;
      let fileName: string | undefined;

      if (feed.connectorType === "ftp") {
        const creds = SupplierService.getDecryptedCredentials(feed) ?? {};
        const result = await runFtpConnector(feed, creds);
        content = result.content;
        fileName = result.fileName;
        await log("info", `FTP connector downloaded file: ${fileName}`);
      } else if (feed.connectorType === "sftp") {
        const creds = SupplierService.getDecryptedCredentials(feed) ?? {};
        const result = await runSftpConnector(feed, creds);
        content = result.content;
        fileName = result.fileName;
        await log("info", `SFTP connector downloaded file: ${fileName}`);
      } else {
        // manual_csv
        if (!rawContent) {
          await SupplierService.markRunFailed(
            db,
            runId,
            "manual_csv run requires rawContent but none was provided",
          );
          return;
        }
        content = rawContent;
        await log("info", "Using provided raw CSV content");
      }

      // 6. Parse step (ftp / sftp / manual_csv)
      try {
        records = await parseRecords(content!, feed.format, feed.mappingConfig);
        await log("info", `Parsed ${records.length} records from ${feed.format} content`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await log("error", `Parse failed: ${message}`);
        await SupplierService.markRunFailed(db, runId, `Parse error: ${message}`);
        return;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log("error", `Download/fetch failed: ${message}`);
    await SupplierService.markRunFailed(db, runId, message);
    return;
  }

  // 7. Apply step
  try {
    await applyRecords(db, runId, storeAccountId, feed, records, dryRun);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await log("error", `Apply step failed unexpectedly: ${message}`);
    await SupplierService.markRunFailed(db, runId, message);
  }
}

// ── applyRecords ──────────────────────────────────────────────────────────────

async function applyRecords(
  db: Db,
  runId: string,
  storeAccountId: string,
  feed: SupplierFeed,
  records: ParsedRecord[],
  isDryRun: boolean,
): Promise<void> {
  // 1. Load matchRules with defaults
  const matchRules: MatchRules = feed.matchRules ?? {
    primary: "sku",
    secondary: "ean",
  };

  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let rowsErrored = 0;
  let rowsFlaggedForReview = 0;
  let rowsCreatedPlaceholder = 0;

  // Dry-run preview accumulator
  const previewRows: PreviewRow[] = [];

  // Local log helper (fire-and-forget for per-record logs to avoid blocking the loop)
  function logEntry(
    level: FeedRunLogEntry["level"],
    message: string,
    rowIndex?: number,
  ): void {
    const entry: FeedRunLogEntry = {
      ts: new Date().toISOString(),
      level,
      message,
    };
    if (rowIndex !== undefined) entry.rowIndex = rowIndex;

    console.log(
      `[supplier-run:${runId}] [${level}]${rowIndex !== undefined ? ` [row ${rowIndex}]` : ""} ${message}`,
    );

    SupplierService.appendRunLog(db, runId, entry).catch((err) => {
      console.error(`[supplier-run:${runId}] Failed to append log entry:`, err);
    });
  }

  // Helper: find inventory level by SKU in the target warehouse
  async function findInventoryLevelBySku(sku: string) {
    const rows = await db
      .select()
      .from(inventoryLevels)
      .where(
        and(
          eq(inventoryLevels.storeAccountId, storeAccountId),
          eq(inventoryLevels.warehouseId, feed.targetWarehouseId),
          eq(inventoryLevels.sku, sku),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // Helper: resolve SKU from EAN (barcode) via productVariants
  async function findSkuByEan(ean: string): Promise<string | null> {
    const rows = await db
      .select({ sku: productVariants.sku })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(productVariants.barcode, ean),
          eq(productVariants.storeAccountId, storeAccountId),
          eq(products.storeAccountId, storeAccountId),
        ),
      )
      .limit(1);
    return rows[0]?.sku ?? null;
  }

  // Helper: resolve an inventory level using a match field ('sku' | 'ean') and a record
  async function resolveByField(
    field: "sku" | "ean",
    record: ParsedRecord,
  ): Promise<{ warehouseId: string; sku: string; currentQty?: number } | null> {
    if (field === "sku") {
      if (!record.sku) return null;
      const level = await findInventoryLevelBySku(record.sku);
      if (!level) return null;
      return { warehouseId: level.warehouseId, sku: level.sku, currentQty: level.qtyAvailable };
    } else {
      // ean
      if (!record.ean) return null;
      const sku = await findSkuByEan(record.ean);
      if (!sku) return null;
      const level = await findInventoryLevelBySku(sku);
      if (!level) return null;
      return { warehouseId: level.warehouseId, sku: level.sku, currentQty: level.qtyAvailable };
    }
  }

  // 2. Process each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;

    try {
      let matchedSku: string | null = null;
      let matchSource: "mapping" | "primary" | "secondary" | null = null;
      let currentQty: number | undefined;

      // a. Try SKU mapping lookup first (when primary field is 'sku')
      if (matchRules.primary === "sku" && record.sku) {
        const mappedSku = await resolveSkuMapping(db, storeAccountId, feed.id, record.sku);
        if (mappedSku) {
          matchedSku = mappedSku;
          matchSource = "mapping";
          // Also resolve the current qty for dry-run preview
          const level = await findInventoryLevelBySku(mappedSku);
          currentQty = level?.qtyAvailable;
        }
      }

      let matched: { warehouseId: string; sku: string; currentQty?: number } | null = null;

      if (matchedSku) {
        // SKU mapping resolved — verify the warehouse is correct
        const m: { warehouseId: string; sku: string; currentQty?: number } = {
          warehouseId: feed.targetWarehouseId,
          sku: matchedSku,
        };
        if (currentQty !== undefined) m.currentQty = currentQty;
        matched = m;
      } else {
        // b. Try primary match
        matched = await resolveByField(matchRules.primary, record);
        if (matched) matchSource = "primary";

        // c. If no match, try secondary
        if (!matched && matchRules.secondary) {
          matched = await resolveByField(matchRules.secondary, record);
          if (matched) matchSource = "secondary";
        }
      }

      // d. No match at all — apply unknownSkuBehavior
      if (!matched) {
        const behavior = feed.unknownSkuBehavior ?? "ignore";
        const unmatchedReason = `No match for sku=${record.sku ?? "—"}, ean=${record.ean ?? "—"}`;

        logEntry(
          "warn",
          `No match for row ${i}: sku=${record.sku ?? "—"}, ean=${record.ean ?? "—"}`,
          i,
        );

        if (isDryRun) {
          if (previewRows.length < 500) {
            previewRows.push({
              rowIndex: i,
              ...(record.sku !== undefined && { sku: record.sku }),
              ...(record.ean !== undefined && { ean: record.ean }),
              supplierQty: record.qty,
              ...(record.price !== undefined && { supplierPrice: record.price }),
              action: "unmatched",
              unmatchedReason,
            });
          }
          rowsSkipped++;
        } else if (behavior === "flag_for_review") {
          createReviewItem(db, storeAccountId, {
            feedId: feed.id,
            runId,
            ...(record.sku !== undefined && { supplierSku: record.sku }),
            ...(record.ean !== undefined && { supplierEan: record.ean }),
            supplierQty: record.qty,
            ...(record.price !== undefined && { supplierPrice: record.price }),
            ...(record.raw !== undefined && { rawData: record.raw }),
          }).catch((err) => console.error("Failed to create review item:", err));
          rowsFlaggedForReview++;
        } else if (behavior === "create_placeholder") {
          if (record.sku) {
            await createPlaceholderProduct(db, storeAccountId, feed, record);
            rowsCreatedPlaceholder++;
          } else {
            rowsSkipped++;
          }
        } else {
          // ignore
          rowsSkipped++;
        }
        continue;
      }

      // e. CRITICAL safety check: ensure warehouseId matches targetWarehouseId
      if (matched.warehouseId !== feed.targetWarehouseId) {
        logEntry(
          "warn",
          `Safety check failed for row ${i}: resolved warehouseId (${matched.warehouseId}) !== targetWarehouseId (${feed.targetWarehouseId}); skipping`,
          i,
        );
        if (isDryRun) {
          if (previewRows.length < 500) {
            previewRows.push({
              rowIndex: i,
              ...(record.sku !== undefined && { sku: record.sku }),
              ...(record.ean !== undefined && { ean: record.ean }),
              supplierQty: record.qty,
              ...(record.price !== undefined && { supplierPrice: record.price }),
              action: "skipped",
              unmatchedReason: "Warehouse mismatch",
            });
          }
        }
        rowsSkipped++;
        continue;
      }

      // f. Dry-run: collect preview row, do not write
      if (isDryRun) {
        if (previewRows.length < 500) {
          previewRows.push({
            rowIndex: i,
            ...(record.sku !== undefined && { sku: record.sku }),
            ...(record.ean !== undefined && { ean: record.ean }),
            supplierQty: record.qty,
            ...(record.price !== undefined && { supplierPrice: record.price }),
            matchedSku: matched.sku,
            ...(matched.currentQty !== undefined && { currentQty: matched.currentQty }),
            action: "update",
          });
        }
        logEntry("info", `[dry-run] Would update sku=${matched.sku}: qty=${record.qty}`, i);
        rowsUpdated++;
        continue;
      }

      // g/h. Upsert inventoryLevels — only update qtyAvailable, never qtyReserved or qtyIncoming
      await db
        .insert(inventoryLevels)
        .values({
          storeAccountId,
          warehouseId: feed.targetWarehouseId,
          sku: matched.sku,
          qtyAvailable: record.qty,
        })
        .onConflictDoUpdate({
          target: [inventoryLevels.warehouseId, inventoryLevels.sku],
          set: {
            qtyAvailable: record.qty,
            updatedAt: new Date(),
          },
        });

      // i. Log success
      logEntry("info", `Updated sku=${matched.sku}: qty=${record.qty} [via ${matchSource}]`, i);
      rowsUpdated++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logEntry("error", `Error processing row ${i}: ${message}`, i);
      rowsErrored++;
    }
  }

  // 3. Compute final stats
  const stats = {
    rowsTotal: records.length,
    rowsUpdated,
    rowsSkipped: rowsSkipped + rowsFlaggedForReview + rowsCreatedPlaceholder,
    rowsErrored,
  };

  // 4. Mark completed
  await SupplierService.markRunCompleted(db, runId, stats);

  // 5. If dry-run, also persist previewData on the run row
  if (isDryRun) {
    const previewData: PreviewData = {
      totalRows: records.length,
      matchedCount: rowsUpdated,
      unmatchedCount: previewRows.filter((r) => r.action === "unmatched").length,
      skippedCount: rowsSkipped,
      rows: previewRows,
    };
    await db
      .update(supplierFeedRuns)
      .set({ previewData })
      .where(eq(supplierFeedRuns.id, runId));
  }
}

// ── createPlaceholderProduct ──────────────────────────────────────────────────

async function createPlaceholderProduct(
  db: Db,
  storeAccountId: string,
  feed: SupplierFeed,
  record: ParsedRecord,
): Promise<void> {
  const sku = record.sku!;
  const baseSlug = `placeholder-${sku.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  // INSERT product
  const productInsert = {
    storeAccountId,
    name: `[Placeholder] ${sku}`,
    slug: baseSlug,
    sku,
    status: "draft" as const,
    type: "simple" as const,
    priceCents: Math.round((record.price ?? 0) * 100),
    trackInventory: true,
  };

  let productRows: { id: string }[];
  try {
    productRows = await db
      .insert(products)
      .values(productInsert)
      .returning({ id: products.id });
  } catch (err: unknown) {
    // Duplicate slug: retry with timestamp suffix
    const slugWithTs = `${baseSlug}-${Date.now()}`;
    productRows = await db
      .insert(products)
      .values({ ...productInsert, slug: slugWithTs })
      .returning({ id: products.id });
  }

  const productId = productRows[0]?.id;
  if (!productId) return;

  // INSERT inventory level
  await db
    .insert(inventoryLevels)
    .values({
      storeAccountId,
      warehouseId: feed.targetWarehouseId,
      sku,
      qtyAvailable: record.qty,
    })
    .onConflictDoUpdate({
      target: [inventoryLevels.warehouseId, inventoryLevels.sku],
      set: {
        qtyAvailable: record.qty,
        updatedAt: new Date(),
      },
    });
}
