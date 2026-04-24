-- Migration 0006: WEBSHOP core modules
-- products, orders, customers, content, support, reviews, sync tables
-- Plus Fortnox as a seeded integration provider

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'partially_refunded', 'refunded', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM ('unfulfilled', 'partial', 'fulfilled', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_log_level AS ENUM ('info', 'warn', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL,
  parent_id       UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_categories_store_account_id_idx ON product_categories(store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_store_slug_idx ON product_categories(store_account_id, slug);

CREATE TABLE IF NOT EXISTS products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  category_id             UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name                    VARCHAR(255) NOT NULL,
  slug                    VARCHAR(255) NOT NULL,
  description             TEXT,
  status                  product_status NOT NULL DEFAULT 'draft',
  price_cents             INTEGER NOT NULL,
  compare_at_price_cents  INTEGER,
  taxable                 BOOLEAN NOT NULL DEFAULT TRUE,
  track_inventory         BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_quantity      INTEGER NOT NULL DEFAULT 0,
  weight                  REAL,
  sku                     VARCHAR(100),
  barcode                 VARCHAR(100),
  images                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_store_account_id_idx ON products(store_account_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE UNIQUE INDEX IF NOT EXISTS products_store_slug_idx ON products(store_account_id, slug);

CREATE TABLE IF NOT EXISTS product_variants (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  product_id              UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title                   VARCHAR(255) NOT NULL,
  sku                     VARCHAR(100),
  barcode                 VARCHAR(100),
  price_cents             INTEGER NOT NULL,
  compare_at_price_cents  INTEGER,
  inventory_quantity      INTEGER NOT NULL DEFAULT 0,
  options                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Customers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  email               VARCHAR(255) NOT NULL,
  first_name          VARCHAR(255),
  last_name           VARCHAR(255),
  phone               VARCHAR(50),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_marketing   BOOLEAN NOT NULL DEFAULT FALSE,
  total_spent_cents   INTEGER NOT NULL DEFAULT 0,
  orders_count        INTEGER NOT NULL DEFAULT 0,
  notes               TEXT,
  tags                JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_store_email_idx ON customers(store_account_id, email);
CREATE INDEX IF NOT EXISTS customers_store_account_id_idx ON customers(store_account_id);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  type             VARCHAR(20) NOT NULL,
  first_name       VARCHAR(255),
  last_name        VARCHAR(255),
  company          VARCHAR(255),
  address1         VARCHAR(255) NOT NULL,
  address2         VARCHAR(255),
  city             VARCHAR(100) NOT NULL,
  province         VARCHAR(100),
  zip              VARCHAR(20),
  country          CHAR(2) NOT NULL,
  phone            VARCHAR(50),
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_id_idx ON customer_addresses(customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id     UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  order_number         VARCHAR(30) NOT NULL,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  status               order_status NOT NULL DEFAULT 'pending',
  payment_status       payment_status NOT NULL DEFAULT 'unpaid',
  fulfillment_status   fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  customer_email       VARCHAR(255),
  customer_first_name  VARCHAR(255),
  customer_last_name   VARCHAR(255),
  subtotal_cents       INTEGER NOT NULL,
  discount_cents       INTEGER NOT NULL DEFAULT 0,
  tax_cents            INTEGER NOT NULL DEFAULT 0,
  shipping_cents       INTEGER NOT NULL DEFAULT 0,
  total_cents          INTEGER NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'SEK',
  shipping_address     JSONB,
  billing_address      JSONB,
  notes                TEXT,
  tags                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_store_account_id_idx ON orders(store_account_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_store_order_number_idx ON orders(store_account_id, order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  product_id       UUID,
  variant_id       UUID,
  title            VARCHAR(255) NOT NULL,
  variant_title    VARCHAR(255),
  sku              VARCHAR(100),
  quantity         INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_price_cents INTEGER NOT NULL,
  tax_cents        INTEGER NOT NULL DEFAULT 0,
  metadata         JSONB
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_store_account_id_idx ON order_items(store_account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Content
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL,
  body             TEXT,
  excerpt          TEXT,
  status           content_status NOT NULL DEFAULT 'draft',
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  published_at     TIMESTAMPTZ,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_store_slug_idx ON pages(store_account_id, slug);
CREATE INDEX IF NOT EXISTS pages_store_account_id_idx ON pages(store_account_id);
CREATE INDEX IF NOT EXISTS pages_status_idx ON pages(status);

CREATE TABLE IF NOT EXISTS blog_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  slug             VARCHAR(255) NOT NULL,
  body             TEXT,
  excerpt          TEXT,
  author_id        UUID,
  status           content_status NOT NULL DEFAULT 'draft',
  tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  cover_image_url  TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_store_slug_idx ON blog_posts(store_account_id, slug);
CREATE INDEX IF NOT EXISTS blog_posts_store_account_id_idx ON blog_posts(store_account_id);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Support
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject          VARCHAR(255) NOT NULL,
  status           ticket_status NOT NULL DEFAULT 'open',
  priority         ticket_priority NOT NULL DEFAULT 'medium',
  assigned_user_id UUID,
  tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_store_account_id_idx ON support_tickets(store_account_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS support_tickets_customer_id_idx ON support_tickets(customer_id);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  author_id        UUID,
  author_type      VARCHAR(20) NOT NULL,
  body             TEXT NOT NULL,
  is_internal      BOOLEAN NOT NULL DEFAULT FALSE,
  attachments      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS rma_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending',
  reason            VARCHAR(100) NOT NULL,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution        VARCHAR(100),
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rma_requests_store_account_id_idx ON rma_requests(store_account_id);
CREATE INDEX IF NOT EXISTS rma_requests_status_idx ON rma_requests(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reviews
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_item_id    UUID,
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title            VARCHAR(255),
  body             TEXT,
  status           review_status NOT NULL DEFAULT 'pending',
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count    INTEGER NOT NULL DEFAULT 0,
  metadata         JSONB,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_reviews_store_account_id_idx ON product_reviews(store_account_id);
CREATE INDEX IF NOT EXISTS product_reviews_product_id_idx ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS product_reviews_status_idx ON product_reviews(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sync Jobs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  provider          VARCHAR(60) NOT NULL,
  entity_type       VARCHAR(60) NOT NULL,
  status            sync_job_status NOT NULL DEFAULT 'pending',
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error_message     TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 3,
  next_retry_at     TIMESTAMPTZ,
  total_records     INTEGER,
  processed_records INTEGER NOT NULL DEFAULT 0,
  failed_records    INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_jobs_store_account_id_idx ON sync_jobs(store_account_id);
CREATE INDEX IF NOT EXISTS sync_jobs_status_idx ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS sync_jobs_provider_idx ON sync_jobs(provider);
CREATE INDEX IF NOT EXISTS sync_jobs_next_retry_at_idx ON sync_jobs(next_retry_at);

CREATE TABLE IF NOT EXISTS sync_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id      UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  provider         VARCHAR(60) NOT NULL,
  level            sync_log_level NOT NULL DEFAULT 'info',
  message          TEXT NOT NULL,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_logs_sync_job_id_idx ON sync_logs(sync_job_id);
CREATE INDEX IF NOT EXISTS sync_logs_store_account_id_idx ON sync_logs(store_account_id);
CREATE INDEX IF NOT EXISTS sync_logs_level_idx ON sync_logs(level);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Fortnox integration provider
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO integration_providers (id, slug, name, auth_type, description, config_schema, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'fortnox',
  'Fortnox',
  'oauth2',
  'Connect your Fortnox account to sync customers, orders, and products.',
  '{
    "clientId": {"type": "string", "label": "Client ID", "secret": false, "required": true},
    "clientSecret": {"type": "string", "label": "Client Secret", "secret": true, "required": true}
  }'::jsonb,
  10,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;
