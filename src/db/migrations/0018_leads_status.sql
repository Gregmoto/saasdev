-- Migration 0018: Leads (lead capture) + Status (system status page)
-- Platform-level tables, no store account scope.

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE lead_type AS ENUM ('contact', 'demo', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE component_status AS ENUM (
    'operational', 'degraded_performance', 'partial_outage', 'major_outage', 'under_maintenance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_impact AS ENUM ('none', 'minor', 'major', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── leads ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              lead_type NOT NULL,
  status            lead_status NOT NULL DEFAULT 'new',
  first_name        varchar(100),
  last_name         varchar(100),
  email             varchar(255) NOT NULL,
  company           varchar(200),
  phone             varchar(50),
  message           text,
  metadata          jsonb NOT NULL DEFAULT '{}',
  utm_source        varchar(100),
  utm_medium        varchar(100),
  utm_campaign      varchar(200),
  utm_content       varchar(200),
  utm_term          varchar(200),
  referrer          text,
  landing_page      text,
  user_agent        text,
  webhook_sent      boolean NOT NULL DEFAULT false,
  webhook_sent_at   timestamptz,
  webhook_error     text,
  notes             text,
  assigned_to       varchar(255),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_type_idx       ON leads (type);
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads (status);
CREATE INDEX IF NOT EXISTS leads_email_idx      ON leads (email);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

-- ── status_components ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_components (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(200) NOT NULL,
  slug         varchar(100) NOT NULL UNIQUE,
  description  text,
  group_name   varchar(100),
  status       component_status NOT NULL DEFAULT 'operational',
  sort_order   integer NOT NULL DEFAULT 0,
  enabled      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS status_components_slug_unique ON status_components (slug);
CREATE INDEX IF NOT EXISTS status_components_sort_idx ON status_components (sort_order);

-- ── status_incidents ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_incidents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                varchar(255) NOT NULL,
  status               incident_status NOT NULL DEFAULT 'investigating',
  impact               incident_impact NOT NULL DEFAULT 'minor',
  affected_components  text DEFAULT '',
  resolved_at          timestamptz,
  started_at           timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_incidents_status_idx     ON status_incidents (status);
CREATE INDEX IF NOT EXISTS status_incidents_started_at_idx ON status_incidents (started_at DESC);

-- ── status_incident_updates ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_incident_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
  status       incident_status NOT NULL,
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_incident_updates_incident_idx ON status_incident_updates (incident_id);

-- ── status_maintenances ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_maintenances (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                varchar(255) NOT NULL,
  description          text,
  status               maintenance_status NOT NULL DEFAULT 'scheduled',
  affected_components  text DEFAULT '',
  scheduled_start      timestamptz NOT NULL,
  scheduled_end        timestamptz NOT NULL,
  actual_start         timestamptz,
  actual_end           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_maintenances_status_idx ON status_maintenances (status);
CREATE INDEX IF NOT EXISTS status_maintenances_start_idx  ON status_maintenances (scheduled_start);

-- ── status_subscriptions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            varchar(255) NOT NULL,
  token            varchar(64) NOT NULL UNIQUE,
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS status_subscriptions_email_unique ON status_subscriptions (email);
CREATE UNIQUE INDEX IF NOT EXISTS status_subscriptions_token_unique ON status_subscriptions (token);

-- ── Seed default status components ───────────────────────────────────────────

INSERT INTO status_components (name, slug, description, group_name, status, sort_order)
VALUES
  ('API',             'api',           'Backend API',                    'Kärntjänster',  'operational', 1),
  ('Admin-panel',     'admin',         'Adminpanel för butiker',          'Kärntjänster',  'operational', 2),
  ('Butiksfront',     'storefront',    'Kundinriktad butikssida',         'Kärntjänster',  'operational', 3),
  ('Databas',         'database',      'PostgreSQL-databas',              'Kärntjänster',  'operational', 4),
  ('Klarna',          'klarna',        'Klarna betalgateway',             'Integrationer', 'operational', 5),
  ('Fortnox',         'fortnox',       'Fortnox bokföringsintegration',   'Integrationer', 'operational', 6),
  ('Leverantörssynk', 'supplier-sync', 'Automatisk produktsynk',         'Integrationer', 'operational', 7),
  ('E-post',          'email',         'Transaktionsmejl och notiser',   'Integrationer', 'operational', 8)
ON CONFLICT (slug) DO NOTHING;
