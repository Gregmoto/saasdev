import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as BundleService from "./service.js";
import {
  createOptionGroupSchema,
  updateOptionGroupSchema,
  addComponentSchema,
  updateComponentSchema,
  bundleProductParamSchema,
  optionGroupParamSchema,
  componentParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function bundleRoutes(app: FastifyInstance): Promise<void> {
  // ── Bundle details ──────────────────────────────────────────────────────────

  app.get(
    "/api/bundles/:bundleProductId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId } = bundleProductParamSchema.parse(request.params);
      const result = await BundleService.getBundleDetails(
        app.db,
        bundleProductId,
        request.storeAccount.id,
      );
      if (!result) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Bundle product not found",
        });
      }
      return reply.send(result);
    },
  );

  // ── Bundle stock ────────────────────────────────────────────────────────────

  app.get(
    "/api/bundles/:bundleProductId/stock",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId } = bundleProductParamSchema.parse(request.params);
      const stock = await BundleService.computeBundleStock(
        app.db,
        bundleProductId,
        request.storeAccount.id,
      );
      return reply.send(stock);
    },
  );

  // ── Option groups ───────────────────────────────────────────────────────────

  app.post(
    "/api/bundles/:bundleProductId/groups",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId } = bundleProductParamSchema.parse(request.params);
      const body = createOptionGroupSchema.parse(request.body);

      const values: {
        name: string;
        minSelect?: number;
        maxSelect?: number;
        isRequired?: boolean;
        sortOrder?: number;
      } = { name: body.name };

      if (body.minSelect !== undefined) values.minSelect = body.minSelect;
      if (body.maxSelect !== undefined) values.maxSelect = body.maxSelect;
      if (body.isRequired !== undefined) values.isRequired = body.isRequired;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;

      const group = await BundleService.createOptionGroup(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        values,
      );
      return reply.status(201).send(group);
    },
  );

  app.patch(
    "/api/bundles/:bundleProductId/groups/:groupId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId, groupId } = optionGroupParamSchema.parse(request.params);
      const body = updateOptionGroupSchema.parse(request.body);

      const values: {
        name?: string;
        minSelect?: number;
        maxSelect?: number;
        isRequired?: boolean;
        sortOrder?: number;
      } = {};

      if (body.name !== undefined) values.name = body.name;
      if (body.minSelect !== undefined) values.minSelect = body.minSelect;
      if (body.maxSelect !== undefined) values.maxSelect = body.maxSelect;
      if (body.isRequired !== undefined) values.isRequired = body.isRequired;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;

      const group = await BundleService.updateOptionGroup(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        groupId,
        values,
      );
      return reply.send(group);
    },
  );

  app.delete(
    "/api/bundles/:bundleProductId/groups/:groupId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId, groupId } = optionGroupParamSchema.parse(request.params);
      const deleted = await BundleService.deleteOptionGroup(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        groupId,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Option group not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Components ──────────────────────────────────────────────────────────────

  app.post(
    "/api/bundles/:bundleProductId/components",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId } = bundleProductParamSchema.parse(request.params);
      const body = addComponentSchema.parse(request.body);

      const values: {
        componentProductId?: string;
        componentVariantId?: string;
        optionGroupId?: string;
        quantity?: number;
        sortOrder?: number;
      } = {};

      if (body.componentProductId !== undefined) values.componentProductId = body.componentProductId;
      if (body.componentVariantId !== undefined) values.componentVariantId = body.componentVariantId;
      if (body.optionGroupId !== undefined) values.optionGroupId = body.optionGroupId;
      if (body.quantity !== undefined) values.quantity = body.quantity;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;

      const component = await BundleService.addComponent(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        values,
      );
      return reply.status(201).send(component);
    },
  );

  app.patch(
    "/api/bundles/:bundleProductId/components/:componentId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId, componentId } = componentParamSchema.parse(request.params);
      const body = updateComponentSchema.parse(request.body);

      const values: {
        quantity?: number;
        sortOrder?: number;
        optionGroupId?: string | null;
      } = {};

      if (body.quantity !== undefined) values.quantity = body.quantity;
      if (body.sortOrder !== undefined) values.sortOrder = body.sortOrder;
      if ("optionGroupId" in body) values.optionGroupId = body.optionGroupId ?? null;

      const component = await BundleService.updateComponent(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        componentId,
        values,
      );
      return reply.send(component);
    },
  );

  app.delete(
    "/api/bundles/:bundleProductId/components/:componentId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { bundleProductId, componentId } = componentParamSchema.parse(request.params);
      const deleted = await BundleService.removeComponent(
        app.db,
        bundleProductId,
        request.storeAccount.id,
        componentId,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Component not found",
        });
      }
      return reply.status(204).send();
    },
  );
}
