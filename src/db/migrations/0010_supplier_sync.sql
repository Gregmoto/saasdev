-- Migration 0010: Supplier Sync framework

-- ─────────────────────────────────────────────────────────────────────────────
-- New enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE supplier_connector_type AS ENUM ('ftp','sftp','api','manual_csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_feed_format AS ENUM ('csv','xml','json');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_feed_run_status AS ENUM ('pending','running','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_feed_trigger AS ENUM ('scheduled','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_api_auth_type AS ENUM ('api_key','bearer','basic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_api_pagination_type AS ENUM ('none','page','cursor','offset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. suppliers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) NOT NULL,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS suppliers_store_account_id_idx ON suppliers(store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_store_slug_idx ON suppliers(store_account_id, slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. supplier_feeds
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_feeds (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  supplier_id             UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  -- Plain uuid — FK to warehouses.id enforced below.
  target_warehouse_id     UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  name                    VARCHAR(255) NOT NULL,
  description             TEXT,
  connector_type          supplier_connector_type NOT NULL,
  format                  supplier_feed_format NOT NULL DEFAULT 'csv',
  -- AES-256-GCM encrypted JSON string holding connection credentials.
  credentials_encrypted   TEXT,
  -- FTP/SFTP remote options: { host, port, remotePath, filePattern, unzip, encoding }
  remote_config           JSONB,
  -- HTTP API options: { url, authType, authHeader, paginationType, pageSize,
  --   dataField, totalField, nextCursorField, pageParam, perPageParam, offsetParam }
  api_config              JSONB,
  -- Field-name mapping: { sku, ean, qty, price, costPrice, name }
  mapping_config          JSONB NOT NULL DEFAULT '{}',
  -- Match priority: { primary: "sku", secondary: "ean" }
  match_rules             JSONB NOT NULL DEFAULT '{"primary":"sku","secondary":"ean"}',
  -- Cron expression (e.g. "0 3 * * *") or NULL for manual-only.
  schedule                VARCHAR(100),
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_feeds_store_account_id_idx ON supplier_feeds(store_account_id);
CREATE INDEX IF NOT EXISTS supplier_feeds_supplier_id_idx      ON supplier_feeds(supplier_id);
CREATE INDEX IF NOT EXISTS supplier_feeds_warehouse_id_idx     ON supplier_feeds(target_warehouse_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. supplier_feed_runs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_feed_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  feed_id          UUID NOT NULL REFERENCES supplier_feeds(id) ON DELETE CASCADE,
  status           supplier_feed_run_status NOT NULL DEFAULT 'pending',
  triggered_by     supplier_feed_trigger NOT NULL DEFAULT 'manual',
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  rows_total       INTEGER NOT NULL DEFAULT 0,
  rows_updated     INTEGER NOT NULL DEFAULT 0,
  rows_skipped     INTEGER NOT NULL DEFAULT 0,
  rows_errored     INTEGER NOT NULL DEFAULT 0,
  error_message    TEXT,
  -- Append-only array: [{ ts, level, message, rowIndex? }]
  log_entries      JSONB NOT NULL DEFAULT '[]',
  -- Populated for manual_csv runs.
  file_name        VARCHAR(255),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_feed_runs_store_account_id_idx ON supplier_feed_runs(store_account_id);
CREATE INDEX IF NOT EXISTS supplier_feed_runs_feed_id_idx          ON supplier_feed_runs(feed_id);
CREATE INDEX IF NOT EXISTS supplier_feed_runs_status_idx           ON supplier_feed_runs(status);
CREATE INDEX IF NOT EXISTS supplier_feed_runs_created_at_idx       ON supplier_feed_runs(created_at DESC);
