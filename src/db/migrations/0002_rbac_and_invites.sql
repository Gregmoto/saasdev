-- Migration 0002: RBAC tables, updated member_role enum, and invite_tokens
-- Run: pnpm db:migrate  (or apply directly via psql)

-- ── 1. Rename old member_role enum to temporary name ──────────────────────
ALTER TYPE member_role RENAME TO member_role_old;

-- ── 2. Create new member_role enum with business roles ────────────────────
CREATE TYPE member_role AS ENUM (
  'store_admin',
  'store_staff',
  'marketplace_owner',
  'vendor_admin',
  'vendor_staff',
  'reseller_admin'
);

-- ── 3. Migrate existing store_memberships.role data ───────────────────────
ALTER TABLE store_memberships
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE store_memberships
  ALTER COLUMN role TYPE member_role
  USING (
    CASE role::text
      WHEN 'owner'  THEN 'store_admin'::member_role
      WHEN 'admin'  THEN 'store_admin'::member_role
      WHEN 'member' THEN 'store_staff'::member_role
      WHEN 'viewer' THEN 'store_staff'::member_role
      ELSE 'store_staff'::member_role
    END
  );

ALTER TABLE store_memberships
  ALTER COLUMN role SET DEFAULT 'store_staff';

-- ── 4. Drop old enum ──────────────────────────────────────────────────────
DROP TYPE member_role_old;

-- ── 5. RBAC enums ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE role_scope AS ENUM ('platform', 'store', 'vendor', 'reseller');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. RBAC tables ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(60) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  scope       role_scope  NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key        VARCHAR(100) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  scope      role_scope   NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id);

-- ── 7. Platform Super Admin memberships ───────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_memberships (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID    REFERENCES auth_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_memberships_active_idx
  ON platform_memberships(is_active);

-- ── 8. Invite tokens ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_tokens (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID         NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  email            VARCHAR(255) NOT NULL,
  role_key         VARCHAR(60)  NOT NULL,
  token_hash       VARCHAR(255) NOT NULL UNIQUE,
  invited_by       UUID         NOT NULL REFERENCES auth_users(id),
  expires_at       TIMESTAMPTZ  NOT NULL,
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invite_tokens_store_idx ON invite_tokens(store_account_id);
CREATE INDEX IF NOT EXISTS invite_tokens_email_idx ON invite_tokens(email);
