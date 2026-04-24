-- ─────────────────────────────────────────────────────────────────────────────
-- 0005  Plans + Feature Flags + Integrations + Audit Log enhancements
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Audit log: add structured taxonomy columns ────────────────────────────────
-- Keep event_type for backward-compat; new code sets action_type + entity_type.

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS action_type  VARCHAR(60),
  ADD COLUMN IF NOT EXISTS entity_type  VARCHAR(60),
  ADD COLUMN IF NOT EXISTS entity_id    UUID,
  ADD COLUMN IF NOT EXISTS user_agent   TEXT;

-- Back-fill action_type from event_type for existing rows.
UPDATE audit_log SET action_type = event_type WHERE action_type IS NULL;

-- Make action_type NOT NULL now that it is populated.
ALTER TABLE audit_log ALTER COLUMN action_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS audit_log_action_type_idx  ON audit_log (action_type);
CREATE INDEX IF NOT EXISTS audit_log_entity_type_idx  ON audit_log (entity_type);

-- ── plans ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 VARCHAR(63)  NOT NULL,
  name                 VARCHAR(100) NOT NULL,
  description          TEXT,
  monthly_price_cents  INTEGER,
  limits               JSONB        NOT NULL DEFAULT '{}',
  features             JSONB        NOT NULL DEFAULT '{}',
  sort_order           INTEGER      NOT NULL DEFAULT 0,
  is_public            BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_idx    ON plans (slug);
CREATE         INDEX IF NOT EXISTS plans_active_idx ON plans (is_active);

-- Seed the three starter plans.
INSERT INTO plans (slug, name, description, monthly_price_cents, sort_order, limits, features)
VALUES
  ('starter', 'Starter', 'For small stores getting started.', 0, 10,
   '{"maxProducts":100,"maxOrders":500,"maxUsers":3,"maxStorefronts":1,"maxWarehouses":1,"maxMarkets":1,"apiRequestsPerDay":1000,"storageGb":5}',
   '{"multiShop":false,"marketplace":false,"resellerPanel":false,"customDomains":false,"advancedAnalytics":false,"prioritySupport":false,"apiAccess":true,"webhooks":false,"bulkImport":false}'),

  ('growth', 'Growth', 'For growing businesses needing more scale.', 4900, 20,
   '{"maxProducts":5000,"maxOrders":null,"maxUsers":10,"maxStorefronts":3,"maxWarehouses":3,"maxMarkets":5,"apiRequestsPerDay":10000,"storageGb":50}',
   '{"multiShop":false,"marketplace":false,"resellerPanel":false,"customDomains":true,"advancedAnalytics":true,"prioritySupport":false,"apiAccess":true,"webhooks":true,"bulkImport":true}'),

  ('enterprise', 'Enterprise', 'Unlimited scale for large operations.', NULL, 30,
   '{"maxProducts":null,"maxOrders":null,"maxUsers":null,"maxStorefronts":null,"maxWarehouses":null,"maxMarkets":null,"apiRequestsPerDay":null,"storageGb":null}',
   '{"multiShop":true,"marketplace":true,"resellerPanel":true,"customDomains":true,"advancedAnalytics":true,"prioritySupport":true,"apiAccess":true,"webhooks":true,"bulkImport":true}')
ON CONFLICT (slug) DO NOTHING;

-- ── store_account_plans ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_account_plans (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  plan_id           UUID        NOT NULL REFERENCES plans(id),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  limit_overrides   JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_account_plans_store_id_idx ON store_account_plans (store_account_id);
CREATE         INDEX IF NOT EXISTS store_account_plans_plan_id_idx  ON store_account_plans (plan_id);

-- Assign the 'starter' plan to every existing store account that has no plan.
INSERT INTO store_account_plans (store_account_id, plan_id)
SELECT sa.id, p.id
FROM   store_accounts sa
JOIN   plans p ON p.slug = 'starter'
WHERE  NOT EXISTS (
  SELECT 1 FROM store_account_plans sap WHERE sap.store_account_id = sa.id
);

-- ── feature_flags ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID        NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  key               VARCHAR(100) NOT NULL,
  enabled           BOOLEAN     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_store_key_idx ON feature_flags (store_account_id, key);
CREATE         INDEX IF NOT EXISTS feature_flags_store_id_idx  ON feature_flags (store_account_id);

-- ── integration_auth_type enum ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE integration_auth_type AS ENUM ('api_key', 'oauth2', 'webhook', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── integration_status enum ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('pending', 'connected', 'disconnected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── integration_providers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_providers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(63) NOT NULL,
  name           VARCHAR(100) NOT NULL,
  description    TEXT,
  logo_url       TEXT,
  auth_type      integration_auth_type NOT NULL,
  config_schema  JSONB NOT NULL DEFAULT '{}',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_providers_slug_idx ON integration_providers (slug);

-- ── integration_connections ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_connections (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID               NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  provider_id       UUID               NOT NULL REFERENCES integration_providers(id) ON DELETE CASCADE,
  status            integration_status NOT NULL DEFAULT 'pending',
  config_encrypted  TEXT,
  metadata          JSONB,
  last_sync_at      TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_connections_store_provider_idx
  ON integration_connections (store_account_id, provider_id);
CREATE INDEX IF NOT EXISTS integration_connections_store_id_idx
  ON integration_connections (store_account_id);
CREATE INDEX IF NOT EXISTS integration_connections_status_idx
  ON integration_connections (status);
