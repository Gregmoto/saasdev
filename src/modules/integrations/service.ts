import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { integrationProviders, integrationConnections } from "../../db/schema/index.js";
import type { IntegrationAuthType } from "../../db/schema/integrations.js";
import { encrypt, decrypt } from "../../lib/encrypt.js";

// ── Provider catalog (Platform-level) ─────────────────────────────────────────

export async function listProviders(db: Db, includeInactive = false) {
  const rows = await db
    .select()
    .from(integrationProviders)
    .orderBy(integrationProviders.sortOrder);

  if (includeInactive) return rows;
  return rows.filter((r) => r.isActive);
}

export async function getProviderBySlug(db: Db, slug: string) {
  const [row] = await db
    .select()
    .from(integrationProviders)
    .where(eq(integrationProviders.slug, slug))
    .limit(1);
  return row ?? null;
}

export interface CreateProviderOpts {
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  authType: IntegrationAuthType;
  configSchema: Record<string, { type: string; label: string; secret?: boolean; required?: boolean }>;
  sortOrder?: number;
}

export async function createProvider(db: Db, opts: CreateProviderOpts) {
  const [provider] = await db
    .insert(integrationProviders)
    .values({
      slug: opts.slug,
      name: opts.name,
      description: opts.description ?? null,
      logoUrl: opts.logoUrl ?? null,
      authType: opts.authType,
      configSchema: opts.configSchema,
      sortOrder: opts.sortOrder ?? 0,
      isActive: true,
    })
    .returning();
  if (!provider) throw new Error("Failed to create integration provider");
  return provider;
}

export interface UpdateProviderOpts {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  configSchema?: Record<string, { type: string; label: string; secret?: boolean; required?: boolean }>;
  sortOrder?: number;
  isActive?: boolean;
}

export async function updateProvider(db: Db, providerId: string, opts: UpdateProviderOpts) {
  const [updated] = await db
    .update(integrationProviders)
    .set({ ...opts, updatedAt: new Date() })
    .where(eq(integrationProviders.id, providerId))
    .returning();
  if (!updated) throw Object.assign(new Error("Provider not found"), { statusCode: 404 });
  return updated;
}

// ── Store Account connections ──────────────────────────────────────────────────

/**
 * Lists all available providers with the store's connection status overlaid.
 * Config secrets are never returned — only status + metadata.
 */
export async function listConnectionsForStore(db: Db, storeAccountId: string) {
  // Fetch all active providers.
  const providers = await db
    .select()
    .from(integrationProviders)
    .where(eq(integrationProviders.isActive as unknown as typeof integrationProviders.isActive, true))
    .orderBy(integrationProviders.sortOrder);

  // Fetch this store's connections.
  const connections = await db
    .select({
      id: integrationConnections.id,
      providerId: integrationConnections.providerId,
      status: integrationConnections.status,
      metadata: integrationConnections.metadata,
      lastSyncAt: integrationConnections.lastSyncAt,
      lastError: integrationConnections.lastError,
      createdAt: integrationConnections.createdAt,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.storeAccountId, storeAccountId));

  const connectionMap = new Map(connections.map((c) => [c.providerId, c]));

  return providers.map((p) => ({
    provider: p,
    connection: connectionMap.get(p.id) ?? null,
  }));
}

export async function getConnection(db: Db, connectionId: string, storeAccountId: string) {
  const [row] = await db
    .select({
      id: integrationConnections.id,
      storeAccountId: integrationConnections.storeAccountId,
      providerId: integrationConnections.providerId,
      status: integrationConnections.status,
      metadata: integrationConnections.metadata,
      lastSyncAt: integrationConnections.lastSyncAt,
      lastError: integrationConnections.lastError,
      createdAt: integrationConnections.createdAt,
      updatedAt: integrationConnections.updatedAt,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Connect (or reconnect) an integration for a store.
 * The config object (containing credentials) is AES-256-GCM encrypted before storage.
 * Returns the connection without the encrypted config.
 */
export async function connectIntegration(
  db: Db,
  storeAccountId: string,
  providerId: string,
  config: Record<string, string>,
  metadata?: Record<string, unknown>,
): Promise<{ id: string; status: string }> {
  const configEncrypted = Object.keys(config).length > 0
    ? encrypt(JSON.stringify(config))
    : null;

  const [connection] = await db
    .insert(integrationConnections)
    .values({
      storeAccountId,
      providerId,
      status: "connected",
      configEncrypted,
      metadata: metadata ?? null,
    })
    .onConflictDoUpdate({
      target: [integrationConnections.storeAccountId, integrationConnections.providerId],
      set: {
        status: "connected",
        configEncrypted: configEncrypted ?? null,
        metadata: (metadata ?? null) as Record<string, unknown> | null,
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: integrationConnections.id, status: integrationConnections.status });

  if (!connection) throw new Error("Failed to create integration connection");
  return connection;
}

/**
 * Disconnect an integration — sets status to "disconnected" and clears credentials.
 */
export async function disconnectIntegration(
  db: Db,
  connectionId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .update(integrationConnections)
    .set({
      status: "disconnected",
      configEncrypted: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.storeAccountId, storeAccountId),
      ),
    )
    .returning({ id: integrationConnections.id });

  return rows.length > 0;
}

/**
 * Test a connection by decrypting its config and returning metadata.
 * Actual provider-specific test logic is outside scope — this validates that
 * the credentials are stored and decryptable.
 *
 * Extend with a provider-specific test function map for real connectivity tests.
 */
export async function testConnection(
  db: Db,
  connectionId: string,
  storeAccountId: string,
): Promise<{ ok: boolean; message: string }> {
  const [row] = await db
    .select({
      id: integrationConnections.id,
      status: integrationConnections.status,
      configEncrypted: integrationConnections.configEncrypted,
    })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!row) throw Object.assign(new Error("Connection not found"), { statusCode: 404 });
  if (row.status === "disconnected") {
    return { ok: false, message: "This integration is currently disconnected." };
  }

  try {
    if (row.configEncrypted) {
      // Attempt decryption to validate key integrity.
      JSON.parse(decrypt(row.configEncrypted));
    }

    // Mark last sync.
    await db
      .update(integrationConnections)
      .set({ status: "connected", lastError: null, lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(integrationConnections.id, connectionId));

    return { ok: true, message: "Connection credentials are valid and accessible." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(integrationConnections)
      .set({ status: "error", lastError: msg, updatedAt: new Date() })
      .where(eq(integrationConnections.id, connectionId));

    return { ok: false, message: "Could not verify the connection. Please check your credentials." };
  }
}

/**
 * Retrieve decrypted config for server-side use (never send to client).
 * Call only from internal server code — not from route handlers.
 */
export async function getDecryptedConfig(
  db: Db,
  connectionId: string,
  storeAccountId: string,
): Promise<Record<string, string> | null> {
  const [row] = await db
    .select({ configEncrypted: integrationConnections.configEncrypted })
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.id, connectionId),
        eq(integrationConnections.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!row?.configEncrypted) return null;
  return JSON.parse(decrypt(row.configEncrypted)) as Record<string, string>;
}
