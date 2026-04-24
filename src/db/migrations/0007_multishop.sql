-- Migration 0007: Multi-shop model
-- Adds per-store-account shop instances, per-shop domain routing,
-- master catalog visibility activation per shop, and per-shop price overrides.

-- ─────────────────────────────────────────────────────────────────────────────
-- shops
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shops (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  theme_id          VARCHAR(100),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  default_language  VARCHAR(10) NOT NULL DEFAULT 'en',
  default_currency  CHAR(3) NOT NULL DEFAULT 'SEK',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX  IF NOT EXISTS shops_store_account_id_idx ON shops(store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS shops_store_slug_idx ON shops(store_account_id, slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- shop_domains
-- ─────────────────────────────────────────────────────────────────────────────
-- Per-shop custom hostnames. A lookup on this table resolves both
-- store_account_id and shop_id in one query — enabling true per-shop routing.

CREATE TABLE IF NOT EXISTS shop_domains (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  hostname         VARCHAR(253) NOT NULL,
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hostname is globally unique (same guarantee as store_account_domains).
CREATE UNIQUE INDEX IF NOT EXISTS shop_domains_hostname_idx         ON shop_domains(hostname);
CREATE        INDEX IF NOT EXISTS shop_domains_shop_id_idx          ON shop_domains(shop_id);
CREATE        INDEX IF NOT EXISTS shop_domains_store_account_id_idx ON shop_domains(store_account_id);
CREATE        INDEX IF NOT EXISTS shop_domains_verified_idx         ON shop_domains(is_verified);

-- ─────────────────────────────────────────────────────────────────────────────
-- shop_product_visibility
-- ─────────────────────────────────────────────────────────────────────────────
-- Products are mastered at the store account level. This table records which
-- products are activated (published) for each shop. A product that has no row
-- here is NOT visible in that shop.

CREATE TABLE IF NOT EXISTS shop_product_visibility (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_product_visibility_shop_product_idx
  ON shop_product_visibility(shop_id, product_id);
CREATE INDEX IF NOT EXISTS shop_product_visibility_shop_id_idx
  ON shop_product_visibility(shop_id);
CREATE INDEX IF NOT EXISTS shop_product_visibility_product_id_idx
  ON shop_product_visibility(product_id);
CREATE INDEX IF NOT EXISTS shop_product_visibility_store_account_id_idx
  ON shop_product_visibility(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- shop_prices
-- ─────────────────────────────────────────────────────────────────────────────
-- Optional per-shop price overrides for product variants.
-- When a row exists here its price takes precedence over the master variant
-- price. When absent, the caller falls back to product_variants.price_cents.

CREATE TABLE IF NOT EXISTS shop_prices (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id       UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  shop_id                UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  variant_id             UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price_cents            INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency               CHAR(3) NOT NULL DEFAULT 'SEK',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_prices_shop_variant_idx
  ON shop_prices(shop_id, variant_id);
CREATE INDEX IF NOT EXISTS shop_prices_shop_id_idx    ON shop_prices(shop_id);
CREATE INDEX IF NOT EXISTS shop_prices_variant_id_idx ON shop_prices(variant_id);
