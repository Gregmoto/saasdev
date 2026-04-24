/**
 * Fortnox integration — OAuth2 token management and API client.
 *
 * Environment variables required:
 *   FORTNOX_CLIENT_ID      — OAuth2 client_id
 *   FORTNOX_CLIENT_SECRET  — OAuth2 client_secret
 *   FORTNOX_REDIRECT_URI   — OAuth2 redirect_uri (must match Fortnox app settings)
 */

import { eq, and } from "drizzle-orm";
import type { Db } from "../../../db/client.js";
import { integrationConnections, integrationProviders } from "../../../db/schema/index.js";
import { encrypt, decrypt } from "../../../lib/encrypt.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const FORTNOX_AUTH_URL = "https://apps.fortnox.se/oauth-v1/auth";
const FORTNOX_TOKEN_URL = "https://apps.fortnox.se/oauth-v1/token";
const FORTNOX_API_BASE = "https://api.fortnox.se/3";
const FORTNOX_SCOPES = "companyinformation customer invoice article";

/** Refresh a token this many milliseconds before it officially expires. */
const REFRESH_BUFFER_MS = 5 * 60 * 1_000; // 5 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// ── Public interface ──────────────────────────────────────────────────────────

/** Sync options controlling which entity types are included in a sync run. */
export interface FortnoxSyncOptions {
  syncCustomers: boolean;
  syncOrders: boolean;
  syncProducts: boolean;
}

/** Shape stored encrypted inside integrationConnections.configEncrypted */
interface FortnoxTokenConfig {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

// ── 1. Build the OAuth authorization URL ─────────────────────────────────────

/**
 * Returns the Fortnox OAuth2 authorization URL.
 * The caller must redirect the user to this URL to start the OAuth flow.
 *
 * @param storeAccountId - used to build a namespaced state value (further randomness is the caller's responsibility)
 * @param state          - random CSRF token to round-trip through Fortnox
 */
export function getFortnoxAuthUrl(storeAccountId: string, state: string): string {
  const clientId = getEnvOrThrow("FORTNOX_CLIENT_ID");
  const redirectUri = getEnvOrThrow("FORTNOX_REDIRECT_URI");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: FORTNOX_SCOPES,
    state: `${storeAccountId}:${state}`,
    response_type: "code",
    access_type: "offline",
  });

  return `${FORTNOX_AUTH_URL}?${params.toString()}`;
}

// ── 2. Exchange authorization code for tokens ─────────────────────────────────

/**
 * POSTs the authorization code to Fortnox, stores the resulting tokens
 * encrypted in the integration_connections row for the given store/provider pair,
 * and returns the raw token values.
 */
