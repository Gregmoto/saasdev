import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const integrationAuthTypeEnum = pgEnum("integration_auth_type", [
  "api_key",   // store provides an API key
  "oauth2",    // OAuth 2.0 authorization code flow
  "webhook",   // platform pushes events to store's URL
  "custom",    // provider-specific (e.g. SMTP credentials)
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "pending",      // configured but not yet verified
  "connected",    // active and working
  "disconnected", // manually disconnected by store admin
  "error",        // last test/sync failed
]);

// ── integration_providers ─────────────────────────────────────────────────────
// Platform-level master catalog.  Only Platform Super Admins can create/edit.
// Defines what integrations are available to Store Accounts.

export const integrationProviders = pgTable(
  "integration_providers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: varchar("slug", { length: 63 }).notNull(),   // e.g. "stripe", "mailchimp"
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    authType: integrationAuthTypeEnum("auth_type").notNull(),

    // JSON Schema that describes which config fields a store must supply.
    // e.g. { "apiKey": { "type": "string", "label": "API Key", "secret": true } }
    configSchema: jsonb("config_schema")
      .$type<Record<string, { type: string; label: string; secret?: boolean; required?: boolean }>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Display order in the integrations marketplace.
    sortOrder: jsonb("sort_order").default(0),
    isActive: jsonb("is_active").default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("integration_providers_slug_idx").on(t.slug),
  }),
);

// ── integration_connections ───────────────────────────────────────────────────
// Store-level connection record.  One row per (store, provider) pair.
// Sensitive config is AES-256-GCM encrypted (same key as TOTP secrets).
// Non-sensitive metadata (last sync stats, webhook endpoint, etc.) lives in
// the plaintext `metadata` jsonb column.

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => integrationProviders.id, { onDelete: "cascade" }),

    status: integrationStatusEnum("status").notNull().default("pending"),

    // AES-256-GCM encrypted JSON string: { apiKey, clientSecret, ... }
    // Format: "iv:authTag:ciphertext" (matching encrypt.ts convention).
    // NULL when store only has webhook (no credentials to store).
    configEncrypted: text("config_encrypted"),

    // Non-sensitive metadata: { webhookUrl, lastOrderCount, ... }
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One connection per (store, provider).
    storeProviderIdx: uniqueIndex("integration_connections_store_provider_idx").on(
      t.storeAccountId,
      t.providerId,
    ),
    storeIdx: index("integration_connections_store_id_idx").on(t.storeAccountId),
    statusIdx: index("integration_connections_status_idx").on(t.status),
  }),
);

export type IntegrationProvider = typeof integrationProviders.$inferSelect;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type IntegrationStatus = (typeof integrationStatusEnum.enumValues)[number];
export type IntegrationAuthType = (typeof integrationAuthTypeEnum.enumValues)[number];
