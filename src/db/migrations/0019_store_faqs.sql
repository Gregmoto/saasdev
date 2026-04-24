-- Migration 0019: Store FAQs / Help Center
-- Per-store FAQ entries with version history and audit log.

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE faq_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── store_faqs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_faqs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      uuid NOT NULL,
  title                 varchar(255) NOT NULL,
  body                  text NOT NULL DEFAULT '',
  category              varchar(100),
  status                faq_status NOT NULL DEFAULT 'draft',
  is_global             boolean NOT NULL DEFAULT false,
  sort_order            integer NOT NULL DEFAULT 0,
  visible_to_roles      jsonb NOT NULL DEFAULT '[]',
  scheduled_publish_at  timestamptz,
  scheduled_archive_at  timestamptz,
  current_version       integer NOT NULL DEFAULT 1,
  view_count            integer NOT NULL DEFAULT 0,
  helpful_count         integer NOT NULL DEFAULT 0,
  not_helpful_count     integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_faqs_store_status_idx
  ON store_faqs (store_account_id, status);

CREATE INDEX IF NOT EXISTS store_faqs_global_status_idx
  ON store_faqs (is_global, status);

-- ── store_faq_versions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_faq_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id        uuid NOT NULL REFERENCES store_faqs(id) ON DELETE CASCADE,
  version       integer NOT NULL,
  title         varchar(255) NOT NULL,
  body          text NOT NULL DEFAULT '',
  edited_by     varchar(255),
  edit_summary  varchar(500),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_faq_versions_faq_id_idx
  ON store_faq_versions (faq_id);

-- ── store_faq_audit ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_faq_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id        uuid NOT NULL REFERENCES store_faqs(id) ON DELETE CASCADE,
  action        varchar(50) NOT NULL,
  actor_email   varchar(255),
  actor_role    varchar(50),
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_faq_audit_faq_id_idx
  ON store_faq_audit (faq_id);

CREATE INDEX IF NOT EXISTS store_faq_audit_created_at_idx
  ON store_faq_audit (created_at);
