import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as ShippingService from "./service.js";
import {
  zoneSchema,
  zoneCountrySchema,
  profileSchema,
  methodSchema,
  rateSchema,
  shopProfileSchema,
  clickCollectSchema,
  resolveRatesSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

export async function shippingRoutes(app: FastifyInstance): Promise<void> {

  // ── Zones ──────────────────────────────────────────────────────────────────

  // GET /api/shipping/zones
  app.get(
    "/api/shipping/zones",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const zones = await ShippingService.listZones(app.db, request.storeAccount.id);
      return reply.send(zones);
    },
  );

  // POST /api/shipping/zones
  app.post(
    "/api/shipping/zones",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = zoneSchema.parse(request.body);
      const zone = await ShippingService.createZone(app.db, request.storeAccount.id, {
        name: body.name,
        isDefault: body.isDefault,
        sortOrder: body.sortOrder,
      });
      return reply.status(201).send(zone);
    },
  );

  // PATCH /api/shipping/zones/:id
  app.patch(
    "/api/shipping/zones/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = zoneSchema.partial().parse(request.body);

      const updates: Parameters<typeof ShippingService.updateZone>[3] = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.isDefault !== undefined) updates.isDefault = body.isDefault;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      await ShippingService.updateZone(app.db, id, request.storeAccount.id, updates);
      return reply.status(204).send();
    },
  );

  // DELETE /api/shipping/zones/:id
  app.delete(
    "/api/shipping/zones/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await ShippingService.deleteZone(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // GET /api/shipping/zones/:id/countries
  app.get(
    "/api/shipping/zones/:id/countries",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const countries = await ShippingService.listZoneCountries(app.db, id);
      return reply.send(countries);
    },
  );

  // POST /api/shipping/zones/:id/countries
  app.post(
    "/api/shipping/zones/:id/countries",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = zoneCountrySchema.parse(request.body);
      const row = await ShippingService.addCountryToZone(
        app.db,
        id,
        request.storeAccount.id,
        body.countryCode,
      );
      return reply.status(201).send(row);
    },
  );

  // DELETE /api/shipping/zones/:id/countries/:code
  app.delete(
    "/api/shipping/zones/:id/countries/:code",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id, code } = request.params as { id: string; code: string };
      await ShippingService.removeCountryFromZone(app.db, id, code);
      return reply.status(204).send();
    },
  );

  // ── Profiles ───────────────────────────────────────────────────────────────

  // GET /api/shipping/profiles
  app.get(
    "/api/shipping/profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const profiles = await ShippingService.listProfiles(app.db, request.storeAccount.id);
      return reply.send(profiles);
    },
  );

  // POST /api/shipping/profiles
  app.post(
    "/api/shipping/profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = profileSchema.parse(request.body);
      const profile = await ShippingService.createProfile(app.db, request.storeAccount.id, {
        name: body.name,
        isDefault: body.isDefault,
      });
      return reply.status(201).send(profile);
    },
  );

  // PATCH /api/shipping/profiles/:id
  app.patch(
    "/api/shipping/profiles/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = profileSchema.partial().parse(request.body);

      const updates: Parameters<typeof ShippingService.updateProfile>[3] = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.isDefault !== undefined) updates.isDefault = body.isDefault;

      await ShippingService.updateProfile(app.db, id, request.storeAccount.id, updates);
      return reply.status(204).send();
    },
  );

  // DELETE /api/shipping/profiles/:id
  app.delete(
    "/api/shipping/profiles/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await ShippingService.deleteProfile(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // POST /api/shipping/profiles/:id/zones — add zone to profile
  app.post(
    "/api/shipping/profiles/:id/zones",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { zoneId } = (request.body as { zoneId: string });
      const row = await ShippingService.addZoneToProfile(app.db, id, zoneId);
      return reply.status(201).send(row);
    },
  );

  // DELETE /api/shipping/profiles/:id/zones/:zoneId
  app.delete(
    "/api/shipping/profiles/:id/zones/:zoneId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id, zoneId } = request.params as { id: string; zoneId: string };
      await ShippingService.removeZoneFromProfile(app.db, id, zoneId);
      return reply.status(204).send();
    },
  );

  // ── Shop overrides ─────────────────────────────────────────────────────────

  // GET /api/shipping/shop-profiles
  app.get(
    "/api/shipping/shop-profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const rows = await ShippingService.listShopProfiles(app.db, request.storeAccount.id);
      return reply.send(rows);
    },
  );

  // PUT /api/shipping/shop-profiles — upsert: { shopId, profileId }
  app.put(
    "/api/shipping/shop-profiles",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = shopProfileSchema.parse(request.body);
      await ShippingService.setShopProfile(
        app.db,
        request.storeAccount.id,
        body.shopId,
        body.profileId,
      );
      return reply.status(204).send();
    },
  );

  // ── Methods ────────────────────────────────────────────────────────────────

  // GET /api/shipping/methods?profileId=&zoneId=&activeOnly=true
  app.get(
    "/api/shipping/methods",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = request.query as { profileId?: string; zoneId?: string; activeOnly?: string };

      const opts: { profileId?: string; zoneId?: string; activeOnly?: boolean } = {};
      if (query.profileId !== undefined) opts.profileId = query.profileId;
      if (query.zoneId !== undefined) opts.zoneId = query.zoneId;
      if (query.activeOnly === "true") opts.activeOnly = true;

      const methods = await ShippingService.listMethods(app.db, request.storeAccount.id, opts);
      return reply.send(methods);
    },
  );

  // POST /api/shipping/methods
  app.post(
    "/api/shipping/methods",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = methodSchema.parse(request.body);
      const method = await ShippingService.createMethod(app.db, request.storeAccount.id, body);
      return reply.status(201).send(method);
    },
  );

  // PATCH /api/shipping/methods/:id
  app.patch(
    "/api/shipping/methods/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = methodSchema.partial().parse(request.body);

      const updates: Parameters<typeof ShippingService.updateMethod>[3] = {};
      if (body.profileId !== undefined) updates.profileId = body.profileId;
      if (body.zoneId !== undefined) updates.zoneId = body.zoneId;
      if (body.name !== undefined) updates.name = body.name;
      if (body.type !== undefined) updates.type = body.type;
      if (body.carrier !== undefined) updates.carrier = body.carrier;
      if (body.estimatedDaysMin !== undefined) updates.estimatedDaysMin = body.estimatedDaysMin;
      if (body.estimatedDaysMax !== undefined) updates.estimatedDaysMax = body.estimatedDaysMax;
      if (body.rateType !== undefined) updates.rateType = body.rateType;
      if (body.flatPriceCents !== undefined) updates.flatPriceCents = body.flatPriceCents;
      if (body.freeAboveCents !== undefined) updates.freeAboveCents = body.freeAboveCents;
      if (body.maxWeightGrams !== undefined) updates.maxWeightGrams = body.maxWeightGrams;
      if (body.isActive !== undefined) updates.isActive = body.isActive;
      if (body.requiresAddress !== undefined) updates.requiresAddress = body.requiresAddress;
      if (body.pickupLocationId !== undefined) updates.pickupLocationId = body.pickupLocationId;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      await ShippingService.updateMethod(app.db, id, request.storeAccount.id, updates);
      return reply.status(204).send();
    },
  );

  // DELETE /api/shipping/methods/:id
  app.delete(
    "/api/shipping/methods/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await ShippingService.deleteMethod(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // ── Rates ──────────────────────────────────────────────────────────────────

  // GET /api/shipping/methods/:methodId/rates
  app.get(
    "/api/shipping/methods/:methodId/rates",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { methodId } = request.params as { methodId: string };
      const rates = await ShippingService.listRates(app.db, methodId);
      return reply.send(rates);
    },
  );

  // POST /api/shipping/methods/:methodId/rates
  app.post(
    "/api/shipping/methods/:methodId/rates",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { methodId } = request.params as { methodId: string };
      const body = rateSchema.parse(request.body);
      const rate = await ShippingService.createRate(
        app.db,
        methodId,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(rate);
    },
  );

  // DELETE /api/shipping/methods/:methodId/rates/:rateId
  app.delete(
    "/api/shipping/methods/:methodId/rates/:rateId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { rateId } = request.params as { methodId: string; rateId: string };
      await ShippingService.deleteRate(app.db, rateId, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // ── Click & Collect locations ──────────────────────────────────────────────

  // GET /api/shipping/locations?shopId=
  app.get(
    "/api/shipping/locations",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = request.query as { shopId?: string };
      const locations = await ShippingService.listLocations(
        app.db,
        request.storeAccount.id,
        query.shopId,
      );
      return reply.send(locations);
    },
  );

  // POST /api/shipping/locations
  app.post(
    "/api/shipping/locations",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = clickCollectSchema.parse(request.body);
      const location = await ShippingService.createLocation(app.db, request.storeAccount.id, body);
      return reply.status(201).send(location);
    },
  );

  // PATCH /api/shipping/locations/:id
  app.patch(
    "/api/shipping/locations/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = clickCollectSchema.partial().parse(request.body);

      const updates: Parameters<typeof ShippingService.updateLocation>[3] = {};
      if (body.shopId !== undefined) updates.shopId = body.shopId;
      if (body.name !== undefined) updates.name = body.name;
      if (body.address !== undefined) updates.address = body.address;
      if (body.openingHours !== undefined) updates.openingHours = body.openingHours;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      await ShippingService.updateLocation(app.db, id, request.storeAccount.id, updates);
      return reply.status(204).send();
    },
  );

  // DELETE /api/shipping/locations/:id
  app.delete(
    "/api/shipping/locations/:id",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await ShippingService.deleteLocation(app.db, id, request.storeAccount.id);
      return reply.status(204).send();
    },
  );

  // ── Rate resolution ────────────────────────────────────────────────────────

  // POST /api/shipping/resolve
  app.post(
    "/api/shipping/resolve",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = resolveRatesSchema.parse(request.body);

      const resolveOpts: Parameters<typeof ShippingService.resolveShippingRates>[2] = {
        cartSubtotalCents: body.cartSubtotalCents,
        destinationCountry: body.destinationCountry,
      };
      if (body.totalWeightGrams !== undefined) resolveOpts.totalWeightGrams = body.totalWeightGrams;
      if (body.shopId !== undefined) resolveOpts.shopId = body.shopId;

      const options = await ShippingService.resolveShippingRates(
        app.db,
        request.storeAccount.id,
        resolveOpts,
      );

      return reply.send(options);
    },
  );
}
