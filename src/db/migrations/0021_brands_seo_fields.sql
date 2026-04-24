-- Migration 0021: Brands table + SEO fields on products and categories

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id  uuid NOT NULL,
  name              varchar(255) NOT NULL,
  slug              varchar(255) NOT NULL,
  description       text,
  logo_url          text,
  seo_title         varchar(255),
  seo_description   varchar(500),
  seo_keywords      text,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_store_account_idx ON brands (store_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS brands_store_slug_idx ON brands (store_account_id, slug);

-- Add brand_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON products (brand_id);

-- Add SEO fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title varchar(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description varchar(500);
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords text;

-- Add SEO fields and image to product_categories
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS seo_title varchar(255);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS seo_description varchar(500);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS seo_keywords text;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS image_url text;
