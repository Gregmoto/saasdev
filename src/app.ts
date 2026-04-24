import Fastify, { type FastifyServerOptions } from "fastify";
import fastifySensible from "@fastify/sensible";
import { config } from "./config.js";

import dbPlugin from "./plugins/db.js";
import redisPlugin from "./plugins/redis.js";
import sessionPlugin from "./plugins/session.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import routeGuardPlugin from "./plugins/route-guard.js";
import supplierQueuePlugin from "./plugins/supplier-queue.js";
import importQueuePlugin from "./plugins/import-queue.js";

import authModule from "./modules/auth/index.js";
import storeAccountsModule from "./modules/store-accounts/index.js";
import portalModule from "./modules/portal/index.js";
import invitesModule from "./modules/invites/index.js";
import twoFactorModule from "./modules/two-factor/index.js";
import impersonationModule from "./modules/impersonation/index.js";
import platformAdminModule from "./modules/platform-admin/index.js";
import onboardingModule from "./modules/onboarding/index.js";
import domainsModule from "./modules/domains/index.js";
import plansModule from "./modules/plans/index.js";
import integrationsModule from "./modules/integrations/index.js";
import shopsModule from "./modules/shops/index.js";
import inventoryModule from "./modules/inventory/index.js";
import productsModule from "./modules/products/index.js";
import ordersModule from "./modules/orders/index.js";
import customersModule from "./modules/customers/index.js";
import contentModule from "./modules/content/index.js";
import supportModule from "./modules/support/index.js";
import reviewsModule from "./modules/reviews/index.js";
import reportsModule from "./modules/reports/index.js";
import bundlesModule from "./modules/bundles/index.js";
import suppliersModule from "./modules/suppliers/index.js";
import importCenterModule from "./modules/import-center/index.js";
import csvImportModule from "./modules/csv-import/index.js";
import cartModule from "./modules/cart/index.js";
import { healthRoutes } from "./modules/health/routes.js";
import paymentsModule from "./modules/payments/index.js";
import taxModule from "./modules/tax/index.js";
import shippingModule from "./modules/shipping/index.js";
import fulfillmentModule from "./modules/fulfillments/index.js";
import refundsModule from "./modules/refunds/index.js";
import ticketsModule from "./modules/tickets/index.js";
import chatModule from "./modules/chat/index.js";
import rmaModule from "./modules/rma/index.js";
import marketplaceModule from "./modules/marketplace/index.js";
import affiliatesModule from "./modules/affiliates/index.js";
import b2bModule from "./modules/b2b/index.js";
import marketingCmsModule from "./modules/marketing-cms/index.js";
import leadsModule from "./modules/leads/index.js";
import statusModule from "./modules/status/index.js";
import analyticsModule from "./modules/analytics/index.js";
import storeFaqsModule from "./modules/store-faqs/index.js";
import jobsModule from "./modules/jobs/index.js";
import seoModule from "./modules/seo/index.js";
import mediaModule from "./modules/media/index.js";
import launchModule from "./modules/launch/index.js";
import cacheModule from "./modules/cache/index.js";
import securityModule from "./modules/security/index.js";
import demoModule from "./modules/demo/index.js";

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
  // supplierQueuePlugin depends on dbPlugin and redisPlugin; must come before route modules.
  app.register(supplierQueuePlugin);
  // importQueuePlugin likewise depends on dbPlugin and redisPlugin.
  app.register(importQueuePlugin);

  app.register(healthRoutes);
  app.register(authModule);
  app.register(portalModule);
  app.register(invitesModule);
  app.register(twoFactorModule);
  app.register(impersonationModule);
  app.register(storeAccountsModule);
  app.register(platformAdminModule);
  app.register(onboardingModule);
  app.register(domainsModule);
  app.register(plansModule);
  app.register(integrationsModule);
  app.register(shopsModule);
  app.register(inventoryModule);
  app.register(productsModule);
  app.register(ordersModule);
  app.register(customersModule);
  app.register(contentModule);
  app.register(supportModule);
  app.register(reviewsModule);
  app.register(reportsModule);
  app.register(bundlesModule);
  app.register(suppliersModule);
  app.register(importCenterModule);
  app.register(csvImportModule);
  app.register(cartModule);
  app.register(paymentsModule);
  app.register(taxModule);
  app.register(shippingModule);
  app.register(fulfillmentModule);
  app.register(refundsModule);
  app.register(ticketsModule);
  app.register(chatModule);
  app.register(rmaModule);
  app.register(marketplaceModule);
  app.register(affiliatesModule);
  app.register(b2bModule);
  app.register(marketingCmsModule);
  app.register(leadsModule);
  app.register(statusModule);
  app.register(analyticsModule);
  app.register(storeFaqsModule);
  app.register(jobsModule);
  app.register(seoModule);
  app.register(mediaModule);
  app.register(launchModule);
  app.register(cacheModule);
  app.register(securityModule);
  // Demo read-only guard — must be registered after session/auth plugins.
  app.register(demoModule);

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
