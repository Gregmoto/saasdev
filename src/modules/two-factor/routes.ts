import type { FastifyInstance } from "fastify";
import { requireAuth, requireAuthPartial } from "../../hooks/require-auth.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as TwoFactorService from "./service.js";
import * as SecurityService from "../security/service.js";
import {
  confirmTotpSchema,
  disableTotpSchema,
  verifyTotpSchema,
  recoveryCodeSchema,
  adminResetTotpSchema,
} from "./schemas.js";

export async function twoFactorRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/2fa/status ───────────────────────────────────────────────────
  // Returns whether the authenticated user has TOTP enabled.
  app.get(
    "/api/2fa/status",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const status = await TwoFactorService.getTotpStatus(
        app.db,
        request.currentUser.id,
      );
      return reply.send(status);
    },
  );

  // ── POST /api/2fa/setup ───────────────────────────────────────────────────
  // Step 1: generate a new TOTP secret and return QR code data URL.
  // enabledAt remains null until confirmed.
  app.post(
    "/api/2fa/setup",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { secret, qrDataUrl } = await TwoFactorService.initTotpSetup(
        app.db,
        request.currentUser.id,
        request.currentUser.email,
      );
      return reply.send({ secret, qrDataUrl });
    },
  );

  // ── POST /api/2fa/confirm ─────────────────────────────────────────────────
  // Step 2: confirm setup with a valid TOTP code.
  // Returns 10 single-use recovery codes. Show once — never stored in plaintext.
  app.post(
    "/api/2fa/confirm",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { code } = confirmTotpSchema.parse(request.body);
      const result = await TwoFactorService.confirmTotpSetup(
        app.db,
        request.currentUser.id,
        code,
      );

      if (!result) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid TOTP code or no pending setup found",
        });
      }

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "totp_enabled",
        actorUserId: request.currentUser.id,
        targetUserId: request.currentUser.id,
        ipAddress: request.ip,
      });

      return reply.send({ recoveryCodes: result.recoveryCodes });
    },
  );

  // ── POST /api/2fa/disable ─────────────────────────────────────────────────
  // Disables 2FA. Requires current password and a valid TOTP code.
  app.post(
    "/api/2fa/disable",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { password, code } = disableTotpSchema.parse(request.body);
      const ok = await TwoFactorService.disableTotp(
        app.db,
        request.currentUser.id,
        password,
        code,
      );

      if (!ok) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid password or TOTP code",
        });
      }

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "totp_disabled",
        actorUserId: request.currentUser.id,
        targetUserId: request.currentUser.id,
        ipAddress: request.ip,
      });

      return reply.send({ ok: true });
    },
  );

  // ── POST /auth/totp/verify ────────────────────────────────────────────────
  // Called after a password login when the server returns { totpRequired: true }.
  // Uses requireAuthPartial (not requireAuth) because totpVerified is still false.
  // On success sets session.totpVerified = true.
  app.post(
    "/auth/totp/verify",
    { preHandler: [requireAuthPartial] },
    async (request, reply) => {
      const { code } = verifyTotpSchema.parse(request.body);
      const userId = request.currentUser.id;

      const valid = await TwoFactorService.verifyTotp(app.db, userId, code);

      if (!valid) {
        await SecurityService.recordSecurityEvent(app.db, {
          eventType: "totp_fail",
          userId,
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid TOTP code",
        });
      }

      request.session.totpVerified = true;

      await SecurityService.recordSecurityEvent(app.db, {
        eventType: "totp_success",
        userId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ ok: true });
    },
  );

  // ── POST /auth/totp/recover ───────────────────────────────────────────────
  // Use a single-use recovery code instead of TOTP during login.
  // Also uses requireAuthPartial — called from the half-authenticated state.
  app.post(
    "/auth/totp/recover",
    {
      preHandler: [requireAuthPartial],
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const { code } = recoveryCodeSchema.parse(request.body);
      const userId = request.currentUser.id;

      const ok = await TwoFactorService.useRecoveryCode(app.db, userId, code);

      if (!ok) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid or already-used recovery code",
        });
      }

      request.session.totpVerified = true;

      await SecurityService.recordSecurityEvent(app.db, {
        eventType: "recovery_code_used",
        userId,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ ok: true });
    },
  );

  // ── POST /api/platform/users/:userId/2fa/reset ────────────────────────────
  // Platform Super Admin only — wipes a user's TOTP enrollment so they can
  // re-enroll. Logs to audit_log.
  app.post(
    "/api/platform/users/:userId/2fa/reset",
    { preHandler: [requireAuth, requirePlatformAdmin] },
    async (request, reply) => {
      const params = request.params as { userId: string };
      const { targetUserId } = adminResetTotpSchema.parse({ targetUserId: params.userId });

      await TwoFactorService.adminResetTotp(app.db, targetUserId);

      await SecurityService.recordAuditEvent(app.db, {
        eventType: "totp_admin_reset",
        actorUserId: request.currentUser.id,
        targetUserId,
        ipAddress: request.ip,
      });

      return reply.send({ ok: true });
    },
  );
}
