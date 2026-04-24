import { z } from "zod";

// ── Enum values mirroring the DB enum ─────────────────────────────────────────

const warehouseTypeValues = ["internal", "external"] as const;
const inventoryReasonValues = [
  "sale",
  "return",
  "adjustment",
  "incoming",
  "transfer_in",
  "transfer_out",
  "damage",
  "initial",
] as const;

// ── Address sub-schema ─────────────────────────────────────────────────────────

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

// ── Warehouses ─────────────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(warehouseTypeValues).default("internal").optional(),
  address: addressSchema.optional(),
  priority: z.number().int().min(0).default(0).optional(),
  isEnabledForCheckout: z.boolean().default(true).optional(),
  leadTimeDays: z.number().int().min(0).default(0).optional(),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(warehouseTypeValues).optional(),
  address: addressSchema.optional(),
  priority: z.number().int().min(0).optional(),
  isEnabledForCheckout: z.boolean().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const warehouseIdParamSchema = z.object({
  warehouseId: z.string().uuid(),
});

// ── Inventory level operations ────────────────────────────────────────────────

export const adjustInventorySchema = z.object({
  warehouseId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  delta: z.number().int().refine((n) => n !== 0, { message: "delta must be non-zero" }),
  reason: z.enum(inventoryReasonValues),
  variantId: z.string().uuid().optional(),
  referenceType: z.string().max(60).optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const setInventorySchema = z.object({
  warehouseId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  qtyAvailable: z.number().int().min(0),
  qtyReserved: z.number().int().min(0).default(0).optional(),
  qtyIncoming: z.number().int().min(0).default(0).optional(),
  variantId: z.string().uuid().optional(),
});

export const transferInventorySchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  qty: z.number().int().min(1),
  variantId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

// ── Query schemas ─────────────────────────────────────────────────────────────

export const inventoryQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  sku: z.string().optional(),
  variantId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const inventoryEventsQuerySchema = z.object({
  warehouseId: z.string().uuid().optional(),
  sku: z.string().optional(),
  reason: z.enum(inventoryReasonValues).optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const skuParamSchema = z.object({
  warehouseId: z.string().uuid(),
  sku: z.string(),
});

// ── Reservation schemas ───────────────────────────────────────────────────────

const allocationStrategyValues = ["priority", "lowest_lead_time", "manual"] as const;
const reservationStatusValues = ["pending", "committed", "released", "cancelled"] as const;
const commitTriggerValues = ["payment", "fulfillment"] as const;

export const allocateInventorySchema = z.object({
  orderId: z.string().uuid(),
  shopId: z.string().uuid().optional(),
  items: z.array(z.object({
    sku: z.string().min(1).max(100),
    qty: z.number().int().min(1),
    variantId: z.string().uuid().optional(),
  })).min(1),
  strategy: z.enum(allocationStrategyValues).default("priority").optional(),
  warehouseId: z.string().uuid().optional(), // required when strategy=manual
  expiresInMinutes: z.number().int().min(0).optional(), // 0 = no expiry
});

export const commitReservationSchema = z.object({
  orderId: z.string().uuid(),
});

export const releaseReservationOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export const reservationQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  status: z.enum(reservationStatusValues).optional(),
  warehouseId: z.string().uuid().optional(),
  sku: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reservationIdParamSchema = z.object({
  reservationId: z.string().uuid(),
});

export const updateInventoryConfigSchema = z.object({
  commitTrigger: z.enum(commitTriggerValues).optional(),
  allocationStrategy: z.enum(allocationStrategyValues).optional(),
  reservationTimeoutMinutes: z.number().int().min(0).max(10080).optional(),
  autoExpire: z.boolean().optional(),
});
