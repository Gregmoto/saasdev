-- Migration 0008: Shop-aware orders, cross-shop customer analytics, multi-warehouse inventory
--
-- 1. Add shop_id to orders (nullable — existing orders remain valid)
-- 2. Add customer_shops join table for per-shop customer analytics
-- 3. Add warehouses, inventory_levels, inventory_events tables

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Orders: add shop_id
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_shop_id_idx ON orders(shop_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. customer_shops — per-shop customer analytics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_shops (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  first_order_at   TIMESTAMPTZ,
  last_order_at    TIMESTAMPTZ,
  orders_count     INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_shops_customer_shop_idx
  ON customer_shops(customer_id, shop_id);
CREATE INDEX IF NOT EXISTS customer_shops_customer_id_idx    ON customer_shops(customer_id);
CREATE INDEX IF NOT EXISTS customer_shops_shop_id_idx        ON customer_shops(shop_id);
CREATE INDEX IF NOT EXISTS customer_shops_store_account_id_idx ON customer_shops(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Warehouses
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE warehouse_type AS ENUM ('internal', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_reason AS ENUM (
    'sale', 'return', 'adjustment', 'incoming',
    'transfer_in', 'transfer_out', 'damage', 'initial'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS warehouses (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id       UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name                   VARCHAR(255) NOT NULL,
  type                   warehouse_type NOT NULL DEFAULT 'internal',
  address                JSONB,
  priority               INTEGER NOT NULL DEFAULT 0,
  is_enabled_for_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  lead_time_days         INTEGER NOT NULL DEFAULT 0,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS warehouses_store_account_id_idx ON warehouses(store_account_id);
CREATE INDEX IF NOT EXISTS warehouses_priority_idx         ON warehouses(priority);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. inventory_levels — current stock snapshot per (warehouse, SKU)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_levels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  sku              VARCHAR(100) NOT NULL,
  qty_available    INTEGER NOT NULL DEFAULT 0,
  qty_reserved     INTEGER NOT NULL DEFAULT 0,
  qty_incoming     INTEGER NOT NULL DEFAULT 0,
  variant_id       UUID,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_levels_warehouse_sku_idx
  ON inventory_levels(warehouse_id, sku);
CREATE INDEX IF NOT EXISTS inventory_levels_warehouse_id_idx    ON inventory_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_levels_sku_idx             ON inventory_levels(sku);
CREATE INDEX IF NOT EXISTS inventory_levels_store_account_id_idx ON inventory_levels(store_account_id);
CREATE INDEX IF NOT EXISTS inventory_levels_variant_id_idx      ON inventory_levels(variant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. inventory_events — immutable movement ledger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  warehouse_id     UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  sku              VARCHAR(100) NOT NULL,
  variant_id       UUID,
  delta            INTEGER NOT NULL,        -- positive = in, negative = out
  reason           inventory_reason NOT NULL,
  reference_type   VARCHAR(60),
  reference_id     UUID,
  created_by       UUID,
  qty_after        INTEGER,
  notes            VARCHAR(500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_events_warehouse_id_idx    ON inventory_events(warehouse_id);
CREATE INDEX IF NOT EXISTS inventory_events_sku_idx             ON inventory_events(sku);
CREATE INDEX IF NOT EXISTS inventory_events_store_account_id_idx ON inventory_events(store_account_id);
CREATE INDEX IF NOT EXISTS inventory_events_reference_idx       ON inventory_events(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS inventory_events_created_at_idx      ON inventory_events(created_at);
