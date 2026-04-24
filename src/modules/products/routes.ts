import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { checkPlanLimit } from "../../hooks/check-plan-limit.js";
import { countProducts } from "./service.js";
import * as ProductsService from "./service.js";
import { recordAuditEvent } from "../security/service.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  bulkDeleteSchema,
  createVariantSchema,
  updateVariantSchema,
  productIdParamSchema,
  categoryIdParamSchema,
  variantParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  brandIdParamSchema,
} from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext];

export async function productsRoutes(app: FastifyInstance): Promise<void> {

  // ── Categories ──────────────────────────────────────────────────────────────

  app.get(
    "/api/products/categories",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const categories = await ProductsService.listCategories(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(categories);
    },
  );

  app.post(
    "/api/products/categories",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createCategorySchema.parse(request.body);
      const category = await ProductsService.createCategory(
        app.db,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "category",
        entityId: category.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { name: category.name, slug: category.slug },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(category);
    },
  );

  app.patch(
    "/api/products/categories/:categoryId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { categoryId } = categoryIdParamSchema.parse(request.params);
      const body = updateCategorySchema.parse(request.body);
      const category = await ProductsService.updateCategory(
        app.db,
        categoryId,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "category",
        entityId: categoryId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(category);
    },
  );

  app.delete(
    "/api/products/categories/:categoryId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { categoryId } = categoryIdParamSchema.parse(request.params);
      const deleted = await ProductsService.deleteCategory(
        app.db,
        categoryId,
        request.storeAccount.id,
      );

      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Category not found",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "category",
        entityId: categoryId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  // ── Products ────────────────────────────────────────────────────────────────

  app.get(
    "/api/products",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const opts = productQuerySchema.parse(request.query);
      // Merge explicit shopId query param with X-Shop-Id header context.
      // X-Shop-Id header (request.currentShopId) takes precedence unless the
      // caller explicitly passes shopId in the query string.
      const shopId = opts.shopId ?? request.currentShopId ?? undefined;
      const result = await ProductsService.listProducts(
        app.db,
        request.storeAccount.id,
        { ...opts, ...(shopId !== undefined && { shopId }) },
      );
      return reply.send(result);
    },
  );

  app.post(
    "/api/products",
    {
      preHandler: [
        requireAuth,
        requireStoreAccountContext,
        checkPlanLimit("maxProducts", (db, storeAccountId) =>
          countProducts(db, storeAccountId),
        ),
      ],
    },
    async (request, reply) => {
      const body = createProductSchema.parse(request.body);
      const product = await ProductsService.createProduct(
        app.db,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "product",
        entityId: product.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { name: product.name, slug: product.slug, status: product.status },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(product);
    },
  );

  app.get(
    "/api/products/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const product = await ProductsService.getProduct(
        app.db,
        productId,
        request.storeAccount.id,
      );

      if (!product) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Product not found",
        });
      }

      return reply.send(product);
    },
  );

  app.patch(
    "/api/products/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const body = updateProductSchema.parse(request.body);
      const product = await ProductsService.updateProduct(
        app.db,
        productId,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "product",
        entityId: productId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(product);
    },
  );

  app.delete(
    "/api/products/:productId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const deleted = await ProductsService.deleteProduct(
        app.db,
        productId,
        request.storeAccount.id,
      );

      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Product not found",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "product",
        entityId: productId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );

  app.post(
    "/api/products/bulk-delete",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { ids } = bulkDeleteSchema.parse(request.body);
      const deleted = await ProductsService.bulkDeleteProducts(
        app.db,
        request.storeAccount.id,
        ids,
      );
      return reply.send({ deleted });
    },
  );

  // ── Variants ────────────────────────────────────────────────────────────────

  app.get(
    "/api/products/:productId/variants",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const variants = await ProductsService.listVariants(
        app.db,
        productId,
        request.storeAccount.id,
      );
      return reply.send(variants);
    },
  );

  app.post(
    "/api/products/:productId/variants",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId } = productIdParamSchema.parse(request.params);
      const body = createVariantSchema.parse(request.body);
      const variant = await ProductsService.createVariant(
        app.db,
        productId,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(variant);
    },
  );

  app.patch(
    "/api/products/:productId/variants/:variantId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId, variantId } = variantParamsSchema.parse(request.params);
      const body = updateVariantSchema.parse(request.body);
      const variant = await ProductsService.updateVariant(
        app.db,
        variantId,
        productId,
        request.storeAccount.id,
        body,
      );
      return reply.send(variant);
    },
  );

  app.delete(
    "/api/products/:productId/variants/:variantId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { productId, variantId } = variantParamsSchema.parse(request.params);
      const deleted = await ProductsService.deleteVariant(
        app.db,
        variantId,
        productId,
        request.storeAccount.id,
      );

      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Variant not found",
        });
      }

      return reply.status(204).send();
    },
  );

  // ── Brands ──────────────────────────────────────────────────────────────────

  app.get(
    "/api/products/brands",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const brandList = await ProductsService.listBrands(
        app.db,
        request.storeAccount.id,
      );
      return reply.send(brandList);
    },
  );

  app.post(
    "/api/products/brands",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const body = createBrandSchema.parse(request.body);
      const brand = await ProductsService.createBrand(
        app.db,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "create",
        actionType: "create",
        entityType: "brand",
        entityId: brand.id,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: { name: brand.name, slug: brand.slug },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(brand);
    },
  );

  app.patch(
    "/api/products/brands/:brandId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { brandId } = brandIdParamSchema.parse(request.params);
      const body = updateBrandSchema.parse(request.body);
      const brand = await ProductsService.updateBrand(
        app.db,
        brandId,
        request.storeAccount.id,
        body,
      );

      await recordAuditEvent(app.db, {
        eventType: "update",
        actionType: "update",
        entityType: "brand",
        entityId: brandId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        afterState: body as Record<string, unknown>,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(brand);
    },
  );

  app.delete(
    "/api/products/brands/:brandId",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const { brandId } = brandIdParamSchema.parse(request.params);
      const deleted = await ProductsService.deleteBrand(
        app.db,
        brandId,
        request.storeAccount.id,
      );

      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Brand not found",
        });
      }

      await recordAuditEvent(app.db, {
        eventType: "delete",
        actionType: "delete",
        entityType: "brand",
        entityId: brandId,
        actorUserId: request.currentUser.id,
        storeAccountId: request.storeAccount.id,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(204).send();
    },
  );
}
