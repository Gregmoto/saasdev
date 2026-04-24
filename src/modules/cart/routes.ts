import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { checkoutSessions } from "../../db/schema/index.js";
import * as CartService from "./service.js";
import {
  addItemSchema,
  updateItemSchema,
  updateCartSchema,
  startCheckoutSchema,
  setAddressSchema,
  setShippingSchema,
  shippingMethodSchema,
  sessionIdParamSchema,
  itemIdParamSchema,
  shippingMethodIdParamSchema,
  shippingMethodQuerySchema,
  confirmCheckoutSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

/** Helper: resolve the active cart identifier from session */
function cartLookupOpts(request: Parameters<typeof requireAuth>[0], storeAccountId: string, shopId: string) {
  const userId = request.session.userId;
  const sessionId = request.session.sessionId as string | undefined;
  return {
    storeAccountId,
    shopId,
    ...(userId !== undefined ? { userId } : sessionId !== undefined ? { sessionId } : {}),
  };
}

export async function cartRoutes(app: FastifyInstance): Promise<void> {

  // ── Cart routes (/api/cart) ─────────────────────────────────────────────────

  // GET /api/cart — get or create cart for current session/user
  app.get(
    "/api/cart",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const shopId = request.currentShopId ?? request.storeAccount.id;
      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      const result = await CartService.getCartWithItems(
        app.db,
        cart.id,
        request.storeAccount.id,
      );

      return reply.send(result ?? { cart, items: [] });
    },
  );

  // POST /api/cart/items — add item
  app.post(
    "/api/cart/items",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = addItemSchema.parse(request.body);
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      const itemInput: Parameters<typeof CartService.addCartItem>[3] = {
        title: body.title,
        quantity: body.quantity,
        unitPriceCents: body.unitPriceCents,
      };
      if (body.variantId !== undefined) itemInput.variantId = body.variantId;
      if (body.productId !== undefined) itemInput.productId = body.productId;
      if (body.sku !== undefined) itemInput.sku = body.sku;
      if (body.variantTitle !== undefined) itemInput.variantTitle = body.variantTitle;
      if (body.metadata !== undefined) itemInput.metadata = body.metadata;

      const item = await CartService.addCartItem(
        app.db,
        cart.id,
        request.storeAccount.id,
        itemInput,
      );

      return reply.status(201).send(item);
    },
  );

  // PATCH /api/cart/items/:itemId — update quantity (0 = remove)
  app.patch(
    "/api/cart/items/:itemId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { itemId } = itemIdParamSchema.parse(request.params);
      const { quantity } = updateItemSchema.parse(request.body);
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      await CartService.updateCartItem(
        app.db,
        itemId,
        cart.id,
        request.storeAccount.id,
        { quantity },
      );

      return reply.status(204).send();
    },
  );

  // DELETE /api/cart/items/:itemId — remove item
  app.delete(
    "/api/cart/items/:itemId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { itemId } = itemIdParamSchema.parse(request.params);
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      await CartService.updateCartItem(
        app.db,
        itemId,
        cart.id,
        request.storeAccount.id,
        { quantity: 0 },
      );

      return reply.status(204).send();
    },
  );

  // PATCH /api/cart — update cart (coupon, notes)
  app.patch(
    "/api/cart",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = updateCartSchema.parse(request.body);
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      const updates: { couponCode?: string; notes?: string } = {};
      if (body.couponCode !== undefined) updates.couponCode = body.couponCode;
      if (body.notes !== undefined) updates.notes = body.notes;

      await CartService.updateCart(
        app.db,
        cart.id,
        request.storeAccount.id,
        updates,
      );

      const result = await CartService.getCartWithItems(
        app.db,
        cart.id,
        request.storeAccount.id,
      );

      return reply.send(result);
    },
  );

  // DELETE /api/cart — clear all items
  app.delete(
    "/api/cart",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      await CartService.clearCart(app.db, cart.id);

      return reply.status(204).send();
    },
  );

  // ── Checkout routes (/api/checkout) ────────────────────────────────────────

  // POST /api/checkout — start checkout from current cart
  app.post(
    "/api/checkout",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = startCheckoutSchema.parse(request.body);
      const shopId = request.currentShopId ?? request.storeAccount.id;

      const cart = await CartService.getOrCreateCart(
        app.db,
        cartLookupOpts(request, request.storeAccount.id, shopId),
      );

      const checkoutOpts: Parameters<typeof CartService.startCheckout>[1] = {
        storeAccountId: request.storeAccount.id,
        shopId,
        cartId: cart.id,
      };
      if (body.email !== undefined) checkoutOpts.email = body.email;

      const session = await CartService.startCheckout(app.db, checkoutOpts);
      return reply.status(201).send(session);
    },
  );

  // PATCH /api/checkout/:sessionId/address — set addresses → try to reserve inventory
  app.patch(
    "/api/checkout/:sessionId/address",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sessionId } = sessionIdParamSchema.parse(request.params);
      const body = setAddressSchema.parse(request.body);

      const billingAddress = body.sameAsShipping
        ? body.shippingAddress
        : (body.billingAddress ?? body.shippingAddress);

      const updated = await CartService.setCheckoutAddress(
        app.db,
        sessionId,
        request.storeAccount.id,
        {
          email: body.email,
          shippingAddress: body.shippingAddress as Record<string, unknown>,
          billingAddress: billingAddress as Record<string, unknown>,
        },
      );

      // Load cart items and attempt inventory reservation
      const cartResult = await CartService.getCartWithItems(
        app.db,
        updated.cartId,
        request.storeAccount.id,
      );

      if (cartResult) {
        await CartService.reserveInventory(app.db, {
          storeAccountId: request.storeAccount.id,
          shopId: request.currentShopId ?? request.storeAccount.id,
          checkoutSessionId: sessionId,
          cartItems: cartResult.items,
        });
      }

      // Re-fetch to get updated status after reserveInventory
      const [latestSession] = await app.db
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.id, sessionId))
        .limit(1);

      return reply.send(latestSession ?? updated);
    },
  );

  // PATCH /api/checkout/:sessionId/shipping — select shipping method
  app.patch(
    "/api/checkout/:sessionId/shipping",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sessionId } = sessionIdParamSchema.parse(request.params);
      const { shippingMethodId } = setShippingSchema.parse(request.body);

      const updated = await CartService.setCheckoutShipping(
        app.db,
        sessionId,
        request.storeAccount.id,
        shippingMethodId,
      );

      return reply.send(updated);
    },
  );

  // GET /api/checkout/:sessionId — get checkout session state
  app.get(
    "/api/checkout/:sessionId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sessionId } = sessionIdParamSchema.parse(request.params);

      const [session] = await app.db
        .select()
        .from(checkoutSessions)
        .where(
          and(
            eq(checkoutSessions.id, sessionId),
            eq(checkoutSessions.storeAccountId, request.storeAccount.id),
          ),
        )
        .limit(1);

      if (!session) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Checkout session not found",
        });
      }

      return reply.send(session);
    },
  );

  // POST /api/checkout/:sessionId/confirm — confirm checkout (create order)
  app.post(
    "/api/checkout/:sessionId/confirm",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sessionId } = sessionIdParamSchema.parse(request.params);
      const body = confirmCheckoutSchema.parse(request.body);

      const result = await CartService.confirmCheckout(
        app.db,
        sessionId,
        request.storeAccount.id,
        { paymentId: body.paymentId },
      );

      return reply.status(201).send(result);
    },
  );

  // POST /api/checkout/:sessionId/abandon — abandon and release reservations
  app.post(
    "/api/checkout/:sessionId/abandon",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { sessionId } = sessionIdParamSchema.parse(request.params);

      await CartService.abandonCheckout(app.db, sessionId);

      return reply.status(204).send();
    },
  );

  // ── Shipping method admin routes (/api/shipping-methods) ───────────────────

  // GET /api/shipping-methods
  app.get(
    "/api/shipping-methods",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = shippingMethodQuerySchema.parse(request.query);
      const shopId = query.shopId ?? request.currentShopId ?? undefined;

      const methods = await CartService.listShippingMethods(
        app.db,
        request.storeAccount.id,
        shopId,
      );

      return reply.send(methods);
    },
  );

  // POST /api/shipping-methods
  app.post(
    "/api/shipping-methods",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = shippingMethodSchema.parse(request.body);

      const data: Parameters<typeof CartService.createShippingMethod>[2] = {
        name: body.name,
        priceCents: body.priceCents,
      };

      if (body.carrier !== undefined) data.carrier = body.carrier;
      if (body.estimatedDays !== undefined) data.estimatedDays = body.estimatedDays;
      if (body.freeAboveCents !== undefined) data.freeAboveCents = body.freeAboveCents;
      if (body.isActive !== undefined) data.isActive = body.isActive;
      if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

      // Optionally scope to current shop
      if (request.currentShopId !== null) {
        data.shopId = request.currentShopId;
      }

      const method = await CartService.createShippingMethod(
        app.db,
        request.storeAccount.id,
        data,
      );

      return reply.status(201).send(method);
    },
  );

  // PATCH /api/shipping-methods/:id
  app.patch(
    "/api/shipping-methods/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = shippingMethodIdParamSchema.parse(request.params);
      const body = shippingMethodSchema.partial().parse(request.body);

      const updates: Parameters<typeof CartService.updateShippingMethod>[3] = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.carrier !== undefined) updates.carrier = body.carrier;
      if (body.estimatedDays !== undefined) updates.estimatedDays = body.estimatedDays;
      if (body.priceCents !== undefined) updates.priceCents = body.priceCents;
      if (body.freeAboveCents !== undefined) updates.freeAboveCents = body.freeAboveCents;
      if (body.isActive !== undefined) updates.isActive = body.isActive;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      await CartService.updateShippingMethod(
        app.db,
        id,
        request.storeAccount.id,
        updates,
      );

      return reply.status(204).send();
    },
  );

  // DELETE /api/shipping-methods/:id
  app.delete(
    "/api/shipping-methods/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = shippingMethodIdParamSchema.parse(request.params);

      await CartService.deleteShippingMethod(
        app.db,
        id,
        request.storeAccount.id,
      );

      return reply.status(204).send();
    },
  );
}
