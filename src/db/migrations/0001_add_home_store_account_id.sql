-- Migration: add home_store_account_id to auth_users
--
-- auth_users is a global identity table (one row per person, shared across
-- store accounts). home_store_account_id is the user's preferred/default store
-- for the MultiShop UI switcher. It is NOT an access-control field — the
-- authoritative source for access is store_memberships.
--
-- Run: pnpm db:migrate  (or apply directly via psql)

ALTER TABLE auth_users
  ADD COLUMN IF NOT EXISTS home_store_account_id UUID
  REFERENCES store_accounts(id) ON DELETE SET NULL;

-- Backfill: for every existing user, set home_store_account_id to the
-- store_account_id of their earliest active membership (if any).
UPDATE auth_users u
SET home_store_account_id = (
  SELECT sm.store_account_id
  FROM   store_memberships sm
  WHERE  sm.user_id   = u.id
    AND  sm.is_active = true
  ORDER  BY sm.invited_at ASC
  LIMIT  1
)
WHERE u.home_store_account_id IS NULL;

CREATE INDEX IF NOT EXISTS auth_users_home_store_idx
  ON auth_users(home_store_account_id)
  WHERE home_store_account_id IS NOT NULL;
