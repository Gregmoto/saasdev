-- Migration 0011: Supplier conflict resolution + Import Center

-- ─────────────────────────────────────────────────────────────────────────────
-- New enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE unknown_sku_behavior AS ENUM ('ignore','create_placeholder','flag_for_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_item_status AS ENUM ('pending','mapped','ignored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_platform_type AS ENUM ('shopify','woocommerce','prestashop');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE import_job_status AS ENUM ('draft','validating','dry_running','pending','running','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Supplier feed additions (dry-run + unknown-SKU behavior)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE supplier_feeds
  ADD COLUMN IF NOT EXISTS unknown_sku_behavior unknown_sku_behavior NOT NULL DEFAULT 'ignore';

ALTER TABLE supplier_feed_runs
  ADD COLUMN IF NOT EXISTS is_dry_run    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preview_data  JSONB;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. supplier_sku_mappings
--    Maps a supplier-provided SKU to an internal product SKU.
--    feed_id = NULL  → applies to all feeds (store-level mapping).
--    feed_id IS NOT NULL → feed-specific override.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_sku_mappings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  feed_id          UUID REFERENCES supplier_feeds(id) ON DELETE CASCADE,
  supplier_sku     VARCHAR(255) NOT NULL,
  internal_sku     VARCHAR(100) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique per (store, feed, supplier_sku) — COALESCE so nulls don't break uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_sku_mappings_uniq_idx
  ON supplier_sku_mappings(store_account_id, COALESCE(feed_id::text, ''), supplier_sku);
CREATE INDEX IF NOT EXISTS supplier_sku_mappings_store_account_id_idx
  ON supplier_sku_mappings(store_account_id);
CREATE INDEX IF NOT EXISTS supplier_sku_mappings_feed_id_idx
  ON supplier_sku_mappings(feed_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. supplier_review_items
--    Rows that could not be matched during a feed run and need manual review.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_review_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  feed_id             UUID NOT NULL REFERENCES supplier_feeds(id) ON DELETE CASCADE,
  run_id              UUID REFERENCES supplier_feed_runs(id) ON DELETE SET NULL,
  supplier_sku        VARCHAR(255),
  supplier_ean        VARCHAR(100),
  supplier_qty        INTEGER,
  supplier_price      NUMERIC(14,4),
  raw_data            JSONB,
  status              review_item_status NOT NULL DEFAULT 'pending',
  resolution_notes    TEXT,
  mapped_internal_sku VARCHAR(100),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_review_items_store_account_id_idx ON supplier_review_items(store_account_id);
CREATE INDEX IF NOT EXISTS supplier_review_items_feed_id_idx          ON supplier_review_items(feed_id);
CREATE INDEX IF NOT EXISTS supplier_review_items_run_id_idx           ON supplier_review_items(run_id);
CREATE INDEX IF NOT EXISTS supplier_review_items_status_idx           ON supplier_review_items(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. import_profiles  (reusable Import Center credential + mapping presets)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  platform              import_platform_type NOT NULL,
  -- AES-256-GCM encrypted JSON with platform-specific credentials.
  credentials_encrypted TEXT,
  -- Default field mapping saved from a previous successful job.
  default_field_mapping JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS import_profiles_store_account_id_idx ON import_profiles(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. import_jobs  (one row per wizard run)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  profile_id            UUID REFERENCES import_profiles(id) ON DELETE SET NULL,
  platform              import_platform_type NOT NULL,
  status                import_job_status NOT NULL DEFAULT 'draft',
  -- AES-256-GCM encrypted credentials (copied from profile or entered fresh).
  credentials_encrypted TEXT,
  -- e.g. ["products","customers","orders"]
  selected_entities     JSONB NOT NULL DEFAULT '[]',
  -- Field mapping per entity: { products: { name: "title", ... }, ... }
  field_mapping         JSONB NOT NULL DEFAULT '{}',
  is_dry_run            BOOLEAN NOT NULL DEFAULT FALSE,
  -- Populated after dry-run: { products: { sample: [...], total: n }, ... }
  dry_run_results       JSONB,
  -- Counters per entity: { products: { total, created, skipped, errored }, ... }
  stats                 JSONB NOT NULL DEFAULT '{}',
  -- Structured log entries: [{ ts, level, entity, message, externalId? }]
  log_entries           JSONB NOT NULL DEFAULT '[]',
  error_count           INTEGER NOT NULL DEFAULT 0,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS import_jobs_store_account_id_idx ON import_jobs(store_account_id);
CREATE INDEX IF NOT EXISTS import_jobs_status_idx           ON import_jobs(status);
CREATE INDEX IF NOT EXISTS import_jobs_profile_id_idx       ON import_jobs(profile_id);
