-- Migration 0003: Security tables — user_2fa, recovery_codes, security_log, audit_log
-- Applies after 0002_rbac_and_invites.sql
-- Run: pnpm drizzle-kit migrate  (or execute directly against the DB)

-- ── user_2fa ─────────────────────────────────────────────────────────────────
-- Stores an AES-256-GCM encrypted TOTP secret per user.
-- enabledAt IS NULL  →  setup initiated but not yet confirmed via TOTP code.
-- enabledAt IS NOT NULL → 2FA active.
-- One row per user (UNIQUE on user_id).

CREATE TABLE IF NOT EXISTS user_2fa (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth_users(id) ON DELETE CASCADE,
  secret_encrypted TEXT    NOT NULL,
  enabled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── recovery_codes ────────────────────────────────────────────────────────────
-- 10 single-use recovery codes per user, generated when 2FA is confirmed.
-- code_hash = argon2id hash of the raw code; raw codes shown once, never stored.
-- used_at IS NOT NULL → code has been consumed; cannot be reused.

CREATE TABLE IF NOT EXISTS recovery_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code_hash   TEXT        NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recovery_codes_user_id_idx
  ON recovery_codes (user_id);

-- ── security_log ──────────────────────────────────────────────────────────────
-- Immutable append-only log for authentication events.
-- Nullable FKs so events can be recorded even when user/store is unknown.
--
-- event_type values (enforced in application layer, not as DB enum to allow
-- adding new types without migrations):
--   login_success | login_fail | login_lockout | totp_success | totp_fail |
--   recovery_code_used | suspicious_login | session_revoked |
--   session_revoked_all | password_reset_request | password_reset_success

CREATE TABLE IF NOT EXISTS security_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID        REFERENCES store_accounts(id),
  user_id          UUID        REFERENCES auth_users(id),
  event_type       VARCHAR(60) NOT NULL,
  ip_address       TEXT,
  user_agent       TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_log_user_id_idx
  ON security_log (user_id);
CREATE INDEX IF NOT EXISTS security_log_store_account_id_idx
  ON security_log (store_account_id);
CREATE INDEX IF NOT EXISTS security_log_event_type_idx
  ON security_log (event_type);
CREATE INDEX IF NOT EXISTS security_log_created_at_idx
  ON security_log (created_at DESC);

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Privileged-operation audit trail: role changes, impersonation, 2FA admin resets.
--
-- event_type values:
--   role_change | member_invited | member_revoked | invite_revoked |
--   totp_enabled | totp_disabled | totp_admin_reset |
--   impersonation_start | impersonation_stop

CREATE TABLE IF NOT EXISTS audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id UUID        REFERENCES store_accounts(id),
  actor_user_id    UUID        REFERENCES auth_users(id),
  target_user_id   UUID        REFERENCES auth_users(id),
  event_type       VARCHAR(60) NOT NULL,
  before_state     JSONB,
  after_state      JSONB,
  ip_address       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_store_account_id_idx
  ON audit_log (store_account_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_user_id_idx
  ON audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx
  ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);
