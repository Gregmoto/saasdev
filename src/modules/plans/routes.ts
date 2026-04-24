import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { requirePlatformAdmin } from "../../hooks/require-platform-admin.js";
import * as PlansService from "./service.js";
import { countProducts } from "../products/service.js";
import { countOrders } from "../orders/service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createPlanSchema,
  updatePlanSchema,
  assignPlanSchema,
  setFeatureFlagSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;
const platformPreHandler = [requireAuth, requirePlatformAdmin] as const;

export async function plansRoutes(app: FastifyInstance): Promise<void> {

  // ── Public plan catalog ───────────────────────────────────────────────────
  app.get("/api/public/plans", async (_request, reply) => {
    return reply.send(await PlansService.listPublicPlans(app.db));
  });

  // ── Store: current plan + limits ──────────────────────────────────────────
  app.get(
    "/api/store/plan",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const [plan, limits, features, flags] = await Promise.all([
        PlansService.getStorePlan(app.db, request.storeAccount.id),
        PlansService.getEffectiveLimits(app.db, request.storeAccount.id),
        PlansService.getEffectiveFeatures(app.db, request.storeAccount.id),
        PlansService.getFeatureFlags(app.db, request.storeAccount.id),
      ]);
      return reply.send({ plan, effectiveLimits: limits, features, featureFlags: flags });
    },
  );

  // ── Store: plan usage ─────────────────────────────────────────────────────
  app.get(
    "/api/plan-usage",
    { preHandler: [requireAuth, requireStoreAccountContext] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;
      const [planRow, limits, productCount, orderCount] = await Promise.all([
        PlansService.getStorePlan(app.db, storeId),
        PlansService.getEffectiveLimits(app.db, storeId),
        countProducts(app.db, storeId),
        countOrders(app.db, storeId),
      ]);

      const plan = planRow?.plan ?? null;

      function buildDimension(current: number, limit: number | null | undefined) {
        if (limit == null) {
          return { current, limit: null, pct: null, nearLimit: false, atLimit: false };
        }
        const pct = Math.round((current / limit) * 100);
        return {
          current,
          limit,
          pct,
          nearLimit: pct >= 80,
          atLimit: current >= limit,
        };
      }

      return reply.send({
        plan: plan
          ? { slug: plan.slug, name: plan.name, monthlyPriceCents: plan.monthlyPriceCents }
          : null,
        usage: {
          products: buildDimension(productCount, limits.maxProducts),
          orders: buildDimension(orderCount, limits.maxOrders),
        },
        upgradeUrl: "/admin/billing",
      });
    },
  );

  // ── Store: feature flags ──────────────────────────────────────────────────
  app.get(
    "/api/store/feature-flags",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const flags = await PlansService.getFeatureFlags(app.db, request.storeAccount.id);
      return reply.send(flags);
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Platform Admin: plan catalog CRUD
  // ─────────────────────────────────────────────────────────────────────────

  app.get(
    "/api/platform/plans",
    { preHandler: [...platformPreHandler] },
    async (_request, reply) => {
      return reply.send(await PlansService.listAllPlans(app.db));
    },
  );

  app.post(
    "/api/platform/plans",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const body = createPlanSchema.parse(request.body);
      const plan = await PlansService.createPlan(app.db, {
        slug: body.slug,
        name: body.name,
        limits: body.limits,
        features: body.features,
        ...(body.description !== undefined && { description: body.description }),
        ...(body.monthlyPriceCents !== undefined && { monthlyPriceCents: body.monthlyPriceCents }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      });

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "plan",
        entityId: plan.id,
        actorUserId: request.currentUser.id,
        afterState: { slug: plan.slug, name: plan.name },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(plan);
    },
  );

  app.patch(
    "/api/platform/plans/:planId",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { planId } = request.params as { planId: string };
      const body = updatePlanSchema.parse(request.body);

      const updated = await PlansService.updatePlan(app.db, planId, {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.monthlyPriceCents !== undefined && { monthlyPriceCents: body.monthlyPriceCents }),
        ...(body.limits !== undefined && { limits: body.limits }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      });

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "plan",
        entityId: planId,
        actorUserId: request.currentUser.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ── Platform Admin: assign plan to a store ────────────────────────────────
  app.post(
    "/api/platform/store-accounts/:id/plan",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = assignPlanSchema.parse(request.body);

      // Strip keys that are undefined before passing to the service (exactOptionalPropertyTypes).
      const overrides = body.limitOverrides
        ? (Object.fromEntries(
            Object.entries(body.limitOverrides).filter(([, v]) => v !== undefined),
          ) as Parameters<typeof PlansService.assignPlanToStore>[3])
        : undefined;

      await PlansService.assignPlanToStore(app.db, id, body.planId, overrides);

      await recordAuditEvent(app.db, {
        eventType: "plan_assign",
        actionType: "plan_assign",
        entityType: "store_account",
        entityId: id,
        actorUserId: request.currentUser.id,
        afterState: { planId: body.planId, limitOverrides: body.limitOverrides },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ ok: true });
    },
  );

  // ── Platform Admin: per-store limit overrides ─────────────────────────────
  app.patch(
    "/api/platform/store-accounts/:id/plan/limits",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { limitOverrides: Record<string, number | null> | null };

      await PlansService.updateStorePlanOverrides(
        app.db,
        id,
        body.limitOverrides as Parameters<typeof PlansService.updateStorePlanOverrides>[2],
      );

      await recordAuditEvent(app.db, {
        eventType: "limit_override",
        actionType: "limit_override",
        entityType: "store_account",
        entityId: id,
        actorUserId: request.currentUser.id,
        afterState: { limitOverrides: body.limitOverrides },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ ok: true });
    },
  );

  // ── Platform Admin: per-store feature flags ───────────────────────────────
  app.put(
    "/api/platform/store-accounts/:id/feature-flags",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = setFeatureFlagSchema.parse(request.body);

      await PlansService.setFeatureFlag(app.db, id, body.key, body.enabled);

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "feature_flag",
        actorUserId: request.currentUser.id,
        storeAccountId: id,
        afterState: { key: body.key, enabled: body.enabled },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ ok: true });
    },
  );

  app.delete(
    "/api/platform/store-accounts/:id/feature-flags/:key",
    { preHandler: [...platformPreHandler] },
    async (request, reply) => {
      const { id, key } = request.params as { id: string; key: string };
      const deleted = await PlansService.deleteFeatureFlag(app.db, id, key);
      if (!deleted) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Flag not found" });
      }
      return reply.status(204).send();
    },
  );
}
