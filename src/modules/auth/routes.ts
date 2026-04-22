import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { resolveStoreAccountIdFromRequest } from "../../hooks/require-store-account.js";
import * as AuthService from "./service.js";
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  magicLinkRequestSchema,
  totpEnableSchema,
  totpDisableSchema,
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
      request.session.totpVerified = true;
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

  // ── Login ────────────────────────────────────────────────────────────────
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const result = await AuthService.login(app.db, {
        email: body.email,
        password: body.password,
        totpCode: body.totpCode,
      });

      if (
        result.outcome === "invalid_credentials" ||
        result.outcome === "account_inactive"
      ) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid credentials",
        });
      }

      if (result.outcome === "totp_required") {
        return reply.status(200).send({ totpRequired: true });
      }

      request.session.userId = result.userId;
      request.session.totpVerified = true;

      return reply.status(200).send({ ok: true });
    },
  );

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post(
    "/auth/logout",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      await AuthService.revokeSession(app.db, request.session.sessionId);
      await request.session.destroy();
      return reply.status(204).send();
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

    const ok = await AuthService.confirmPasswordReset(app.db, {
      token: body.token,
      newPassword: body.newPassword,
      storeAccountId,
    });

    if (!ok) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Invalid or expired token",
      });
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

    return reply.status(200).send({ ok: true });
  });

  // ── TOTP setup ────────────────────────────────────────────────────────────
  app.post(
    "/auth/totp/setup",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { secret, qrDataUrl } = await AuthService.initTotpSetup(
        app.db,
        request.currentUser.id,
        request.currentUser.email,
      );
      return reply.send({ secret, qrDataUrl });
    },
  );

  // ── TOTP enable ───────────────────────────────────────────────────────────
  app.post(
    "/auth/totp/enable",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { code } = totpEnableSchema.parse(request.body);
      const ok = await AuthService.enableTotp(app.db, request.currentUser.id, code);
      if (!ok) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid TOTP code",
        });
      }
      return reply.send({ ok: true });
    },
  );

  // ── TOTP disable ──────────────────────────────────────────────────────────
  app.post(
    "/auth/totp/disable",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { password, code } = totpDisableSchema.parse(request.body);
      const ok = await AuthService.disableTotp(
        app.db,
        request.currentUser.id,
        password,
        code,
      );
      if (!ok) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Invalid credentials or TOTP code",
        });
      }
      return reply.send({ ok: true });
    },
  );

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
      return reply.send({ ok: true });
    },
  );

  // ── GET /auth/me ──────────────────────────────────────────────────────────
  app.get("/auth/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, email, totpEnabled, lastLoginAt } = request.currentUser;
    return reply.send({ id, email, totpEnabled, lastLoginAt });
  });
}
