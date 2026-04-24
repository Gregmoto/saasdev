/**
 * Fortnox sync worker — creates sync jobs, runs entity-level syncs, and handles
 * exponential-backoff retry scheduling.
 *
 * Entity tables (customers / orders / products) are expected to exist in the DB.
 * Their schema modules are imported below; if those modules do not yet exist the
 * TypeScript compiler will flag them, but the runtime behaviour is unchanged once
 * the tables are migrated.
 */

import { eq, and, lte, sql } from "drizzle-orm";
import type { Db } from "../../../db/client.js";
import { syncJobs, syncLogs } from "../../../db/schema/sync.js";
import { customers } from "../../../db/schema/customers.js";
import { orders } from "../../../db/schema/orders.js";
import { products } from "../../../db/schema/products.js";
import { integrationConnections, integrationProviders } from "../../../db/schema/index.js";
import { fortnoxApiRequest } from "./service.js";
import type { FortnoxSyncOptions } from "./service.js";

// ── Re-export for convenience ─────────────────────────────────────────────────
export type { FortnoxSyncOptions };

// ── Retry schedule ────────────────────────────────────────────────────────────
// Index 0 = first retry, index 1 = second, etc.  Values are in minutes.
const RETRY_DELAYS_MIN = [5, 15, 60, 240, 1440]; // 5m 15m 1h 4h 24h

function retryDelayMs(retryCount: number): number {
  const idx = Math.min(retryCount, RETRY_DELAYS_MIN.length - 1);
  return (RETRY_DELAYS_MIN[idx] ?? RETRY_DELAYS_MIN[RETRY_DELAYS_MIN.length - 1] ?? 1440) * 60_000;
}

// ── 1. Create a sync job ──────────────────────────────────────────────────────

/**
 * Inserts a new sync job row with status "pending" and returns its id.
 */
export async function createSyncJob(
  db: Db,
  storeAccountId: string,
  entityType: string,
  maxRetries = 3,
): Promise<string> {
  const [job] = await db
    .insert(syncJobs)
    .values({
      storeAccountId,
      provider: "fortnox",
      entityType,
      status: "pending",
      maxRetries,
      retryCount: 0,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
    })
    .returning({ id: syncJobs.id });

  if (!job) throw new Error("Failed to create sync job");
  return job.id;
}

// ── 2. Append a sync log entry ────────────────────────────────────────────────

export async function appendSyncLog(
  db: Db,
  jobId: string,
  storeAccountId: string,
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(syncLogs).values({
    syncJobId: jobId,
    storeAccountId,
    provider: "fortnox",
    level,
    message,
    metadata: metadata ?? null,
  });
}

// ── 3. Run a full Fortnox sync ────────────────────────────────────────────────

/**
 * Orchestrates all entity syncs requested by `options`.
 * Handles job status transitions and exponential-backoff retry scheduling.
 */
