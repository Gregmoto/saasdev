-- Migration 0009: Reservation/allocation, shop-warehouse links, product types + bundles

-- ─────────────────────────────────────────────────────────────────────────────
-- New enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('pending','committed','released','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE allocation_strategy AS ENUM ('priority','lowest_lead_time','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE commit_trigger AS ENUM ('payment','fulfillment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('simple','variable','bundle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Products: add type column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS type product_type NOT NULL DEFAULT 'simple';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. inventory_reservations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id     UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id              UUID REFERENCES shops(id) ON DELETE SET NULL,
  warehouse_id         UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  sku                  VARCHAR(100) NOT NULL,
  variant_id           UUID,
  qty_reserved         INTEGER NOT NULL,
  status               reservation_status NOT NULL DEFAULT 'pending',
  allocation_strategy  allocation_strategy NOT NULL DEFAULT 'priority',
  expires_at           TIMESTAMPTZ,
  committed_at         TIMESTAMPTZ,
  released_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_reservations_store_account_id_idx ON inventory_reservations(store_account_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_order_id_idx         ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_warehouse_id_idx     ON inventory_reservations(warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_status_idx           ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS inventory_reservations_sku_idx              ON inventory_reservations(sku);
CREATE INDEX IF NOT EXISTS inventory_reservations_expires_at_idx       ON inventory_reservations(expires_at) WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. store_inventory_config (one row per store)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_inventory_config (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id             UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  commit_trigger               commit_trigger NOT NULL DEFAULT 'payment',
  allocation_strategy          allocation_strategy NOT NULL DEFAULT 'priority',
  reservation_timeout_minutes  INTEGER NOT NULL DEFAULT 30,
  auto_expire                  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_inventory_config_store_account_id_idx
  ON store_inventory_config(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. shop_warehouses
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shop_warehouses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  priority         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_warehouses_shop_warehouse_idx
  ON shop_warehouses(shop_id, warehouse_id);
CREATE INDEX IF NOT EXISTS shop_warehouses_shop_id_idx        ON shop_warehouses(shop_id);
CREATE INDEX IF NOT EXISTS shop_warehouses_warehouse_id_idx   ON shop_warehouses(warehouse_id);
CREATE INDEX IF NOT EXISTS shop_warehouses_store_account_id_idx ON shop_warehouses(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. bundle_option_groups
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bundle_option_groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  min_select        INTEGER NOT NULL DEFAULT 1,
  max_select        INTEGER NOT NULL DEFAULT 1,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bundle_option_groups_bundle_product_id_idx
  ON bundle_option_groups(bundle_product_id);
CREATE INDEX IF NOT EXISTS bundle_option_groups_store_account_id_idx
  ON bundle_option_groups(store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS bundle_option_groups_bundle_name_idx
  ON bundle_option_groups(bundle_product_id, name);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. bundle_components
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bundle_components (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id     UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  bundle_product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  component_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  option_group_id      UUID REFERENCES bundle_option_groups(id) ON DELETE CASCADE,
  quantity             INTEGER NOT NULL DEFAULT 1,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bundle_components_bundle_product_id_idx
  ON bundle_components(bundle_product_id);
CREATE INDEX IF NOT EXISTS bundle_components_store_account_id_idx
  ON bundle_components(store_account_id);
CREATE INDEX IF NOT EXISTS bundle_components_component_product_id_idx
  ON bundle_components(component_product_id);
CREATE INDEX IF NOT EXISTS bundle_components_component_variant_id_idx
  ON bundle_components(component_variant_id);
CREATE INDEX IF NOT EXISTS bundle_components_option_group_id_idx
  ON bundle_components(option_group_id);
