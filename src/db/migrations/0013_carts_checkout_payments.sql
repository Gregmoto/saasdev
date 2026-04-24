-- Migration: 0013_carts_checkout_payments
-- Adds carts, cart_items, shipping_methods, checkout_sessions,
-- payment_providers, payments, and webhook_events tables.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS checkout_status AS ENUM (
  'pending',
  'address',
  'shipping',
  'payment',
  'confirmed',
  'expired',
  'abandoned'
);

CREATE TYPE IF NOT EXISTS payment_provider_type AS ENUM (
  'stripe',
  'paypal',
  'swish',
  'klarna',
  'manual'
);

CREATE TYPE IF NOT EXISTS payment_intent_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

-- ── carts ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  uuid        NOT NULL,
  shop_id           uuid        NOT NULL,
  session_id        varchar(128),
  user_id           uuid,
  currency          varchar(3)  NOT NULL DEFAULT 'SEK',
  coupon_code       varchar(100),
  discount_cents    integer     NOT NULL DEFAULT 0,
  notes             text,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carts_store_account_id_idx
  ON carts (store_account_id);

CREATE INDEX IF NOT EXISTS carts_shop_id_idx
  ON carts (shop_id);

CREATE INDEX IF NOT EXISTS carts_session_id_idx
  ON carts (session_id);

