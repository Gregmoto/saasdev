-- Migration 0016: Reviews v2 + Marketplace commissions + Affiliates
-- ─────────────────────────────────────────────────────────────────────────────

-- ── New Enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE review_verification AS ENUM ('none', 'purchase', 'account');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_media_type AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_vote_type AS ENUM ('helpful', 'not_helpful');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_reply_author AS ENUM ('vendor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_invitation_status AS ENUM ('pending', 'sent', 'opened', 'completed', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend existing review_status enum with new values
DO $$ BEGIN
  ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'flagged';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('percentage', 'flat', 'tiered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('open', 'closed', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vendor_payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE affiliate_status AS ENUM ('pending', 'approved', 'paused', 'rejected', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE affiliate_commission_type AS ENUM ('percentage', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE affiliate_conversion_status AS ENUM ('pending', 'confirmed', 'cancelled', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE affiliate_payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend product_reviews ────────────────────────────────────────────────────

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS shop_id            UUID,
  ADD COLUMN IF NOT EXISTS variant_id         UUID,
  ADD COLUMN IF NOT EXISTS order_id           UUID,
  ADD COLUMN IF NOT EXISTS invitation_id      UUID,
  ADD COLUMN IF NOT EXISTS vendor_id          UUID,
  ADD COLUMN IF NOT EXISTS author_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS author_email       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ip_address         VARCHAR(45),
  ADD COLUMN IF NOT EXISTS language           VARCHAR(10) NOT NULL DEFAULT 'sv',
  ADD COLUMN IF NOT EXISTS verification       review_verification NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS rejected_reason    TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS flag_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS not_helpful_count  INTEGER NOT NULL DEFAULT 0;

-- Back-fill verification for existing verified-purchase rows
UPDATE product_reviews SET verification = 'purchase' WHERE verified_purchase = TRUE;

CREATE INDEX IF NOT EXISTS pr_vendor_idx       ON product_reviews (vendor_id);
CREATE INDEX IF NOT EXISTS pr_customer_idx     ON product_reviews (customer_id);
CREATE INDEX IF NOT EXISTS pr_invitation_idx   ON product_reviews (invitation_id);

-- ── review_media ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  media_type      review_media_type NOT NULL,
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  alt_text        VARCHAR(255),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_media_review_idx ON review_media (review_id);

-- ── review_votes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  customer_id UUID,
  ip_address  VARCHAR(45),
  vote_type   review_vote_type NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS rv_unique_customer_vote
  ON review_votes (review_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rv_review_idx ON review_votes (review_id);

-- ── review_replies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_replies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  store_account_id UUID NOT NULL,
  vendor_id        UUID,
  author_user_id   UUID,
  author_type      review_reply_author NOT NULL,
  body             TEXT NOT NULL,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rr_review_idx ON review_replies (review_id);
CREATE INDEX IF NOT EXISTS rr_store_idx  ON review_replies (store_account_id);

-- ── review_invitations ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID NOT NULL,
  shop_id          UUID,
  order_id         UUID NOT NULL,
  order_item_id    UUID NOT NULL,
  product_id       UUID NOT NULL,
  customer_id      UUID,
  customer_email   VARCHAR(255) NOT NULL,
  language         VARCHAR(10) NOT NULL DEFAULT 'sv',
  token            VARCHAR(64) NOT NULL UNIQUE,
  status           review_invitation_status NOT NULL DEFAULT 'pending',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  sent_at          TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL,
  review_id        UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ri_store_idx     ON review_invitations (store_account_id);
CREATE INDEX IF NOT EXISTS ri_order_item_idx ON review_invitations (order_item_id);
CREATE INDEX IF NOT EXISTS ri_token_idx     ON review_invitations (token);
CREATE INDEX IF NOT EXISTS ri_status_idx    ON review_invitations (status);
CREATE INDEX IF NOT EXISTS ri_scheduled_idx ON review_invitations (scheduled_at, status);

-- ── review_invitation_configs ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_invitation_configs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id            UUID NOT NULL,
  shop_id                     UUID,
  language                    VARCHAR(10),
  send_after_days             INTEGER NOT NULL DEFAULT 7,
  token_validity_days         INTEGER NOT NULL DEFAULT 30,
  enabled                     BOOLEAN NOT NULL DEFAULT TRUE,
  allow_non_purchase_reviews  BOOLEAN NOT NULL DEFAULT FALSE,
  email_template              JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ric_store_idx ON review_invitation_configs (store_account_id);

-- ── Marketplace: vendor_commission_rules ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_commission_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL,
  vendor_id           UUID,
  product_id          UUID,
  category_id         UUID,
  commission_type     commission_type NOT NULL DEFAULT 'percentage',
  value               NUMERIC(10,4) NOT NULL,
  tiers               JSONB,
  min_commission_cents INTEGER,
  max_commission_cents INTEGER,
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  priority            INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vcr_store_idx  ON vendor_commission_rules (store_account_id);
CREATE INDEX IF NOT EXISTS vcr_vendor_idx ON vendor_commission_rules (vendor_id);

-- ── vendor_orders ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL,
  order_id            UUID NOT NULL,
  vendor_id           UUID NOT NULL,
  order_number        VARCHAR(50) NOT NULL,
  status              vendor_order_status NOT NULL DEFAULT 'pending',
  subtotal_cents      INTEGER NOT NULL DEFAULT 0,
  tax_cents           INTEGER NOT NULL DEFAULT 0,
  shipping_cents      INTEGER NOT NULL DEFAULT 0,
  total_cents         INTEGER NOT NULL DEFAULT 0,
  commission_cents    INTEGER NOT NULL DEFAULT 0,
  net_payout_cents    INTEGER NOT NULL DEFAULT 0,
  tracking_number     VARCHAR(200),
  tracking_carrier    VARCHAR(100),
  tracking_url        TEXT,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vo_order_idx  ON vendor_orders (order_id);
CREATE INDEX IF NOT EXISTS vo_vendor_idx ON vendor_orders (vendor_id);
CREATE INDEX IF NOT EXISTS vo_store_idx  ON vendor_orders (store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS vo_unique_order_vendor ON vendor_orders (order_id, vendor_id);

-- ── vendor_order_items ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_order_id       UUID NOT NULL REFERENCES vendor_orders(id) ON DELETE CASCADE,
  order_item_id         UUID NOT NULL,
  product_id            UUID NOT NULL,
  variant_id            UUID,
  sku                   VARCHAR(100),
  name                  VARCHAR(500) NOT NULL,
  quantity              INTEGER NOT NULL,
  unit_price_cents      INTEGER NOT NULL,
  total_cents           INTEGER NOT NULL,
  commission_rule_id    UUID,
  commission_cents      INTEGER NOT NULL DEFAULT 0,
  net_payout_cents      INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voi_vendor_order_idx ON vendor_order_items (vendor_order_id);

-- ── commissions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id      UUID NOT NULL,
  vendor_id             UUID NOT NULL,
  vendor_order_id       UUID NOT NULL REFERENCES vendor_orders(id),
  vendor_order_item_id  UUID,
  commission_rule_id    UUID,
  commission_type       commission_type NOT NULL,
  rate_value            NUMERIC(10,4) NOT NULL,
  gross_amount_cents    INTEGER NOT NULL,
  commission_cents      INTEGER NOT NULL,
  net_amount_cents      INTEGER NOT NULL,
  settlement_id         UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comm_vendor_idx       ON commissions (vendor_id);
CREATE INDEX IF NOT EXISTS comm_vendor_order_idx ON commissions (vendor_order_id);
CREATE INDEX IF NOT EXISTS comm_settlement_idx   ON commissions (settlement_id);
CREATE INDEX IF NOT EXISTS comm_store_idx        ON commissions (store_account_id);

-- ── vendor_settlements ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_settlements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID NOT NULL,
  vendor_id               UUID NOT NULL,
  settlement_number       VARCHAR(50) NOT NULL,
  status                  settlement_status NOT NULL DEFAULT 'open',
  period_start            TIMESTAMPTZ NOT NULL,
  period_end              TIMESTAMPTZ NOT NULL,
  gross_revenue_cents     INTEGER NOT NULL DEFAULT 0,
  total_commission_cents  INTEGER NOT NULL DEFAULT 0,
  refund_adjustment_cents INTEGER NOT NULL DEFAULT 0,
  net_payout_cents        INTEGER NOT NULL DEFAULT 0,
  notes                   TEXT,
  closed_at               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vs_vendor_idx ON vendor_settlements (vendor_id);
CREATE INDEX IF NOT EXISTS vs_store_idx  ON vendor_settlements (store_account_id);
CREATE INDEX IF NOT EXISTS vs_status_idx ON vendor_settlements (status);

-- ── vendor_payouts ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL,
  vendor_id         UUID NOT NULL,
  settlement_id     UUID REFERENCES vendor_settlements(id),
  status            vendor_payout_status NOT NULL DEFAULT 'pending',
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'SEK',
  payment_method    VARCHAR(50),
  payment_reference VARCHAR(255),
  paid_at           TIMESTAMPTZ,
  exported_at       TIMESTAMPTZ,
  export_format     VARCHAR(20),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vp_vendor_idx     ON vendor_payouts (vendor_id);
CREATE INDEX IF NOT EXISTS vp_settlement_idx ON vendor_payouts (settlement_id);
CREATE INDEX IF NOT EXISTS vp_status_idx     ON vendor_payouts (status);

-- ── Affiliates ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id        UUID NOT NULL,
  customer_id             UUID,
  name                    VARCHAR(200) NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  company_name            VARCHAR(200),
  website                 TEXT,
  status                  affiliate_status NOT NULL DEFAULT 'pending',
  commission_type         affiliate_commission_type NOT NULL DEFAULT 'percentage',
  commission_value        NUMERIC(10,4) NOT NULL DEFAULT 10,
  cookie_window_days      INTEGER NOT NULL DEFAULT 30,
  payment_method          VARCHAR(50),
  payment_details         JSONB,
  total_click_count       INTEGER NOT NULL DEFAULT 0,
  total_conversion_count  INTEGER NOT NULL DEFAULT 0,
  total_revenue_cents     INTEGER NOT NULL DEFAULT 0,
  total_commission_cents  INTEGER NOT NULL DEFAULT 0,
  total_paid_out_cents    INTEGER NOT NULL DEFAULT 0,
  approved_at             TIMESTAMPTZ,
  approved_by_user_id     UUID,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aff_store_idx  ON affiliates (store_account_id);
CREATE INDEX IF NOT EXISTS aff_status_idx ON affiliates (status);
CREATE UNIQUE INDEX IF NOT EXISTS aff_email_store_unique ON affiliates (store_account_id, email);

-- ── affiliate_links ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliate_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  store_account_id  UUID NOT NULL,
  code              VARCHAR(50) NOT NULL,
  target_url        TEXT,
  label             VARCHAR(100),
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  click_count       INTEGER NOT NULL DEFAULT 0,
  conversion_count  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS al_affiliate_idx ON affiliate_links (affiliate_id);
CREATE UNIQUE INDEX IF NOT EXISTS al_code_store_unique ON affiliate_links (store_account_id, code);

-- ── affiliate_clicks ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id   UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  affiliate_id        UUID NOT NULL,
  store_account_id    UUID NOT NULL,
  session_id          UUID,
  ip_address          VARCHAR(45),
  user_agent          TEXT,
  referer             TEXT,
  landing_url         TEXT,
  cookie_expires_at   TIMESTAMPTZ NOT NULL,
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ac_link_idx      ON affiliate_clicks (affiliate_link_id);
CREATE INDEX IF NOT EXISTS ac_affiliate_idx ON affiliate_clicks (affiliate_id);
CREATE INDEX IF NOT EXISTS ac_session_idx   ON affiliate_clicks (session_id);
CREATE INDEX IF NOT EXISTS ac_created_at_idx ON affiliate_clicks (created_at);

-- ── affiliate_conversions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id    UUID NOT NULL,
  affiliate_id        UUID NOT NULL,
  affiliate_link_id   UUID NOT NULL,
  affiliate_click_id  UUID,
  order_id            UUID NOT NULL,
  customer_id         UUID,
  status              affiliate_conversion_status NOT NULL DEFAULT 'pending',
  order_revenue_cents INTEGER NOT NULL,
  commission_type     affiliate_commission_type NOT NULL,
  commission_value    NUMERIC(10,4) NOT NULL,
  commission_cents    INTEGER NOT NULL,
  payout_id           UUID,
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS aconv_affiliate_idx ON affiliate_conversions (affiliate_id);
CREATE INDEX IF NOT EXISTS aconv_order_idx     ON affiliate_conversions (order_id);
CREATE INDEX IF NOT EXISTS aconv_status_idx    ON affiliate_conversions (status);
CREATE INDEX IF NOT EXISTS aconv_payout_idx    ON affiliate_conversions (payout_id);
CREATE UNIQUE INDEX IF NOT EXISTS aconv_unique_order ON affiliate_conversions (order_id);

-- ── affiliate_payouts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  UUID NOT NULL,
  affiliate_id      UUID NOT NULL,
  status            affiliate_payout_status NOT NULL DEFAULT 'pending',
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'SEK',
  payment_method    VARCHAR(50),
  payment_reference VARCHAR(255),
  exported_at       TIMESTAMPTZ,
  export_format     VARCHAR(20),
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ap_affiliate_idx ON affiliate_payouts (affiliate_id);
CREATE INDEX IF NOT EXISTS ap_status_idx    ON affiliate_payouts (status);
