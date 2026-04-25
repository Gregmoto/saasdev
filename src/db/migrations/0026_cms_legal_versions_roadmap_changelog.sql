-- ── Legal page type enums ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE legal_page_type AS ENUM ('privacy', 'terms', 'cookies', 'dpa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE legal_version_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── cms_legal_versions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_legal_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type        legal_page_type NOT NULL,
  language         cms_language NOT NULL DEFAULT 'sv',
  version_number   VARCHAR(20) NOT NULL,
  version_label    VARCHAR(100),
  effective_date   DATE NOT NULL,
  status           legal_version_status NOT NULL DEFAULT 'draft',
  body             TEXT NOT NULL DEFAULT '',
  summary_of_changes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cms_legal_versions_type_lang_ver_unique
  ON cms_legal_versions (page_type, language, version_number);

CREATE INDEX IF NOT EXISTS cms_legal_versions_type_lang_status_idx
  ON cms_legal_versions (page_type, language, status);

CREATE INDEX IF NOT EXISTS cms_legal_versions_effective_date_idx
  ON cms_legal_versions (effective_date DESC);

-- ── roadmap_item_status enum + columns ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE roadmap_item_status AS ENUM ('considering', 'planned', 'in_progress', 'shipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE cms_roadmap_items
  ADD COLUMN IF NOT EXISTS item_status roadmap_item_status NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS tags        JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS cms_roadmap_item_status_idx ON cms_roadmap_items (item_status);

-- ── cms_changelog_entries new columns ─────────────────────────────────────────

ALTER TABLE cms_changelog_entries
  ADD COLUMN IF NOT EXISTS version_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS highlights    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fixes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS docs_links    JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── leads.topic ───────────────────────────────────────────────────────────────

ALTER TABLE leads ADD COLUMN IF NOT EXISTS topic VARCHAR(100);

-- ── Seed initial legal versions ───────────────────────────────────────────────

INSERT INTO cms_legal_versions (page_type, language, version_number, version_label, effective_date, status, body, summary_of_changes)
VALUES
  ('privacy', 'sv', '1.0', 'Initial version', '2026-01-01', 'published',
   '# Integritetspolicy\n\nDenna integritetspolicy beskriver hur ShopMan AB samlar in, använder och skyddar dina personuppgifter.\n\n## Personuppgiftsansvarig\n\nShopMan AB, org.nr 559XXX-XXXX, är personuppgiftsansvarig för behandlingen av dina uppgifter.\n\n## Uppgifter vi samlar in\n\n- Namn och kontaktuppgifter (e-post, telefon)\n- Betalningsinformation (hanteras av Klarna/Stripe)\n- Butiksdata och transaktioner\n- Teknisk data (IP-adress, webbläsare, cookies)\n\n## Syfte och rättslig grund\n\nVi behandlar dina uppgifter för att:\n- Leverera och förbättra tjänsten (avtalsuppfyllelse)\n- Fakturering och bokföring (rättslig förpliktelse)\n- Kommunikation och support (berättigat intresse)\n\n## Dina rättigheter\n\nEnligt GDPR har du rätt till: tillgång, rättelse, radering, begränsning, dataportabilitet och invändning.\n\nKontakta oss på privacy@shopman.se för att utöva dina rättigheter.\n\n## Cookies\n\nVi använder nödvändiga cookies för inloggning och preferenser, samt analytiska cookies (med ditt samtycke).\n\n## Kontakt\n\nprivacy@shopman.se',
   NULL),
  ('terms', 'sv', '1.0', 'Initial version', '2026-01-01', 'published',
   '# Allmänna villkor\n\nDessa villkor gäller för användning av ShopMan-plattformen.\n\n## Tjänstebeskrivning\n\nShopMan är en SaaS-plattform för e-handel. Vi tillhandahåller verktyg för produkthantering, orderhantering, lager och betalningar.\n\n## Betalning\n\nFakturering sker månadsvis i förskott. Vi accepterar kortbetalning och faktura. Utebliven betalning leder till tillfällig inaktivering av kontot.\n\n## Avtalstid\n\nAvtalet löper tills vidare med en månads uppsägningstid. Annual-planer kan sägas upp med 30 dagars varsel innan förnyelseperioden.\n\n## Ansvarsbegränsning\n\nShopMan ansvarar inte för indirekta förluster, utebliven vinst eller driftstopp utöver vad som anges i SLA.\n\n## Immateriella rättigheter\n\nDu behåller äganderätten till din butiksdata. ShopMan behåller äganderätten till plattformens kod och design.\n\n## Tillämplig lag\n\nSvensk lag tillämpas. Tvister avgörs av Stockholms tingsrätt.\n\n## Kontakt\n\nlegal@shopman.se',
   NULL)
ON CONFLICT (page_type, language, version_number) DO NOTHING;
