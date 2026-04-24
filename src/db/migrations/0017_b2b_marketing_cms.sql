-- Migration 0017: B2B/Dealer Panel + Marketing CMS
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE b2b_company_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE b2b_price_list_discount_type AS ENUM ('percentage', 'fixed_price', 'margin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE b2b_payment_method AS ENUM ('invoice', 'credit_card', 'bank_transfer', 'direct_debit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cms_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cms_language AS ENUM ('sv', 'en', 'pl');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cms_post_type AS ENUM ('blog', 'news');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cms_changelog_tag AS ENUM ('new', 'improvement', 'fix', 'breaking', 'security', 'deprecation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cms_integration_status AS ENUM ('active', 'coming_soon', 'beta', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── B2B ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS b2b_companies (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id            UUID NOT NULL,
  shop_id                     UUID,
  name                        VARCHAR(200) NOT NULL,
  org_number                  VARCHAR(50),
  vat_number                  VARCHAR(50),
  website                     TEXT,
  industry                    VARCHAR(100),
  customer_id                 UUID,
  sales_rep_user_id           UUID,
  status                      b2b_company_status NOT NULL DEFAULT 'pending',
  approved_at                 TIMESTAMPTZ,
  approved_by_user_id         UUID,
  default_price_list_id       UUID,
  default_payment_terms_id    UUID,
  credit_limit_cents          INTEGER NOT NULL DEFAULT 0,
  used_credit_cents           INTEGER NOT NULL DEFAULT 0,
  allow_credit_overdraft      BOOLEAN NOT NULL DEFAULT FALSE,
  default_shipping_address_id UUID,
  default_billing_address_id  UUID,
  show_warehouse_availability BOOLEAN NOT NULL DEFAULT TRUE,
  show_retail_price           BOOLEAN NOT NULL DEFAULT TRUE,
  notes                       TEXT,
  metadata                    JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_co_store_idx    ON b2b_companies (store_account_id);
CREATE INDEX IF NOT EXISTS b2b_co_status_idx   ON b2b_companies (status);
CREATE INDEX IF NOT EXISTS b2b_co_customer_idx ON b2b_companies (customer_id);

CREATE TABLE IF NOT EXISTS b2b_price_lists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      UUID NOT NULL,
  name                  VARCHAR(100) NOT NULL,
  currency              VARCHAR(3) NOT NULL DEFAULT 'SEK',
  discount_type         b2b_price_list_discount_type NOT NULL DEFAULT 'percentage',
  global_discount_value NUMERIC(10,4) NOT NULL DEFAULT 0,
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_pl_store_idx ON b2b_price_lists (store_account_id);

CREATE TABLE IF NOT EXISTS b2b_price_list_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id       UUID NOT NULL REFERENCES b2b_price_lists(id) ON DELETE CASCADE,
  store_account_id    UUID NOT NULL,
  product_id          UUID NOT NULL,
  variant_id          UUID,
  price_cents         INTEGER,
  discount_percentage NUMERIC(6,4),
  minimum_quantity    INTEGER NOT NULL DEFAULT 1,
  maximum_quantity    INTEGER,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_pli_price_list_idx ON b2b_price_list_items (price_list_id);
CREATE INDEX IF NOT EXISTS b2b_pli_product_idx    ON b2b_price_list_items (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS b2b_pli_unique_variant
  ON b2b_price_list_items (price_list_id, product_id, variant_id);

CREATE TABLE IF NOT EXISTS b2b_payment_terms (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id               UUID NOT NULL,
  name                           VARCHAR(100) NOT NULL,
  net_days                       INTEGER NOT NULL DEFAULT 0,
  early_payment_discount_days    INTEGER,
  early_payment_discount_percent NUMERIC(6,4),
  allowed_methods                JSONB NOT NULL DEFAULT '["invoice"]'::jsonb,
  requires_purchase_order        BOOLEAN NOT NULL DEFAULT FALSE,
  is_default                     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_pt_store_idx ON b2b_payment_terms (store_account_id);

CREATE TABLE IF NOT EXISTS b2b_minimum_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id       UUID NOT NULL,
  b2b_company_id         UUID,
  shop_id                UUID,
  minimum_order_cents    INTEGER,
  minimum_order_quantity INTEGER,
  minimum_order_lines    INTEGER,
  enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_mo_store_idx   ON b2b_minimum_orders (store_account_id);
CREATE INDEX IF NOT EXISTS b2b_mo_company_idx ON b2b_minimum_orders (b2b_company_id);

CREATE TABLE IF NOT EXISTS b2b_reorder_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  b2b_company_id   UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at     TIMESTAMPTZ,
  use_count        INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_rt_company_idx ON b2b_reorder_templates (b2b_company_id);
CREATE INDEX IF NOT EXISTS b2b_rt_store_idx   ON b2b_reorder_templates (store_account_id);

CREATE TABLE IF NOT EXISTS b2b_credit_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  b2b_company_id   UUID NOT NULL REFERENCES b2b_companies(id),
  order_id         UUID,
  type             VARCHAR(50) NOT NULL,
  amount_cents     INTEGER NOT NULL,
  reference        VARCHAR(200),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS b2b_ce_company_idx ON b2b_credit_events (b2b_company_id);
CREATE INDEX IF NOT EXISTS b2b_ce_store_idx   ON b2b_credit_events (store_account_id);

-- ── Marketing CMS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(255) NOT NULL,
  language        cms_language NOT NULL DEFAULT 'sv',
  title           VARCHAR(255) NOT NULL,
  status          cms_status NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  sections        JSONB DEFAULT '[]'::jsonb,
  body            TEXT,
  excerpt         TEXT,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  canonical_url   TEXT,
  og_title        VARCHAR(255),
  og_description  TEXT,
  og_image_url    TEXT,
  hreflang        JSONB,
  breadcrumb      JSONB,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_slug_lang_unique ON cms_pages (slug, language);
CREATE INDEX IF NOT EXISTS cms_pages_status_idx ON cms_pages (status);
CREATE INDEX IF NOT EXISTS cms_pages_lang_idx   ON cms_pages (language);

CREATE TABLE IF NOT EXISTS cms_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             VARCHAR(255) NOT NULL,
  language         cms_language NOT NULL DEFAULT 'sv',
  type             cms_post_type NOT NULL DEFAULT 'blog',
  title            VARCHAR(255) NOT NULL,
  status           cms_status NOT NULL DEFAULT 'draft',
  scheduled_at     TIMESTAMPTZ,
  excerpt          TEXT,
  body             TEXT NOT NULL DEFAULT '',
  cover_image_url  TEXT,
  author_name      VARCHAR(100),
  author_title     VARCHAR(100),
  author_avatar_url TEXT,
  category         VARCHAR(100),
  tags             JSONB DEFAULT '[]'::jsonb,
  read_time_minutes INTEGER,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  og_image_url     TEXT,
  canonical_url    TEXT,
  hreflang         JSONB,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_posts_slug_lang_type_unique ON cms_posts (slug, language, type);
CREATE INDEX IF NOT EXISTS cms_posts_status_idx      ON cms_posts (status);
CREATE INDEX IF NOT EXISTS cms_posts_type_idx        ON cms_posts (type);
CREATE INDEX IF NOT EXISTS cms_posts_lang_idx        ON cms_posts (language);
CREATE INDEX IF NOT EXISTS cms_posts_published_at_idx ON cms_posts (published_at);

CREATE TABLE IF NOT EXISTS cms_changelog_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(255) NOT NULL,
  language        cms_language NOT NULL DEFAULT 'sv',
  version         VARCHAR(30),
  title           VARCHAR(255) NOT NULL,
  status          cms_status NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  body            TEXT NOT NULL DEFAULT '',
  tags            JSONB DEFAULT '[]'::jsonb,
  category        VARCHAR(100),
  seo_title       VARCHAR(255),
  seo_description TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_changelog_slug_lang_unique ON cms_changelog_entries (slug, language);
CREATE INDEX IF NOT EXISTS cms_changelog_status_idx       ON cms_changelog_entries (status);
CREATE INDEX IF NOT EXISTS cms_changelog_published_at_idx ON cms_changelog_entries (published_at);

CREATE TABLE IF NOT EXISTS cms_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(255) NOT NULL,
  language        cms_language NOT NULL DEFAULT 'sv',
  status          cms_status NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMPTZ,
  company_name    VARCHAR(200) NOT NULL,
  industry        VARCHAR(100),
  logo_url        TEXT,
  cover_image_url TEXT,
  headline        VARCHAR(255) NOT NULL,
  subheadline     TEXT,
  body            TEXT NOT NULL DEFAULT '',
  results         JSONB DEFAULT '[]'::jsonb,
  tags            JSONB DEFAULT '[]'::jsonb,
  cta_text        VARCHAR(100),
  cta_url         TEXT,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  og_image_url    TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_cases_slug_lang_unique ON cms_cases (slug, language);
CREATE INDEX IF NOT EXISTS cms_cases_status_idx ON cms_cases (status);

CREATE TABLE IF NOT EXISTS cms_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             VARCHAR(255) NOT NULL,
  language         cms_language NOT NULL DEFAULT 'sv',
  name             VARCHAR(200) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  status           cms_integration_status NOT NULL DEFAULT 'active',
  logo_url         TEXT,
  cover_image_url  TEXT,
  description      TEXT,
  long_description TEXT,
  docs_url         TEXT,
  marketing_url    TEXT,
  tags             JSONB DEFAULT '[]'::jsonb,
  features         JSONB DEFAULT '[]'::jsonb,
  seo_title        VARCHAR(255),
  seo_description  TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_integrations_slug_lang_unique ON cms_integrations (slug, language);
CREATE INDEX IF NOT EXISTS cms_integrations_category_idx ON cms_integrations (category);
CREATE INDEX IF NOT EXISTS cms_integrations_status_idx   ON cms_integrations (status);

CREATE TABLE IF NOT EXISTS cms_faqs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language        cms_language NOT NULL DEFAULT 'sv',
  category        VARCHAR(100),
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  status          cms_status NOT NULL DEFAULT 'draft',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  show_on_pages   JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_faqs_lang_idx     ON cms_faqs (language);
CREATE INDEX IF NOT EXISTS cms_faqs_category_idx ON cms_faqs (category);
CREATE INDEX IF NOT EXISTS cms_faqs_status_idx   ON cms_faqs (status);

CREATE TABLE IF NOT EXISTS cms_features (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  VARCHAR(255) NOT NULL,
  language              cms_language NOT NULL DEFAULT 'sv',
  status                cms_status NOT NULL DEFAULT 'draft',
  title                 VARCHAR(255) NOT NULL,
  tagline               VARCHAR(255),
  excerpt               TEXT,
  icon_url              TEXT,
  cover_image_url       TEXT,
  category              VARCHAR(100),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  body                  TEXT,
  benefits              JSONB DEFAULT '[]'::jsonb,
  screenshots           JSONB DEFAULT '[]'::jsonb,
  related_feature_slugs JSONB DEFAULT '[]'::jsonb,
  faq_items             JSONB DEFAULT '[]'::jsonb,
  cta_text              VARCHAR(100),
  cta_url               TEXT,
  seo_title             VARCHAR(255),
  seo_description       TEXT,
  og_image_url          TEXT,
  canonical_url         TEXT,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_features_slug_lang_unique ON cms_features (slug, language);
CREATE INDEX IF NOT EXISTS cms_features_status_idx   ON cms_features (status);
CREATE INDEX IF NOT EXISTS cms_features_category_idx ON cms_features (category);

CREATE TABLE IF NOT EXISTS cms_homepage_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(100) NOT NULL,
  language    cms_language NOT NULL DEFAULT 'sv',
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_hp_section_lang_unique ON cms_homepage_sections (section_key, language);
CREATE INDEX IF NOT EXISTS cms_hp_lang_idx ON cms_homepage_sections (language);

-- Seed default integration categories
INSERT INTO cms_integrations (slug, name, category, description, status) VALUES
  ('stripe', 'Stripe', 'Betalningar', 'Kortbetalningar, prenumerationer och utbetalningar med Stripe.', 'active'),
  ('klarna', 'Klarna', 'Betalningar', 'Klarna köp nu betala senare och direktbetalningar.', 'active'),
  ('swish', 'Swish', 'Betalningar', 'Direktbetalningar via Swish för svenska konsumenter.', 'active'),
  ('shopify', 'Shopify', 'Import', 'Importera produkter, kunder och ordrar från Shopify.', 'active'),
  ('woocommerce', 'WooCommerce', 'Import', 'Migrera från WooCommerce med ett klick.', 'active'),
  ('fortnox', 'Fortnox', 'Bokföring', 'Synka ordrar och fakturor direkt till Fortnox.', 'active'),
  ('visma', 'Visma', 'Bokföring', 'Automatisk bokföringsintegration med Visma.', 'coming_soon'),
  ('postnord', 'PostNord', 'Frakt', 'Fraktlabels och spårning via PostNord.', 'active'),
  ('dhl', 'DHL', 'Frakt', 'DHL Express och DHL Freight integration.', 'active'),
  ('mailchimp', 'Mailchimp', 'E-postmarknadsföring', 'Synka kunder och köphistorik till Mailchimp.', 'active')
ON CONFLICT DO NOTHING;
