-- Migration: 0015_refunds_tickets_chat_rma
-- Adds refunds, tickets, chat, and RMA schemas

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS refund_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled');
CREATE TYPE IF NOT EXISTS refund_method AS ENUM ('original_payment', 'manual_bank', 'manual_cash', 'store_credit', 'other');

CREATE TYPE IF NOT EXISTS ticket_status AS ENUM ('new', 'open', 'pending', 'waiting_customer', 'solved', 'closed');
CREATE TYPE IF NOT EXISTS ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE IF NOT EXISTS ticket_author_type AS ENUM ('agent', 'customer', 'system');

CREATE TYPE IF NOT EXISTS chat_thread_status AS ENUM ('open', 'assigned', 'closed', 'archived');
CREATE TYPE IF NOT EXISTS chat_message_author_type AS ENUM ('customer', 'agent', 'bot', 'system');
CREATE TYPE IF NOT EXISTS chat_widget_position AS ENUM ('bottom_right', 'bottom_left');

CREATE TYPE IF NOT EXISTS rma_status AS ENUM ('requested', 'approved', 'label_sent', 'received', 'inspected', 'refunded', 'exchanged', 'denied', 'closed');
CREATE TYPE IF NOT EXISTS rma_item_condition AS ENUM ('new', 'good', 'damaged', 'defective', 'missing_parts', 'unknown');
CREATE TYPE IF NOT EXISTS rma_disposition AS ENUM ('restock', 'refurbish', 'scrap', 'vendor_return', 'pending');
CREATE TYPE IF NOT EXISTS rma_author_type AS ENUM ('agent', 'customer', 'system');

