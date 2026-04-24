import type { Db } from "../../db/client.js";
import type { Redis } from "ioredis";
import { securityLog, auditLog } from "../../db/schema/index.js";
import { sendEmail } from "../../lib/email.js";

// ── Brute-force lockout ───────────────────────────────────────────────────────

const FAIL_KEY = (email: string) => `auth:fails:${email.toLowerCase()}`;
const LOCK_KEY = (email: string) => `auth:locked:${email.toLowerCase()}`;
const KNOWN_IPS_KEY = (userId: string) => `auth:ips:${userId}`;

const SOFT_THRESHOLD = 5;
const HARD_THRESHOLD = 10;
const SOFT_LOCKOUT_SECS = 15 * 60;  // 15 min
const HARD_LOCKOUT_SECS = 60 * 60;  // 1 hour
const FAIL_WINDOW_SECS = 60 * 60;   // fail counter expires in 1 hour if no further attempts

export async function isLockedOut(redis: Redis, email: string): Promise<boolean> {
  try {
    return (await redis.get(LOCK_KEY(email))) !== null;
  } catch {
    // Redis unavailable — fail open (not locked) so login can proceed
    return false;
  }
}

export async function recordFailedAttempt(
  redis: Redis,
  email: string,
): Promise<{ locked: boolean; lockoutSeconds: number }> {
  try {
    const failKey = FAIL_KEY(email);
    const count = await redis.incr(failKey);
    await redis.expire(failKey, FAIL_WINDOW_SECS);

    if (count >= HARD_THRESHOLD) {
      await redis.set(LOCK_KEY(email), "1", "EX", HARD_LOCKOUT_SECS);
      return { locked: true, lockoutSeconds: HARD_LOCKOUT_SECS };
    }
    if (count >= SOFT_THRESHOLD) {
      await redis.set(LOCK_KEY(email), "1", "EX", SOFT_LOCKOUT_SECS);
      return { locked: true, lockoutSeconds: SOFT_LOCKOUT_SECS };
    }
    return { locked: false, lockoutSeconds: 0 };
  } catch {
    // Redis unavailable — skip rate-limit tracking
    return { locked: false, lockoutSeconds: 0 };
  }
}

export async function clearFailedAttempts(redis: Redis, email: string): Promise<void> {
  try {
    await redis.del(FAIL_KEY(email), LOCK_KEY(email));
  } catch {
    // Redis unavailable — ignore
  }
}

// ── Suspicious login detection ────────────────────────────────────────────────
// Tracks known IPs per user in a Redis Set. First login from a new IP is flagged.

const IP_SET_TTL_SECS = 90 * 24 * 60 * 60; // 90 days

export async function checkSuspiciousLogin(
  redis: Redis,
  userId: string,
  ip: string | undefined,
): Promise<boolean> {
  if (!ip) return false;
  try {
    const key = KNOWN_IPS_KEY(userId);
    const knownIps = await redis.smembers(key);
    await redis.sadd(key, ip);
    await redis.expire(key, IP_SET_TTL_SECS);
    // First login ever is not suspicious; subsequent logins from new IPs are.
    return knownIps.length > 0 && !knownIps.includes(ip);
  } catch {
    return false; // Redis unavailable — skip suspicious login detection
  }
}

export async function sendSuspiciousLoginAlert(
  toEmail: string,
  ip: string,
): Promise<void> {
  await sendEmail({
    to: toEmail,
    subject: "New sign-in from unrecognized location",
    html: `
      <p>We detected a sign-in to your account from a new IP address: <strong>${ip}</strong>.</p>
      <p>If this was not you, please change your password immediately and contact support.</p>
    `,
    text: `Sign-in detected from new IP: ${ip}. If this wasn't you, change your password immediately.`,
  });
}

// ── Session revocation ────────────────────────────────────────────────────────

export async function revokeAllSessions(redis: Redis, userId: string): Promise<number> {
  // Scans for all session keys that belong to this user.
  // Session keys are stored by @fastify/session; we track userId→sessionIds in a set.
  const memberKey = `sessions:user:${userId}`;
  const sessionIds = await redis.smembers(memberKey);

  if (sessionIds.length === 0) return 0;

  const sessionKeys = sessionIds.map((id) => `sess:${id}`);
  await redis.del(...sessionKeys as [string, ...string[]]);
  await redis.del(memberKey);

  return sessionIds.length;
}

// ── Security log ──────────────────────────────────────────────────────────────

export type SecurityEventType =
  | "login_success"
  | "login_fail"
  | "login_lockout"
  | "totp_success"
  | "totp_fail"
  | "recovery_code_used"
  | "suspicious_login"
  | "session_revoked"
  | "session_revoked_all"
  | "password_reset_request"
  | "password_reset_success";

export async function recordSecurityEvent(
  db: Db,
  opts: {
    eventType: SecurityEventType;
    userId?: string | undefined;
    storeAccountId?: string | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  },
): Promise<void> {
  await db.insert(securityLog).values({
    eventType: opts.eventType,
    userId: opts.userId ?? null,
    storeAccountId: opts.storeAccountId ?? null,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
    metadata: (opts.metadata ?? null) as Record<string, unknown> | null,
  });
}

// ── Audit log ─────────────────────────────────────────────────────────────────

// Legacy alias kept for callers that still use the old eventType API.
export type AuditEventType =
  | "role_change"
  | "member_invited"
  | "member_revoked"
  | "invite_revoked"
  | "totp_enabled"
  | "totp_disabled"
  | "totp_admin_reset"
  | "impersonation_start"
  | "impersonation_stop"
  // New structured types (preferred going forward)
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "close"
  | "connect"
  | "disconnect"
  | "publish"
  | "unpublish"
  | "invite"
  | "revoke"
  | "impersonate"
  | "impersonate_stop"
  | "totp_reset"
  | "plan_assign"
  | "limit_override";

/**
 * Insert a row into the audit log.
 *
 * Prefer setting `actionType` + `entityType` + `entityId` for all new callers.
 * `eventType` is a backward-compat alias; when both are provided they must agree.
 */
export async function recordAuditEvent(
  db: Db,
  opts: {
    eventType: AuditEventType;
    actionType?: AuditEventType | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    actorUserId?: string | undefined;
    targetUserId?: string | undefined;
    storeAccountId?: string | undefined;
    beforeState?: Record<string, unknown> | undefined;
    afterState?: Record<string, unknown> | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
  },
): Promise<void> {
  const action = opts.actionType ?? opts.eventType;
  await db.insert(auditLog).values({
    actionType: action,
    eventType: opts.eventType,
    entityType: opts.entityType ?? null,
    entityId: opts.entityId ?? null,
    actorUserId: opts.actorUserId ?? null,
    targetUserId: opts.targetUserId ?? null,
    storeAccountId: opts.storeAccountId ?? null,
    beforeState: (opts.beforeState ?? null) as Record<string, unknown> | null,
    afterState: (opts.afterState ?? null) as Record<string, unknown> | null,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
  });
}