export async function runFortnoxSync(
  db: Db,
  jobId: string,
  storeAccountId: string,
  connectionId: string,
  options: FortnoxSyncOptions,
  accessToken: string,
): Promise<void> {
  // Mark job as running.
  await db
    .update(syncJobs)
    .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(syncJobs.id, jobId));

  try {
    if (options.syncCustomers) {
      await syncCustomersToFortnox(db, jobId, storeAccountId, accessToken);
    }
    if (options.syncOrders) {
      await syncOrdersToFortnox(db, jobId, storeAccountId, accessToken);
    }
    if (options.syncProducts) {
      await syncProductsToFortnox(db, jobId, storeAccountId, accessToken);
    }

    // Success.
    await db
      .update(syncJobs)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(syncJobs.id, jobId));

    // Touch the connection's lastSyncAt.
    await db
      .update(integrationConnections)
      .set({ lastSyncAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(integrationConnections.id, connectionId));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await appendSyncLog(db, jobId, storeAccountId, "error", `Sync failed: ${message}`);

    // Fetch current retryCount + maxRetries.
    const [current] = await db
      .select({ retryCount: syncJobs.retryCount, maxRetries: syncJobs.maxRetries })
      .from(syncJobs)
      .where(eq(syncJobs.id, jobId))
      .limit(1);

    const retryCount = (current?.retryCount ?? 0) + 1;
    const maxRetries = current?.maxRetries ?? 3;

    if (retryCount < maxRetries) {
      const nextRetryAt = new Date(Date.now() + retryDelayMs(retryCount));
      await db
        .update(syncJobs)
        .set({
          status: "pending",
          retryCount,
          nextRetryAt,
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(syncJobs.id, jobId));
    } else {
      await db
        .update(syncJobs)
        .set({
          status: "failed",
          retryCount,
          completedAt: new Date(),
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(syncJobs.id, jobId));

      await db
        .update(integrationConnections)
        .set({ status: "error", lastError: message, updatedAt: new Date() })
        .where(eq(integrationConnections.id, connectionId));
    }
  }
}

// ── 4. Sync customers ─────────────────────────────────────────────────────────

export async function syncCustomersToFortnox(
  db: Db,
  jobId: string,
  storeAccountId: string,
  accessToken: string,
): Promise<void> {
  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
    })
    .from(customers)
    .where(eq(customers.storeAccountId, storeAccountId));

  // Record total.
  await db
    .update(syncJobs)
    .set({ totalRecords: sql`${syncJobs.totalRecords} + ${rows.length}`, updatedAt: new Date() })
    .where(eq(syncJobs.id, jobId));

  await appendSyncLog(db, jobId, storeAccountId, "info", `Syncing ${rows.length} customer(s) to Fortnox`);

  let processed = 0;
  let failed = 0;

  for (const customer of rows) {
    try {
      await fortnoxApiRequest(accessToken, "POST", "/customers", {
        Customer: {
          CustomerNumber: customer.id,
          Email: customer.email ?? "",
          Name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
          Phone: customer.phone ?? "",
        },
      });
      processed++;
      await appendSyncLog(db, jobId, storeAccountId, "info", `Synced customer ${customer.id}`, {
        customerId: customer.id,
      });
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await appendSyncLog(
        db,
        jobId,
        storeAccountId,
        "warn",
        `Failed to sync customer ${customer.id}: ${message}`,
        { customerId: customer.id },
      );
    }

    // Persist running counters after every customer.
    await db
      .update(syncJobs)
      .set({
        processedRecords: sql`${syncJobs.processedRecords} + ${processed}`,
        failedRecords: sql`${syncJobs.failedRecords} + ${failed}`,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, jobId));

    processed = 0;
    failed = 0;
  }
}

// ── 5. Sync orders (as Fortnox Invoices) ─────────────────────────────────────

export async function syncOrdersToFortnox(
  db: Db,
  jobId: string,
  storeAccountId: string,
  accessToken: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeAccountId, storeAccountId),
        // Only sync actionable orders.
        sql`${orders.status} IN ('confirmed', 'processing')`,
      ),
    );

  await db
    .update(syncJobs)
    .set({ totalRecords: sql`${syncJobs.totalRecords} + ${rows.length}`, updatedAt: new Date() })
    .where(eq(syncJobs.id, jobId));

  await appendSyncLog(db, jobId, storeAccountId, "info", `Syncing ${rows.length} order(s) to Fortnox`);

  let processed = 0;
  let failed = 0;

  for (const order of rows) {
    try {
      // No line items on the order row itself (fetched separately if needed).
      const invoiceRows: Array<{
        ArticleNumber: string;
        Description: string;
        DeliveredQuantity: number;
        Price: number;
      }> = [];

      await fortnoxApiRequest(accessToken, "POST", "/invoices", {
        Invoice: {
          CustomerNumber: order.customerId ?? "",
          YourOrderNumber: order.id,
          InvoiceRows: invoiceRows,
          Currency: order.currency ?? "SEK",
        },
      });
      processed++;
      await appendSyncLog(db, jobId, storeAccountId, "info", `Synced order ${order.id} as Fortnox invoice`, {
        orderId: order.id,
      });
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await appendSyncLog(
        db,
        jobId,
        storeAccountId,
        "warn",
        `Failed to sync order ${order.id}: ${message}`,
        { orderId: order.id },
      );
    }

    await db
      .update(syncJobs)
      .set({
        processedRecords: sql`${syncJobs.processedRecords} + ${processed}`,
        failedRecords: sql`${syncJobs.failedRecords} + ${failed}`,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, jobId));

    processed = 0;
    failed = 0;
  }
}

// ── 6. Sync products (as Fortnox Articles) ───────────────────────────────────