export async function exchangeFortnoxCode(
  db: Db,
  storeAccountId: string,
  providerId: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const clientId = getEnvOrThrow("FORTNOX_CLIENT_ID");
  const clientSecret = getEnvOrThrow("FORTNOX_CLIENT_SECRET");
  const redirectUri = getEnvOrThrow("FORTNOX_REDIRECT_URI");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw Object.assign(
      new Error(`Fortnox token exchange failed (${response.status}): ${text}`),
      { statusCode: 502 },
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresAtMs = Date.now() + data.expires_in * 1_000;
  const expiresAt = new Date(expiresAtMs);

  const tokenConfig: FortnoxTokenConfig = { accessToken, refreshToken, expiresAtMs };
  const configEncrypted = encrypt(JSON.stringify(tokenConfig));

  // Upsert the connection row.
  await db
    .insert(integrationConnections)
    .values({
      storeAccountId,
      providerId,
      status: "connected",
      configEncrypted,
      metadata: null,
    })
    .onConflictDoUpdate({
      target: [integrationConnections.storeAccountId, integrationConnections.providerId],
      set: {
        status: "connected",
        configEncrypted,
        lastError: null,
        updatedAt: new Date(),
      },
    });

  return { accessToken, refreshToken, expiresAt };
}

// ── 3. Refresh an expired / near-expiry token ─────────────────────────────────

/**
 * Uses the stored refresh_token to obtain new credentials from Fortnox,
 * persists them encrypted, and returns the new access token.
 */
export async function refreshFortnoxToken(
  db: Db,
  connectionId: string,
  storeAccountId: string,
): Promise<string> {
  const clientId = getEnvOrThrow("FORTNOX_CLIENT_ID");
  const clientSecret = getEnvOrThrow("FORTNOX_CLIENT_SECRET");

  // Load existing config.
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

  if (!row?.configEncrypted) {
    throw Object.assign(new Error("Fortnox connection not found or has no stored tokens"), {
      statusCode: 404,
    });
  }

  const current = JSON.parse(decrypt(row.configEncrypted)) as FortnoxTokenConfig;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(FORTNOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");

    // Mark the connection as errored so the admin can re-authenticate.
    await db
      .update(integrationConnections)
      .set({ status: "error", lastError: `Token refresh failed: ${text}`, updatedAt: new Date() })
      .where(eq(integrationConnections.id, connectionId));

    throw Object.assign(
      new Error(`Fortnox token refresh failed (${response.status}): ${text}`),
      { statusCode: 502 },
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const newConfig: FortnoxTokenConfig = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAtMs: Date.now() + data.expires_in * 1_000,
  };

  await db
    .update(integrationConnections)
    .set({
      configEncrypted: encrypt(JSON.stringify(newConfig)),
      status: "connected",
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, connectionId));

  return newConfig.accessToken;
}

// ── 4. Get a valid access token (refreshes automatically) ─────────────────────

/**
 * Returns a valid Fortnox access token for the given connection.
 * If the stored token will expire within REFRESH_BUFFER_MS, it is refreshed first.
 */
export async function getFortnoxAccessToken(
  db: Db,
  connectionId: string,
  storeAccountId: string,
): Promise<string> {
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

  if (!row?.configEncrypted) {
    throw Object.assign(new Error("Fortnox connection not found or not authenticated"), {
      statusCode: 404,
    });
  }

  const config = JSON.parse(decrypt(row.configEncrypted)) as FortnoxTokenConfig;

  const needsRefresh = Date.now() >= config.expiresAtMs - REFRESH_BUFFER_MS;
  if (needsRefresh) {
    return refreshFortnoxToken(db, connectionId, storeAccountId);
  }

  return config.accessToken;
}

// ── 5. Authenticated Fortnox API request ──────────────────────────────────────

/**
 * Makes an authenticated HTTP request to the Fortnox REST API.
 * Throws with statusCode 502 on any non-2xx response from Fortnox.
 *
 * @param accessToken - valid Fortnox access token (obtain via getFortnoxAccessToken)
 * @param method      - HTTP method ("GET" | "POST" | "PUT" | "DELETE")
 * @param path        - API path relative to the API base, e.g. "/customers" or "/invoices"
 * @param body        - optional request body (will be JSON-serialized)
 */
export async function fortnoxApiRequest<T>(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${FORTNOX_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = (await response.json()) as { ErrorInformation?: { message?: string } };
      detail = errBody.ErrorInformation?.message ?? "";
    } catch {
      detail = await response.text().catch(() => "");
    }

    throw Object.assign(
      new Error(
        `Fortnox API error ${response.status} ${method} ${path}${detail ? `: ${detail}` : ""}`,
      ),
      { statusCode: 502 },
    );
  }

  return response.json() as Promise<T>;
}

// ── Internal helper: look up a connection by storeAccountId + provider slug ───

/**
 * Resolves the integration_connections row for a given store + "fortnox" slug.
 * Throws 404 if not found.
 */
export async function getFortnoxConnection(
  db: Db,
  storeAccountId: string,
): Promise<{ id: string; status: string; metadata: Record<string, unknown> | null }> {
  const [row] = await db
    .select({
      id: integrationConnections.id,
      status: integrationConnections.status,
      metadata: integrationConnections.metadata,
    })
    .from(integrationConnections)
    .innerJoin(integrationProviders, eq(integrationConnections.providerId, integrationProviders.id))
    .where(
      and(
        eq(integrationConnections.storeAccountId, storeAccountId),
        eq(integrationProviders.slug, "fortnox"),
      ),
    )
    .limit(1);

  if (!row) {
    throw Object.assign(new Error("Fortnox integration is not connected for this store"), {
      statusCode: 404,
    });
  }

  return row;
}