-- ── refunds ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refunds (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id   UUID NOT NULL,
  order_id           UUID NOT NULL,
  payment_id         UUID,
  rma_id             UUID,
  status             refund_status NOT NULL DEFAULT 'pending',
  method             refund_method NOT NULL DEFAULT 'original_payment',
  amount_cents       INTEGER NOT NULL,
  currency           VARCHAR(3) NOT NULL DEFAULT 'SEK',
  reason             TEXT,
  provider_refund_id VARCHAR(255),
  is_manual          BOOLEAN NOT NULL DEFAULT FALSE,
  is_partial         BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at       TIMESTAMPTZ,
  failed_at          TIMESTAMPTZ,
  failure_reason     TEXT,
  created_by_user_id UUID,
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT refunds_order_id_fk    FOREIGN KEY (order_id)   REFERENCES orders(id),
  CONSTRAINT refunds_payment_id_fk  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS refunds_store_account_id_idx ON refunds (store_account_id);
CREATE INDEX IF NOT EXISTS refunds_order_id_idx         ON refunds (order_id);
CREATE INDEX IF NOT EXISTS refunds_payment_id_idx       ON refunds (payment_id);
CREATE INDEX IF NOT EXISTS refunds_status_idx           ON refunds (status);
CREATE INDEX IF NOT EXISTS refunds_rma_id_idx           ON refunds (rma_id);

-- ── refund_items ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id     UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL,
  quantity      INTEGER NOT NULL,
  amount_cents  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_items_refund_id_idx     ON refund_items (refund_id);
CREATE INDEX IF NOT EXISTS refund_items_order_item_id_idx ON refund_items (order_item_id);

-- ── refund_audit_log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  refund_id        UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  actor_user_id    UUID,
  action           VARCHAR(100) NOT NULL,
  from_status      refund_status,
  to_status        refund_status,
  notes            TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refund_audit_log_refund_id_idx       ON refund_audit_log (refund_id);
CREATE INDEX IF NOT EXISTS refund_audit_log_store_account_id_idx ON refund_audit_log (store_account_id);
CREATE INDEX IF NOT EXISTS refund_audit_log_actor_user_id_idx   ON refund_audit_log (actor_user_id);

-- ── tickets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL,
  shop_id             UUID,
  ticket_number       VARCHAR(30) NOT NULL,
  subject             VARCHAR(500) NOT NULL,
  status              ticket_status NOT NULL DEFAULT 'new',
  priority            ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to_user_id UUID,
  customer_id         UUID,
  customer_email      VARCHAR(255),
  order_id            UUID,
  product_id          UUID,
  tags                JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata            JSONB,
  first_response_at   TIMESTAMPTZ,
  solved_at           TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tickets_store_account_id_idx    ON tickets (store_account_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx              ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx            ON tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_user_id_idx ON tickets (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS tickets_customer_id_idx         ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS tickets_order_id_idx            ON tickets (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS tickets_store_ticket_number_idx ON tickets (store_account_id, ticket_number);

-- ── ticket_messages ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id          UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  store_account_id   UUID NOT NULL,
  author_type        ticket_author_type NOT NULL,
  author_user_id     UUID,
  author_customer_id UUID,
  author_email       VARCHAR(255),
  body               TEXT NOT NULL,
  is_internal        BOOLEAN NOT NULL DEFAULT FALSE,
  attachments        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx       ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_store_account_id_idx ON ticket_messages (store_account_id);
CREATE INDEX IF NOT EXISTS ticket_messages_author_user_id_idx  ON ticket_messages (author_user_id);
CREATE INDEX IF NOT EXISTS ticket_messages_is_internal_idx     ON ticket_messages (is_internal);

-- ── ticket_tags ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_tags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  name             VARCHAR(100) NOT NULL,
  color            VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_tags_store_account_id_idx ON ticket_tags (store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_tags_store_name_idx ON ticket_tags (store_account_id, name);

-- ── chat_threads ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_threads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL,
  shop_id             UUID,
  customer_id         UUID,
  customer_email      VARCHAR(255),
  customer_name       VARCHAR(255),
  session_id          VARCHAR(255),
  status              chat_thread_status NOT NULL DEFAULT 'open',
  assigned_to_user_id UUID,
  subject             VARCHAR(500),
  last_message_at     TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_threads_store_account_id_idx    ON chat_threads (store_account_id);
CREATE INDEX IF NOT EXISTS chat_threads_shop_id_idx             ON chat_threads (shop_id);
CREATE INDEX IF NOT EXISTS chat_threads_customer_id_idx         ON chat_threads (customer_id);
CREATE INDEX IF NOT EXISTS chat_threads_status_idx              ON chat_threads (status);
CREATE INDEX IF NOT EXISTS chat_threads_assigned_to_user_id_idx ON chat_threads (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS chat_threads_last_message_at_idx     ON chat_threads (last_message_at);

-- ── chat_messages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id          UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  store_account_id   UUID NOT NULL,
  author_type        chat_message_author_type NOT NULL,
  author_user_id     UUID,
  author_customer_id UUID,
  body               TEXT NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  read_at            TIMESTAMPTZ,
  attachments        JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx       ON chat_messages (thread_id);
CREATE INDEX IF NOT EXISTS chat_messages_store_account_id_idx ON chat_messages (store_account_id);
CREATE INDEX IF NOT EXISTS chat_messages_is_read_idx         ON chat_messages (is_read);
CREATE INDEX IF NOT EXISTS chat_messages_author_type_idx     ON chat_messages (author_type);

-- ── business_hours ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_hours (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  shop_id          UUID,
  day_of_week      INTEGER NOT NULL,
  open_time        VARCHAR(5) NOT NULL,
  close_time       VARCHAR(5) NOT NULL,
  is_open          BOOLEAN NOT NULL DEFAULT TRUE,
  timezone         VARCHAR(100) NOT NULL DEFAULT 'Europe/Stockholm',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_hours_store_account_id_idx ON business_hours (store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS business_hours_store_shop_day_idx
  ON business_hours (store_account_id, COALESCE(shop_id, '00000000-0000-0000-0000-000000000000'::uuid), day_of_week);

-- ── chat_widget_config ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_widget_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      UUID NOT NULL,
  shop_id               UUID,
  is_enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  welcome_message       TEXT,
  offline_message       TEXT,
  primary_color         VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  position              chat_widget_position NOT NULL DEFAULT 'bottom_right',
  require_email         BOOLEAN NOT NULL DEFAULT FALSE,
  auto_greet_delay_secs INTEGER NOT NULL DEFAULT 5,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_widget_config_store_account_id_idx ON chat_widget_config (store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS chat_widget_config_store_shop_idx
  ON chat_widget_config (store_account_id, COALESCE(shop_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ── chat_offline_submissions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_offline_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  shop_id          UUID,
  name             VARCHAR(255),
  email            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  ticket_id        UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_offline_submissions_store_account_id_idx ON chat_offline_submissions (store_account_id);
CREATE INDEX IF NOT EXISTS chat_offline_submissions_shop_id_idx          ON chat_offline_submissions (shop_id);
CREATE INDEX IF NOT EXISTS chat_offline_submissions_ticket_id_idx        ON chat_offline_submissions (ticket_id);

-- ── rmas ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rmas (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id       UUID NOT NULL,
  shop_id                UUID,
  order_id               UUID NOT NULL,
  customer_id            UUID,
  customer_email         VARCHAR(255),
  rma_number             VARCHAR(30) NOT NULL,
  status                 rma_status NOT NULL DEFAULT 'requested',
  reason                 TEXT NOT NULL,
  notes                  TEXT,
  refund_amount_cents    INTEGER,
  refund_id              UUID,
  replacement_order_id   UUID,
  return_label_url       VARCHAR(500),
  return_label_carrier   VARCHAR(100),
  return_tracking_number VARCHAR(255),
  assigned_to_user_id    UUID,
  approved_at            TIMESTAMPTZ,
  label_sent_at          TIMESTAMPTZ,
  received_at            TIMESTAMPTZ,
  inspected_at           TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rmas_store_account_id_idx    ON rmas (store_account_id);
CREATE INDEX IF NOT EXISTS rmas_order_id_idx            ON rmas (order_id);
CREATE INDEX IF NOT EXISTS rmas_customer_id_idx         ON rmas (customer_id);
CREATE INDEX IF NOT EXISTS rmas_status_idx              ON rmas (status);
CREATE INDEX IF NOT EXISTS rmas_assigned_to_user_id_idx ON rmas (assigned_to_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS rmas_store_rma_number_idx ON rmas (store_account_id, rma_number);

-- Add FK from refunds.rma_id to rmas.id (deferred because rmas table is created after refunds)
ALTER TABLE refunds ADD CONSTRAINT refunds_rma_id_fk FOREIGN KEY (rma_id) REFERENCES rmas(id);

-- ── rma_items ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rma_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id                UUID NOT NULL REFERENCES rmas(id) ON DELETE CASCADE,
  store_account_id      UUID NOT NULL,
  order_item_id         UUID NOT NULL,
  sku                   VARCHAR(100),
  quantity_requested    INTEGER NOT NULL,
  quantity_received     INTEGER,
  condition             rma_item_condition,
  disposition           rma_disposition NOT NULL DEFAULT 'pending',
  restocked_warehouse_id UUID,
  inspection_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rma_items_rma_id_idx        ON rma_items (rma_id);
CREATE INDEX IF NOT EXISTS rma_items_store_account_id_idx ON rma_items (store_account_id);
CREATE INDEX IF NOT EXISTS rma_items_order_item_id_idx ON rma_items (order_item_id);
CREATE INDEX IF NOT EXISTS rma_items_disposition_idx   ON rma_items (disposition);

-- ── rma_messages ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rma_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id             UUID NOT NULL REFERENCES rmas(id) ON DELETE CASCADE,
  store_account_id   UUID NOT NULL,
  author_type        rma_author_type NOT NULL,
  author_user_id     UUID,
  author_customer_id UUID,
  body               TEXT NOT NULL,
  is_internal        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rma_messages_rma_id_idx          ON rma_messages (rma_id);
CREATE INDEX IF NOT EXISTS rma_messages_store_account_id_idx ON rma_messages (store_account_id);

-- ── rma_attachments ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rma_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id           UUID REFERENCES rmas(id) ON DELETE CASCADE,
  rma_item_id      UUID REFERENCES rma_items(id) ON DELETE CASCADE,
  rma_message_id   UUID REFERENCES rma_messages(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL,
  filename         VARCHAR(255) NOT NULL,
  url              VARCHAR(500) NOT NULL,
  mime_type        VARCHAR(100) NOT NULL,
  size_bytes       INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rma_attachments_rma_id_idx          ON rma_attachments (rma_id);
CREATE INDEX IF NOT EXISTS rma_attachments_rma_item_id_idx     ON rma_attachments (rma_item_id);
CREATE INDEX IF NOT EXISTS rma_attachments_rma_message_id_idx  ON rma_attachments (rma_message_id);
CREATE INDEX IF NOT EXISTS rma_attachments_store_account_id_idx ON rma_attachments (store_account_id);