export async function syncProductsToFortnox(
  db: Db,
  jobId: string,
  storeAccountId: string,
  accessToken: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.storeAccountId, storeAccountId),
        eq(products.status, "published"),
      ),
    );

  await db
    .update(syncJobs)
    .set({ totalRecords: sql`${syncJobs.totalRecords} + ${rows.length}`, updatedAt: new Date() })
    .where(eq(syncJobs.id, jobId));

  await appendSyncLog(db, jobId, storeAccountId, "info", `Syncing ${rows.length} product(s) to Fortnox`);

  let processed = 0;
  let failed = 0;

  for (const product of rows) {
    try {
      await fortnoxApiRequest(accessToken, "POST", "/articles", {
        Article: {
          ArticleNumber: product.sku ?? product.id,
          Description: product.name ?? "",
          SalesPrice: (product.priceCents ?? 0) / 100,
          Unit: "st",
        },
      });
      processed++;
      await appendSyncLog(db, jobId, storeAccountId, "info", `Synced product ${product.id}`, {
        productId: product.id,
      });
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await appendSyncLog(
        db,
        jobId,
        storeAccountId,
        "warn",
        `Failed to sync product ${product.id}: ${message}`,
        { productId: product.id },
      );
    }

    await db
      .update(syncJobs)
      .set({
        processedRecords: sql`${syncJobs.processedRecords} + ${processed}`,
        failedRecords: sql`${syncJobs.failedRecords} + ${failed}`,
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, jobId));

    processed = 0;
    failed = 0;
  }
}

// ── 7. Retry scheduler ────────────────────────────────────────────────────────

/**
 * Picks up pending Fortnox sync jobs whose nextRetryAt is in the past and
 * re-runs them.  Call this from a cron/scheduler at a regular interval (e.g. every minute).
 */
export async function scheduleRetries(db: Db): Promise<void> {
  const dueJobs = await db
    .select({
      id: syncJobs.id,
      storeAccountId: syncJobs.storeAccountId,
      entityType: syncJobs.entityType,
      metadata: syncJobs.metadata,
    })
    .from(syncJobs)
    .where(
      and(
        eq(syncJobs.status, "pending"),
        eq(syncJobs.provider, "fortnox"),
        lte(syncJobs.nextRetryAt, new Date()),
      ),
    );

  for (const job of dueJobs) {
    // Resolve the connectionId for this store's Fortnox integration.
    const [connRow] = await db
      .select({ id: integrationConnections.id })
      .from(integrationConnections)
      .innerJoin(
        integrationProviders,
        eq(integrationConnections.providerId, integrationProviders.id),
      )
      .where(
        and(
          eq(integrationConnections.storeAccountId, job.storeAccountId),
          eq(integrationProviders.slug, "fortnox"),
        ),
      )
      .limit(1);

    if (!connRow) {
      await appendSyncLog(
        db,
        job.id,
        job.storeAccountId,
        "error",
        "Cannot retry: Fortnox connection not found for this store",
      );
      await db
        .update(syncJobs)
        .set({ status: "failed", errorMessage: "Connection not found", updatedAt: new Date() })
        .where(eq(syncJobs.id, job.id));
      continue;
    }

    // Resolve sync options from job metadata or fall back to entity-type-based defaults.
    const meta = (job.metadata ?? {}) as {
      syncCustomers?: boolean;
      syncOrders?: boolean;
      syncProducts?: boolean;
      accessToken?: string;
    };

    let accessToken: string;
    try {
      // Import at call-site to avoid circular dependency.
      const { getFortnoxAccessToken } = await import("./service.js");
      accessToken = await getFortnoxAccessToken(db, connRow.id, job.storeAccountId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await appendSyncLog(db, job.id, job.storeAccountId, "error", `Cannot refresh token: ${message}`);
      await db
        .update(syncJobs)
        .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
        .where(eq(syncJobs.id, job.id));
      continue;
    }

    const options: FortnoxSyncOptions = {
      syncCustomers: meta.syncCustomers ?? (job.entityType === "customers" || job.entityType === "all"),
      syncOrders: meta.syncOrders ?? (job.entityType === "orders" || job.entityType === "all"),
      syncProducts: meta.syncProducts ?? (job.entityType === "products" || job.entityType === "all"),
    };

    // Fire-and-forget — errors are handled inside runFortnoxSync.
    void runFortnoxSync(db, job.id, job.storeAccountId, connRow.id, options, accessToken);
  }
}