CREATE INDEX IF NOT EXISTS carts_user_id_idx
  ON carts (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS carts_store_shop_session_idx
  ON carts (store_account_id, shop_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_store_shop_user_idx
  ON carts (store_account_id, shop_id, user_id)
  WHERE user_id IS NOT NULL;

-- ── cart_items ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cart_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id           uuid        NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  store_account_id  uuid        NOT NULL,
  product_id        uuid,
  variant_id        uuid,
  sku               varchar(100),
  title             varchar(255) NOT NULL,
  variant_title     varchar(255),
  quantity          integer     NOT NULL DEFAULT 1,
  unit_price_cents  integer     NOT NULL,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx
  ON cart_items (cart_id);

CREATE INDEX IF NOT EXISTS cart_items_store_account_id_idx
  ON cart_items (store_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_cart_variant_idx
  ON cart_items (cart_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- ── shipping_methods ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_methods (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    uuid        NOT NULL,
  shop_id             uuid,
  name                varchar(255) NOT NULL,
  carrier             varchar(100),
  estimated_days      integer,
  price_cents         integer     NOT NULL DEFAULT 0,
  free_above_cents    integer,
  is_active           boolean     NOT NULL DEFAULT true,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_methods_store_account_id_idx
  ON shipping_methods (store_account_id);

CREATE INDEX IF NOT EXISTS shipping_methods_shop_id_idx
  ON shipping_methods (shop_id);

CREATE INDEX IF NOT EXISTS shipping_methods_is_active_idx
  ON shipping_methods (is_active);

-- ── checkout_sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id                          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id            uuid             NOT NULL,
  shop_id                     uuid             NOT NULL,
  cart_id                     uuid             NOT NULL REFERENCES carts (id),
  order_id                    uuid,
  status                      checkout_status  NOT NULL DEFAULT 'pending',
  email                       varchar(255),
  shipping_address            jsonb,
  billing_address             jsonb,
  selected_shipping_method_id uuid,
  shipping_cents              integer          NOT NULL DEFAULT 0,
  subtotal_cents              integer          NOT NULL DEFAULT 0,
  discount_cents              integer          NOT NULL DEFAULT 0,
  tax_cents                   integer          NOT NULL DEFAULT 0,
  total_cents                 integer          NOT NULL DEFAULT 0,
  currency                    varchar(3)       NOT NULL DEFAULT 'SEK',
  reservation_ids             jsonb            NOT NULL DEFAULT '[]'::jsonb,
  expires_at                  timestamptz      NOT NULL,
  confirmed_at                timestamptz,
  abandoned_at                timestamptz,
  metadata                    jsonb,
  created_at                  timestamptz      NOT NULL DEFAULT now(),
  updated_at                  timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_sessions_store_account_id_idx
  ON checkout_sessions (store_account_id);

CREATE INDEX IF NOT EXISTS checkout_sessions_shop_id_idx
  ON checkout_sessions (shop_id);

CREATE INDEX IF NOT EXISTS checkout_sessions_cart_id_idx
  ON checkout_sessions (cart_id);

CREATE INDEX IF NOT EXISTS checkout_sessions_order_id_idx
  ON checkout_sessions (order_id);

CREATE INDEX IF NOT EXISTS checkout_sessions_status_idx
  ON checkout_sessions (status);

CREATE INDEX IF NOT EXISTS checkout_sessions_expires_at_idx
  ON checkout_sessions (expires_at);

-- ── payment_providers ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_providers (
  id                    uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      uuid                   NOT NULL,
  type                  payment_provider_type  NOT NULL,
  name                  varchar(255)           NOT NULL,
  is_active             boolean                NOT NULL DEFAULT true,
  is_test_mode          boolean                NOT NULL DEFAULT false,
  encrypted_config      text                   NOT NULL,
  public_config         jsonb                  NOT NULL DEFAULT '{}'::jsonb,
  supported_currencies  jsonb                  NOT NULL DEFAULT '["SEK"]'::jsonb,
  sort_order            integer                NOT NULL DEFAULT 0,
  created_at            timestamptz            NOT NULL DEFAULT now(),
  updated_at            timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_providers_store_account_id_idx
  ON payment_providers (store_account_id);

CREATE INDEX IF NOT EXISTS payment_providers_type_idx
  ON payment_providers (type);

CREATE INDEX IF NOT EXISTS payment_providers_is_active_idx
  ON payment_providers (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS payment_providers_store_type_idx
  ON payment_providers (store_account_id, type);

-- ── payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id                    uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      uuid                    NOT NULL,
  shop_id               uuid,
  order_id              uuid,
  checkout_session_id   uuid                    REFERENCES checkout_sessions (id),
  provider_id           uuid                    NOT NULL REFERENCES payment_providers (id),
  provider_type         payment_provider_type   NOT NULL,
  external_id           varchar(255)            NOT NULL,
  status                payment_intent_status   NOT NULL DEFAULT 'pending',
  amount_cents          integer                 NOT NULL,
  currency              varchar(3)              NOT NULL DEFAULT 'SEK',
  refunded_cents        integer                 NOT NULL DEFAULT 0,
  idempotency_key       varchar(255)            NOT NULL,
  metadata              jsonb,
  failure_code          varchar(100),
  failure_message       text,
  succeeded_at          timestamptz,
  failed_at             timestamptz,
  created_at            timestamptz             NOT NULL DEFAULT now(),
  updated_at            timestamptz             NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_store_account_id_idx
  ON payments (store_account_id);

CREATE INDEX IF NOT EXISTS payments_order_id_idx
  ON payments (order_id);

CREATE INDEX IF NOT EXISTS payments_checkout_session_id_idx
  ON payments (checkout_session_id);

CREATE INDEX IF NOT EXISTS payments_provider_id_idx
  ON payments (provider_id);

CREATE INDEX IF NOT EXISTS payments_external_id_idx
  ON payments (external_id);

CREATE INDEX IF NOT EXISTS payments_status_idx
  ON payments (status);

CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_idx
  ON payments (idempotency_key);

-- ── webhook_events ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_events (
  id                uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  uuid                   NOT NULL,
  provider_id       uuid                   REFERENCES payment_providers (id),
  provider_type     payment_provider_type  NOT NULL,
  external_event_id varchar(255)           NOT NULL,
  event_type        varchar(100)           NOT NULL,
  payload           jsonb                  NOT NULL,
  processed_at      timestamptz,
  error             text,
  created_at        timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_store_account_id_idx
  ON webhook_events (store_account_id);

CREATE INDEX IF NOT EXISTS webhook_events_provider_id_idx
  ON webhook_events (provider_id);

CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON webhook_events (processed_at);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_idx
  ON webhook_events (provider_type, external_event_id);
