-- Migration 0025: CMS roadmap items and docs articles

-- ── cms_roadmap_items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_roadmap_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(255) NOT NULL,
  language       cms_language NOT NULL DEFAULT 'sv',
  title          VARCHAR(255) NOT NULL,
  status         cms_status NOT NULL DEFAULT 'draft',
  category       VARCHAR(100),
  priority       INTEGER NOT NULL DEFAULT 0,
  quarter        VARCHAR(20),
  body           TEXT,
  excerpt        TEXT,
  votes          INTEGER NOT NULL DEFAULT 0,
  seo_title      VARCHAR(255),
  seo_description TEXT,
  og_image_url   TEXT,
  canonical_url  TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_roadmap_slug_lang_unique
  ON cms_roadmap_items (slug, language);

CREATE INDEX IF NOT EXISTS cms_roadmap_status_idx
  ON cms_roadmap_items (status);

CREATE INDEX IF NOT EXISTS cms_roadmap_category_idx
  ON cms_roadmap_items (category);

CREATE INDEX IF NOT EXISTS cms_roadmap_quarter_idx
  ON cms_roadmap_items (quarter);

-- ── cms_docs_articles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_docs_articles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(255) NOT NULL,
  language       cms_language NOT NULL DEFAULT 'sv',
  title          VARCHAR(255) NOT NULL,
  status         cms_status NOT NULL DEFAULT 'draft',
  section        VARCHAR(100),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  parent_id      UUID REFERENCES cms_docs_articles (id) ON DELETE SET NULL,
  body           TEXT,
  excerpt        TEXT,
  seo_title      VARCHAR(255),
  seo_description TEXT,
  og_image_url   TEXT,
  canonical_url  TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_docs_slug_lang_unique
  ON cms_docs_articles (slug, language);

CREATE INDEX IF NOT EXISTS cms_docs_status_idx
  ON cms_docs_articles (status);

CREATE INDEX IF NOT EXISTS cms_docs_section_idx
  ON cms_docs_articles (section);

CREATE INDEX IF NOT EXISTS cms_docs_parent_id_idx
  ON cms_docs_articles (parent_id);
