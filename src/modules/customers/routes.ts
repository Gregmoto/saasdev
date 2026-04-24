import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { checkPlanLimit } from "../../hooks/check-plan-limit.js";
import * as CustomersService from "./service.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  customerIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
  mergeCustomersSchema,
  shopCustomerQuerySchema,
  customerShopParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function customersRoutes(app: FastifyInstance): Promise<void> {

  // ── List customers ──────────────────────────────────────────────────────────
  app.get(
    "/api/customers",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const opts = customerQuerySchema.parse(request.query);
      const shopId = opts.shopId ?? request.currentShopId ?? undefined;
      const result = await CustomersService.listCustomers(
        app.db,
        request.storeAccount.id,
        { ...opts, ...(shopId !== undefined && { shopId }) },
      );
      return reply.send(result);
    },
  );

  // ── Create customer ─────────────────────────────────────────────────────────
  app.post(
    "/api/customers",
    {
      preHandler: [
        ...storePreHandler,
        checkPlanLimit("maxUsers", (db, storeId) =>
          CustomersService.countCustomers(db, storeId),
        ),
      ],
    },
    async (request, reply) => {
      const body = createCustomerSchema.parse(request.body);
      const customer = await CustomersService.createCustomer(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(customer);
    },
  );

  // ── Merge customers (before /:customerId to avoid route conflict) ───────────
  app.post(
    "/api/customers/merge",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sourceId, targetId } = mergeCustomersSchema.parse(request.body);

      const [source, target] = await Promise.all([
        CustomersService.getCustomer(app.db, sourceId, request.storeAccount.id),
        CustomersService.getCustomer(app.db, targetId, request.storeAccount.id),
      ]);

      if (!source) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Source customer not found",
        });
      }
      if (!target) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Target customer not found",
        });
      }

      await CustomersService.mergeCustomers(
        app.db,
        request.storeAccount.id,
        sourceId,
        targetId,
      );
      return reply.send({ ok: true, targetId });
    },
  );

  // ── Get customer ────────────────────────────────────────────────────────────
  app.get(
    "/api/customers/:customerId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const customer = await CustomersService.getCustomer(
        app.db,
        customerId,
        request.storeAccount.id,
      );
      if (!customer) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Customer not found",
        });
      }
      return reply.send(customer);
    },
  );

  // ── Update customer ─────────────────────────────────────────────────────────
  app.patch(
    "/api/customers/:customerId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const body = updateCustomerSchema.parse(request.body);
      const updated = await CustomersService.updateCustomer(
        app.db,
        customerId,
        request.storeAccount.id,
        body,
      );
      return reply.send(updated);
    },
  );

  // ── Delete customer (soft) ──────────────────────────────────────────────────
  app.delete(
    "/api/customers/:customerId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const deleted = await CustomersService.deleteCustomer(
        app.db,
        customerId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Customer not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── List addresses ──────────────────────────────────────────────────────────
  app.get(
    "/api/customers/:customerId/addresses",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const addresses = await CustomersService.listAddresses(
        app.db,
        customerId,
        request.storeAccount.id,
      );
      return reply.send(addresses);
    },
  );

  // ── Create address ──────────────────────────────────────────────────────────
  app.post(
    "/api/customers/:customerId/addresses",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const body = createAddressSchema.parse(request.body);
      const address = await CustomersService.createAddress(
        app.db,
        customerId,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(address);
    },
  );

  // ── Update address ──────────────────────────────────────────────────────────
  app.patch(
    "/api/customers/:customerId/addresses/:addressId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const { addressId } = (request.params as { addressId: string });
      const body = updateAddressSchema.parse(request.body);
      const updated = await CustomersService.updateAddress(
        app.db,
        addressId,
        customerId,
        request.storeAccount.id,
        body,
      );
      return reply.send(updated);
    },
  );

  // ── Delete address ──────────────────────────────────────────────────────────
  app.delete(
    "/api/customers/:customerId/addresses/:addressId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerIdParamSchema.parse(request.params);
      const { addressId } = (request.params as { addressId: string });
      const deleted = await CustomersService.deleteAddress(
        app.db,
        addressId,
        customerId,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Address not found",
        });
      }
      return reply.status(204).send();
    },
  );

  // ── Customer shops — shops this customer has ordered from ───────────────────
  app.get(
    "/api/customers/:customerId/shops",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { customerId } = customerShopParamSchema.parse(request.params);
      const shops = await CustomersService.getCustomerShops(
        app.db,
        customerId,
        request.storeAccount.id,
      );
      return reply.send(shops);
    },
  );

  // ── Shop customer stats — aggregate analytics for a shop's customers ────────
  app.get(
    "/api/shops/:shopId/customers/stats",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { shopId } = (request.params as { shopId: string });
      const stats = await CustomersService.getShopCustomerStats(
        app.db,
        shopId,
        request.storeAccount.id,
      );
      return reply.send(stats);
    },
  );

  // ── Shop top customers — top spenders in a shop ─────────────────────────────
  app.get(
    "/api/shops/:shopId/customers/top",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { shopId } = (request.params as { shopId: string });
      const { limit } = shopCustomerQuerySchema.omit({ shopId: true }).parse(request.query);
      const top = await CustomersService.getTopCustomersByShop(
        app.db,
        shopId,
        request.storeAccount.id,
        limit,
      );
      return reply.send(top);
    },
  );
}
