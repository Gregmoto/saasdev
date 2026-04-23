import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { resolveStoreAccountIdFromRequest } from "../../hooks/require-store-account.js";
import * as AuthService from "./service.js";
import * as SecurityService from "../security/service.js";
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  magicLinkRequestSchema,
  changePasswordSchema,
} from "./schemas.js";
import { config } from "../../config.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── Register ──────────────────────────────────────────────────────────────
  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    try {
      const { userId, storeAccountId } = await AuthService.registerStoreAccount(
        app.db,
        body,
      );

      request.session.userId = userId;
      request.session.totpVerified = true; // no 2FA enrolled yet
      request.session.lastActiveStoreAccountId = storeAccountId;

      await AuthService.trackSession(app.db, {
        sessionId: request.session.sessionId,
        userId,
        storeAccountId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
        ttlSeconds: config.SESSION_TTL_SECONDS,
      });

      return reply.status(201).send({ userId, storeAccountId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "Email or store slug already taken",
        });
      }
      throw err;
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  // Flow:
  //  1. Brute-force lockout check (Redis)
  //  2. Credential verification
  //  3. On failure: record failed attempt → possible lockout → log security event
  //  4. On success: clear failure counter
  //  5. If TOTP enrolled: return { totpRequired: true }; set userId + totpVerified=false
  //  6. If no TOTP: set totpVerified=true; check for suspicious IP; log success
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const ip = request.ip;
      const userAgent = request.headers["user-agent"];

      // ── 1. Lockout check ──────────────────────────────────────────────────
      const locked = await SecurityService.isLockedOut(app.redis, body.email);
      if (locked) {
        await SecurityService.recordSecurityEvent(app.db, {
          eventType: "login_lockout",
          ipAddress: ip,
          userAgent,
          metadata: { email: body.email },
        });
        return reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message:
            "Account temporarily locked due to too many failed login attempts. Try again later.",
        });
      }

      // ── 2. Credential check ───────────────────────────────────────────────
      const result = await AuthService.login(app.db, {
        email: body.email,
        password: body.password,
      });

      // ── 3. Failure path ───────────────────────────────────────────────────
      if (
        result.outcome === "invalid_credentials" ||
        result.outcome === "account_inactive"
      ) {
        const { locked: nowLocked } = await SecurityService.recordFailedAttempt(
          app.redis,
          body.email,
        );

        await SecurityService.recordSecurityEvent(app.db, {
          eventType: "login_fail",
          userId: result.outcome === "account_inactive" ? result.userId : undefined,
          ipAddress: ip,
          userAgent,
          metadata: { email: body.email, reason: result.outcome, lockedOut: nowLocked },
        });

        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid credentials",
        });
      }

      // ── 4. Clear failure counter on success ───────────────────────────────
      await SecurityService.clearFailedAttempts(app.redis, body.email);

      // ── 5. TOTP required ──────────────────────────────────────────────────
      if (result.outcome === "totp_required") {
        // Save userId so /auth/totp/verify can load the user.
        // totpVerified stays false — requireAuth blocks all /api/** until verified.
        request.session.userId = result.userId;
        request.session.totpVerified = false;

        return reply.status(200).send({ totpRequired: true });
      }

      // ── 6. Fully authenticated ────────────────────────────────────────────
      request.session.userId = result.userId;
      request.session.totpVerified = true;

      const storeAccountId = await resolveStoreAccountIdFromRequest(request);
      if (storeAccountId) {
        request.session.lastActiveStoreAccountId = storeAccountId;
        await AuthService.trackSession(app.db, {
          sessionId: request.session.sessionId,
          userId: result.userId,
          storeAccountId,
          ipAddress: ip,
          userAgent,
          ttlSeconds: config.SESSION_TTL_SECONDS,
        });
      }

      // Suspicious login detection (new IP for this user).
      const suspicious = await SecurityService.checkSuspiciousLogin(
        app.redis,
        result.userId,
        ip,
      );
      if (suspicious) {
        await SecurityService.recordSecurityEvent(app.db, {
          eventType: "suspicious_login",
          userId: result.userId,
          storeAccountId: storeAccountId ?? undefined,
          ipAddress: ip,
          userAgent,
        });
        if (result.email) {
          await SecurityService.sendSuspiciousLoginAlert(result.email, ip);
        }
      }

      await SecurityService.recordSecurityEvent(app.db, {
        eventType: "login_success",
        userId: result.userId,
        storeAccountId: storeAccountId ?? undefined,
        ipAddress: ip,
        userAgent,
      });

      return reply.status(200).send({ ok: true });
    },
  );

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post(
    "/auth/logout",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      await AuthService.revokeSession(app.db, request.session.sessionId);

      await SecurityService.recordSecurityEvent(app.db, {
        eventType: "session_revoked",
        userId: request.currentUser.id,
        ipAddress: request.ip,
      });

      await request.session.destroy();
      return reply.status(204).send();
    },
  );

  // ── Revoke all sessions ───────────────────────────────────────────────────
  app.post(
    "/auth/sessions/revoke-all",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.currentUser.id;
      const count = await SecurityService.revokeAllSessions(app.redis, userId);

      await SecurityService.recordSecurityEvent(app.db, {
        eventType: "session_revoked_all",
        userId,
        ipAddress: request.ip,
        metadata: { sessionsRevoked: count },
      });

      // Destroy the current session too.
      await request.session.destroy();
      return reply.send({ ok: true, sessionsRevoked: count });
    },
  );

  // ── Password reset request ────────────────────────────────────────────────
  app.post(
    "/auth/password-reset/request",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = passwordResetRequestSchema.parse(request.body);
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);

      if (storeAccountId) {
        await AuthService.requestPasswordReset(app.db, {
          email: body.email,
          storeAccountId,
        });

        await SecurityService.recordSecurityEvent(app.db, {
          eventType: "password_reset_request",
          storeAccountId,
          ipAddress: request.ip,
          metadata: { email: body.email },
        });
      }

      // Always 200 — never leak whether email exists or store resolved.
      return reply.status(200).send({ ok: true });
    },
  );

  // ── Password reset confirm ────────────────────────────────────────────────
  app.post("/auth/password-reset/confirm", async (request, reply) => {
    const body = passwordResetConfirmSchema.parse(request.body);
    const storeAccountId = await resolveStoreAccountIdFromRequest(request);

    if (!storeAccountId) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired token",
      });
    }

    const result = await AuthService.confirmPasswordReset(app.db, {
      token: body.token,
      newPassword: body.newPassword,
      storeAccountId,
    });

    if (!result.ok) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired token",
      });
    }

    await SecurityService.recordSecurityEvent(app.db, {
      eventType: "password_reset_success",
      userId: result.userId ?? undefined,
      storeAccountId,
      ipAddress: request.ip,
    });

    // Revoke all existing sessions after password reset.
    if (result.userId) {
      await SecurityService.revokeAllSessions(app.redis, result.userId);
    }

    return reply.status(200).send({ ok: true });
  });

  // ── Magic link request ────────────────────────────────────────────────────
  app.post(
    "/auth/magic-link/request",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = magicLinkRequestSchema.parse(request.body);
      const storeAccountId = await resolveStoreAccountIdFromRequest(request);

      if (storeAccountId) {
        await AuthService.requestMagicLink(app.db, {
          email: body.email,
          storeAccountId,
        });
      }

      return reply.status(200).send({ ok: true });
    },
  );

  // ── Magic link verify ─────────────────────────────────────────────────────
  app.get("/auth/magic-link/verify", async (request, reply) => {
    const token = (request.query as Record<string, string | undefined>)["token"];
    if (!token) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Token required",
      });
    }

    const storeAccountId = await resolveStoreAccountIdFromRequest(request);
    if (!storeAccountId) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired link",
      });
    }

    const result = await AuthService.verifyMagicLink(app.db, {
      token,
      storeAccountId,
    });

    if (!result) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired link",
      });
    }

    request.session.userId = result.userId;
    request.session.totpVerified = true;
    request.session.lastActiveStoreAccountId = storeAccountId;

    await AuthService.trackSession(app.db, {
      sessionId: request.session.sessionId,
      userId: result.userId,
      storeAccountId,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      ttlSeconds: config.SESSION_TTL_SECONDS,
    });

    await SecurityService.recordSecurityEvent(app.db, {
      eventType: "login_success",
      userId: result.userId,
      storeAccountId,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
      metadata: { method: "magic_link" },
    });

    return reply.status(200).send({ ok: true });
  });

  // ── Change password ───────────────────────────────────────────────────────
  app.post(
    "/auth/password/change",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
      const ok = await AuthService.changePassword(
        app.db,
        request.currentUser.id,
        currentPassword,
        newPassword,
      );
      if (!ok) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Current password incorrect",
        });
      }

      // Revoke all other sessions after password change.
      await SecurityService.revokeAllSessions(app.redis, request.currentUser.id);

      return reply.send({ ok: true });
    },
  );

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, email, totpEnabled, lastLoginAt } = request.currentUser;
    return reply.send({
      id,
      email,
      totpEnabled,
      lastLoginAt,
      isImpersonating: request.isImpersonating,
    });
  });

}
