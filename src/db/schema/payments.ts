import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { checkoutSessions } from "./carts.js";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const paymentProviderTypeEnum = pgEnum("payment_provider_type", [
  "stripe",
  "paypal",
  "swish",
  "klarna",
  "manual",
]);

// Provider-level payment intent status (distinct from order-level paymentStatusEnum in orders.ts).
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
]);

// ── payment_providers ─────────────────────────────────────────────────────────

export const paymentProviders = pgTable(
  "payment_providers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    type: paymentProviderTypeEnum("type").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isTestMode: boolean("is_test_mode").notNull().default(false),
    // AES-256-GCM encrypted JSON: { secretKey, webhookSecret, ... }
    encryptedConfig: text("encrypted_config").notNull(),
    // Safe-to-expose config (e.g. publishable key, merchant ID).
    publicConfig: jsonb("public_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    // Which currencies this provider can process.
    supportedCurrencies: jsonb("supported_currencies")
      .$type<string[]>()
      .notNull()
      .default(sql`'["SEK"]'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("payment_providers_store_account_id_idx").on(t.storeAccountId),
    typeIdx: index("payment_providers_type_idx").on(t.type),
    isActiveIdx: index("payment_providers_is_active_idx").on(t.isActive),
    // Only one configured provider per type per store.
    storeTypeUniq: uniqueIndex("payment_providers_store_type_idx").on(t.storeAccountId, t.type),
  }),
);

// ── payments ──────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    // Nullable: shop may not be known at payment creation time.
    shopId: uuid("shop_id"),
    // Nullable: order may not exist yet during checkout.
    orderId: uuid("order_id"),
    checkoutSessionId: uuid("checkout_session_id").references(
      () => checkoutSessions.id,
    ),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => paymentProviders.id),
    // Denormalised for fast filtering without joining payment_providers.
    providerType: paymentProviderTypeEnum("provider_type").notNull(),
    // Provider's own identifier (e.g. Stripe PaymentIntent ID).
    externalId: varchar("external_id", { length: 255 }).notNull(),
    status: paymentIntentStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SEK"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    // Client-generated key to prevent duplicate charges on retry.
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    failureCode: varchar("failure_code", { length: 100 }),
    failureMessage: text("failure_message"),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("payments_store_account_id_idx").on(t.storeAccountId),
    orderIdx: index("payments_order_id_idx").on(t.orderId),
    checkoutSessionIdx: index("payments_checkout_session_id_idx").on(t.checkoutSessionId),
    providerIdx: index("payments_provider_id_idx").on(t.providerId),
    externalIdIdx: index("payments_external_id_idx").on(t.externalId),
    statusIdx: index("payments_status_idx").on(t.status),
    idempotencyKeyUniq: uniqueIndex("payments_idempotency_key_idx").on(t.idempotencyKey),
  }),
);

// ── webhook_events ────────────────────────────────────────────────────────────

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    providerId: uuid("provider_id").references(() => paymentProviders.id),
    providerType: paymentProviderTypeEnum("provider_type").notNull(),
    // Provider's own event ID (used for deduplication).
    externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
    // E.g. "payment_intent.succeeded", "charge.refunded".
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    // Null = not yet processed; set when processing completes.
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeAccountIdx: index("webhook_events_store_account_id_idx").on(t.storeAccountId),
    providerIdx: index("webhook_events_provider_id_idx").on(t.providerId),
    processedAtIdx: index("webhook_events_processed_at_idx").on(t.processedAt),
    // Deduplicate incoming events by (provider type, external event ID).
    providerEventUniq: uniqueIndex("webhook_events_provider_event_idx").on(
      t.providerType,
      t.externalEventId,
    ),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type PaymentProviderType = (typeof paymentProviderTypeEnum.enumValues)[number];
export type PaymentIntentStatus = (typeof paymentIntentStatusEnum.enumValues)[number];
