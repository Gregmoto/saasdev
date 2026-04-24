-- Migration 0004: Platform Admin portal + domain routing
-- Applies after 0003_security_and_2fa.sql

-- ── store_account_status enum ─────────────────────────────────────────────────
CREATE TYPE store_account_status AS ENUM ('pending', 'active', 'suspended', 'closed');

-- ── Alter store_accounts ──────────────────────────────────────────────────────
-- Add status lifecycle column (default 'active' preserves existing rows).
ALTER TABLE store_accounts
  ADD COLUMN IF NOT EXISTS status      store_account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_limits JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth_users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Back-fill: active rows stay active, inactive rows become suspended.
UPDATE store_accounts SET status = 'active'    WHERE is_active = true  AND status = 'active';
UPDATE store_accounts SET status = 'suspended' WHERE is_active = false AND status = 'active';

-- Indexes for status-based queries.
CREATE INDEX IF NOT EXISTS store_accounts_status_idx ON store_accounts (status);

-- Remove the old custom_domain column now replaced by store_account_domains.
-- (Keep it for backward compat until the domains table is fully adopted.)
-- ALTER TABLE store_accounts DROP COLUMN IF EXISTS custom_domain;

-- ── domain_verification_type enum ────────────────────────────────────────────
CREATE TYPE domain_verification_type AS ENUM ('dns', 'file');

-- ── store_account_domains ─────────────────────────────────────────────────────
-- Maps custom hostnames to store accounts.
-- Slug-based domains ({slug}.{BASE_DOMAIN}) are resolved directly from
-- store_accounts.slug and are NOT stored here.

CREATE TABLE IF NOT EXISTS store_account_domains (
  id                  UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID                      NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  hostname            VARCHAR(253)              NOT NULL,
  verified            BOOLEAN                   NOT NULL DEFAULT false,
  verified_at         TIMESTAMPTZ,
  is_primary          BOOLEAN                   NOT NULL DEFAULT false,
  verification_type   domain_verification_type  NOT NULL DEFAULT 'dns',
  verification_token  TEXT                      NOT NULL,
  created_at          TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ               NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_account_domains_hostname_idx
  ON store_account_domains (hostname);

CREATE INDEX IF NOT EXISTS store_account_domains_store_account_id_idx
  ON store_account_domains (store_account_id);

CREATE INDEX IF NOT EXISTS store_account_domains_verified_idx
  ON store_account_domains (verified);

-- Enforce at most one primary domain per store.
CREATE UNIQUE INDEX IF NOT EXISTS store_account_domains_one_primary_idx
  ON store_account_domains (store_account_id)
  WHERE is_primary = true;
