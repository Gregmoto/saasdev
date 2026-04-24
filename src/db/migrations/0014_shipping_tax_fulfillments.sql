-- Migration: 0014_shipping_tax_fulfillments
-- Adds shipping zones/profiles/methods, tax rates/config, fulfillment tracking.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS shipping_method_type AS ENUM (
  'standard', 'express', 'overnight', 'click_collect', 'free'
);

CREATE TYPE IF NOT EXISTS shipping_rate_type AS ENUM (
  'flat', 'weight_based', 'price_based'
);

CREATE TYPE IF NOT EXISTS tax_category AS ENUM (
  'standard', 'reduced', 'super_reduced', 'zero', 'exempt'
);

CREATE TYPE IF NOT EXISTS fulfillment_item_status AS ENUM (
  'pending', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'
);

-- ── shipping_zones ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_zones (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  is_default        BOOLEAN     NOT NULL DEFAULT false,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_zones_store_account_id_idx ON shipping_zones(store_account_id);
CREATE INDEX IF NOT EXISTS shipping_zones_is_default_idx ON shipping_zones(is_default);

-- ── shipping_zone_countries ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_zone_countries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID        NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  country_code  VARCHAR(2)  NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS shipping_zone_countries_zone_country_idx
  ON shipping_zone_countries(zone_id, country_code);
CREATE INDEX IF NOT EXISTS shipping_zone_countries_zone_id_idx ON shipping_zone_countries(zone_id);
CREATE INDEX IF NOT EXISTS shipping_zone_countries_country_code_idx ON shipping_zone_countries(country_code);

-- ── shipping_profiles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  is_default        BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_profiles_store_account_id_idx ON shipping_profiles(store_account_id);
CREATE INDEX IF NOT EXISTS shipping_profiles_is_default_idx ON shipping_profiles(is_default);

-- ── shipping_profile_zones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_profile_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES shipping_profiles(id) ON DELETE CASCADE,
  zone_id     UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS shipping_profile_zones_profile_zone_idx
  ON shipping_profile_zones(profile_id, zone_id);

-- ── shipping_zone_methods ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_zone_methods (
  id                  UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID                  NOT NULL,
  profile_id          UUID                  NOT NULL REFERENCES shipping_profiles(id) ON DELETE CASCADE,
  zone_id             UUID                  NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name                VARCHAR(255)          NOT NULL,
  type                shipping_method_type  NOT NULL DEFAULT 'standard',
  carrier             VARCHAR(100),
  estimated_days_min  INTEGER,
  estimated_days_max  INTEGER,
  rate_type           shipping_rate_type    NOT NULL DEFAULT 'flat',
  flat_price_cents    INTEGER               NOT NULL DEFAULT 0,
  free_above_cents    INTEGER,
  max_weight_grams    INTEGER,
  is_active           BOOLEAN               NOT NULL DEFAULT true,
  requires_address    BOOLEAN               NOT NULL DEFAULT true,
  pickup_location_id  UUID,
  metadata            JSONB,
  sort_order          INTEGER               NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_zone_methods_store_account_id_idx ON shipping_zone_methods(store_account_id);
CREATE INDEX IF NOT EXISTS shipping_zone_methods_profile_id_idx ON shipping_zone_methods(profile_id);
CREATE INDEX IF NOT EXISTS shipping_zone_methods_zone_id_idx ON shipping_zone_methods(zone_id);
CREATE INDEX IF NOT EXISTS shipping_zone_methods_type_idx ON shipping_zone_methods(type);
CREATE INDEX IF NOT EXISTS shipping_zone_methods_is_active_idx ON shipping_zone_methods(is_active);

-- ── shipping_rates ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_rates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id         UUID        NOT NULL REFERENCES shipping_zone_methods(id) ON DELETE CASCADE,
  store_account_id  UUID        NOT NULL,
  min_weight_grams  INTEGER,
  max_weight_grams  INTEGER,
  min_cart_cents    INTEGER,
  max_cart_cents    INTEGER,
  price_cents       INTEGER     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipping_rates_method_id_idx ON shipping_rates(method_id);
CREATE INDEX IF NOT EXISTS shipping_rates_store_account_id_idx ON shipping_rates(store_account_id);

-- ── shop_shipping_profiles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shop_shipping_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL,
  shop_id           UUID        NOT NULL,
  profile_id        UUID        NOT NULL REFERENCES shipping_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_shipping_profiles_store_shop_idx
  ON shop_shipping_profiles(store_account_id, shop_id);

-- ── click_collect_locations ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS click_collect_locations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL,
  shop_id           UUID,
  name              VARCHAR(255) NOT NULL,
  address           JSONB       NOT NULL,
  opening_hours     JSONB,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS click_collect_locations_store_account_id_idx ON click_collect_locations(store_account_id);
CREATE INDEX IF NOT EXISTS click_collect_locations_shop_id_idx ON click_collect_locations(shop_id);
CREATE INDEX IF NOT EXISTS click_collect_locations_is_active_idx ON click_collect_locations(is_active);

-- ── tax_rates ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tax_rates (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  VARCHAR(2)    NOT NULL,
  category      tax_category  NOT NULL DEFAULT 'standard',
  rate_percent  NUMERIC(5,2)  NOT NULL,
  name          VARCHAR(100)  NOT NULL,
  valid_from    TIMESTAMPTZ,
  valid_to      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tax_rates_country_code_idx ON tax_rates(country_code);
CREATE INDEX IF NOT EXISTS tax_rates_category_idx ON tax_rates(category);
CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_active_country_category_idx
  ON tax_rates(country_code, category)
  WHERE valid_to IS NULL;

-- ── store_tax_configs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_tax_configs (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID          NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  default_country_code    VARCHAR(2)    NOT NULL DEFAULT 'SE',
  prices_include_tax      BOOLEAN       NOT NULL DEFAULT true,
  default_tax_category    tax_category  NOT NULL DEFAULT 'standard',
  b2b_tax_exempt_by_default BOOLEAN     NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_tax_configs_store_account_id_idx
  ON store_tax_configs(store_account_id);

-- ── product_tax_categories ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_tax_categories (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID          NOT NULL,
  product_id        UUID          NOT NULL,
  tax_category      tax_category  NOT NULL DEFAULT 'standard'
);

CREATE UNIQUE INDEX IF NOT EXISTS product_tax_categories_store_product_idx
  ON product_tax_categories(store_account_id, product_id);

-- ── order_fulfillments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_fulfillments (
  id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID                    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_account_id      UUID                    NOT NULL,
  shop_id               UUID,
  status                fulfillment_item_status NOT NULL DEFAULT 'pending',
  tracking_number       VARCHAR(255),
  tracking_carrier      VARCHAR(100),
  tracking_url          VARCHAR(500),
  shipping_method_name  VARCHAR(255),
  estimated_delivery_at TIMESTAMPTZ,
  shipped_at            TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  notes                 TEXT,
  metadata              JSONB,
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_fulfillments_order_id_idx ON order_fulfillments(order_id);
CREATE INDEX IF NOT EXISTS order_fulfillments_store_account_id_idx ON order_fulfillments(store_account_id);
CREATE INDEX IF NOT EXISTS order_fulfillments_status_idx ON order_fulfillments(status);

-- ── fulfillment_items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fulfillment_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id    UUID        NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
  order_item_id     UUID        NOT NULL REFERENCES order_items(id),
  store_account_id  UUID        NOT NULL,
  sku               VARCHAR(100),
  quantity          INTEGER     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_items_fulfillment_id_idx ON fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS fulfillment_items_order_item_id_idx ON fulfillment_items(order_item_id);

-- ── fulfillment_tracking_events ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fulfillment_tracking_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id  UUID        NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
  status          VARCHAR(100) NOT NULL,
  description     TEXT,
  location        VARCHAR(255),
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_tracking_events_fulfillment_id_idx
  ON fulfillment_tracking_events(fulfillment_id);
CREATE INDEX IF NOT EXISTS fulfillment_tracking_events_occurred_at_idx
  ON fulfillment_tracking_events(occurred_at);

-- ── Extend orders table ────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tax_breakdown        JSONB,
  ADD COLUMN IF NOT EXISTS tracking_number      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tracking_carrier     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_url         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS shipping_method_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fulfilled_at         TIMESTAMPTZ;

-- ── Seed EU tax rates ──────────────────────────────────────────────────────────

INSERT INTO tax_rates (id, country_code, category, rate_percent, name) VALUES
  (gen_random_uuid(), 'SE', 'standard',       25.00, 'Moms 25%'),
  (gen_random_uuid(), 'SE', 'reduced',         12.00, 'Moms 12%'),
  (gen_random_uuid(), 'SE', 'super_reduced',    6.00, 'Moms 6%'),
  (gen_random_uuid(), 'SE', 'zero',             0.00, 'Momsfri'),
  (gen_random_uuid(), 'NO', 'standard',        25.00, 'MVA 25%'),
  (gen_random_uuid(), 'DK', 'standard',        25.00, 'Moms 25%'),
  (gen_random_uuid(), 'FI', 'standard',        25.50, 'ALV 25,5%'),
  (gen_random_uuid(), 'DE', 'standard',        19.00, 'MwSt 19%'),
  (gen_random_uuid(), 'DE', 'reduced',          7.00, 'MwSt 7%'),
  (gen_random_uuid(), 'GB', 'standard',        20.00, 'VAT 20%'),
  (gen_random_uuid(), 'NL', 'standard',        21.00, 'BTW 21%')
ON CONFLICT DO NOTHING;
