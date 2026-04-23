import Fastify, { type FastifyServerOptions } from "fastify";
import fastifySensible from "@fastify/sensible";
import { config } from "./config.js";

import dbPlugin from "./plugins/db.js";
import redisPlugin from "./plugins/redis.js";
import sessionPlugin from "./plugins/session.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import routeGuardPlugin from "./plugins/route-guard.js";

import authModule from "./modules/auth/index.js";
import storeAccountsModule from "./modules/store-accounts/index.js";
import portalModule from "./modules/portal/index.js";
import invitesModule from "./modules/invites/index.js";
import twoFactorModule from "./modules/two-factor/index.js";
import impersonationModule from "./modules/impersonation/index.js";
import { healthRoutes } from "./modules/health/routes.js";

export function buildApp() {
  const loggerOpts: FastifyServerOptions["logger"] =
    config.NODE_ENV === "development"
      ? { level: "info", transport: { target: "pino-pretty", options: { colorize: true } } }
      : { level: config.NODE_ENV === "test" ? "silent" : "info" };

  const app = Fastify({
    logger: loggerOpts,
    trustProxy: true,
    ajv: { customOptions: { strict: false } },
  });

  app.register(fastifySensible);
  app.register(dbPlugin);
  app.register(redisPlugin);
  app.register(sessionPlugin); // depends on redisPlugin
  app.register(rateLimitPlugin);
  // routeGuardPlugin must be registered before any route modules so its
  // onRoute hook is active when those modules register their routes.
  app.register(routeGuardPlugin);

  app.register(healthRoutes);
  app.register(authModule);
  app.register(portalModule);
  app.register(invitesModule);
  app.register(twoFactorModule);
  app.register(impersonationModule);
  app.register(storeAccountsModule);

  app.setErrorHandler((error, _request, reply) => {
    if (error.name === "ZodError") {
      return reply.status(422).send({
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Validation error",
        issues: (error as unknown as { issues: unknown }).issues,
      });
    }
    app.log.error(error);
    return reply.status(error.statusCode ?? 500).send({
      statusCode: error.statusCode ?? 500,
      error: error.name,
      message: error.message,
    });
  });

  return app;
}
