-- Migration 0023: Add is_demo flag to store_accounts
-- Demo accounts are read-only for public visitors; only platform admins can mutate them.

ALTER TABLE store_accounts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast lookup of demo accounts in the preHandler guard.
CREATE INDEX IF NOT EXISTS store_accounts_is_demo_idx ON store_accounts (is_demo) WHERE is_demo = TRUE;

-- Mark the three seeded demo accounts as is_demo if they already exist.
UPDATE store_accounts
SET is_demo = TRUE, updated_at = now()
WHERE slug IN (
  'demo-webshop',
  'demo-multishop',
  'demo-marketplace-vintage',
  'demo-marketplace-eco',
  'demo-marketplace-tech',
  'demo-marketplace-kids'
);
