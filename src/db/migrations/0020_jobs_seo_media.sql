-- Migration 0020: Background jobs, SEO redirects, Media pipeline

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE job_type AS ENUM (
    'import_products', 'import_orders', 'import_customers',
    'supplier_sync', 'fortnox_sync', 'analytics_aggregate',
    'feed_generate', 'search_index_sync', 'demo_reseed',
    'cache_purge', 'media_process', 'sitemap_generate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'pending', 'running', 'completed', 'failed', 'cancelled', 'retrying'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE redirect_type AS ENUM ('301', '302');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_status AS ENUM ('pending', 'processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── store_jobs ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    uuid,
  bull_job_id         varchar(255),
  type                job_type NOT NULL,
  status              job_status NOT NULL DEFAULT 'pending',
  payload             jsonb NOT NULL DEFAULT '{}',
  result              jsonb,
  progress            integer NOT NULL DEFAULT 0,
  progress_message    varchar(500),
  attempts            integer NOT NULL DEFAULT 0,
  max_attempts        integer NOT NULL DEFAULT 3,
  last_error          text,
  triggered_by        varchar(255) NOT NULL DEFAULT 'system',
  scheduled_at        timestamptz,
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_jobs_store_account_idx ON store_jobs (store_account_id);
CREATE INDEX IF NOT EXISTS store_jobs_status_idx        ON store_jobs (status);
CREATE INDEX IF NOT EXISTS store_jobs_type_idx          ON store_jobs (type);
CREATE INDEX IF NOT EXISTS store_jobs_created_at_idx    ON store_jobs (created_at DESC);

-- ── store_job_logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_job_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid NOT NULL REFERENCES store_jobs(id) ON DELETE CASCADE,
  level       varchar(10) NOT NULL DEFAULT 'info',
  message     text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_job_logs_job_idx ON store_job_logs (job_id);

-- ── store_redirects ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_redirects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  uuid NOT NULL,
  shop_id           uuid,
  from_path         varchar(2048) NOT NULL,
  to_path           varchar(2048) NOT NULL,
  type              redirect_type NOT NULL DEFAULT '301',
  is_active         boolean NOT NULL DEFAULT true,
  hits              integer NOT NULL DEFAULT 0,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_redirects_store_account_idx ON store_redirects (store_account_id);
CREATE INDEX IF NOT EXISTS store_redirects_from_path_idx     ON store_redirects (store_account_id, from_path);

-- ── store_seo_settings ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_seo_settings (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id                  uuid NOT NULL UNIQUE,
  robots_rules                      jsonb NOT NULL DEFAULT '[]',
  canonical_base                    varchar(500),
  hreflang_map                      jsonb NOT NULL DEFAULT '{}',
  google_merchant_id                varchar(100),
  merchant_feed_include_out_of_stock boolean NOT NULL DEFAULT false,
  sitemap_version                   integer NOT NULL DEFAULT 1,
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_seo_settings_store_account_unique ON store_seo_settings (store_account_id);

-- ── store_media ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_media (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  uuid NOT NULL,
  shop_id           uuid,
  original_filename varchar(255) NOT NULL,
  mime_type         varchar(100) NOT NULL,
  size_bytes        integer NOT NULL,
  width             integer,
  height            integer,
  alt_text          text NOT NULL DEFAULT '',
  title             varchar(255),
  caption           text,
  storage_path      text NOT NULL,
  public_url        text,
  status            media_status NOT NULL DEFAULT 'pending',
  processing_error  text,
  variants          jsonb NOT NULL DEFAULT '{}',
  used_in           jsonb NOT NULL DEFAULT '[]',
  uploaded_by       varchar(255),
  tags              jsonb NOT NULL DEFAULT '[]',
  folder            varchar(255) DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_media_store_account_idx ON store_media (store_account_id);
CREATE INDEX IF NOT EXISTS store_media_shop_idx          ON store_media (shop_id);
CREATE INDEX IF NOT EXISTS store_media_status_idx        ON store_media (status);
CREATE INDEX IF NOT EXISTS store_media_created_at_idx    ON store_media (created_at DESC);
