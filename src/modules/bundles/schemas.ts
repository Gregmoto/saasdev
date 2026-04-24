import { z } from "zod";

// ── Option groups ──────────────────────────────────────────────────────────────

export const createOptionGroupSchema = z.object({
  name: z.string().min(1).max(255),
  minSelect: z.number().int().min(0).default(1).optional(),
  maxSelect: z.number().int().min(1).default(1).optional(),
  isRequired: z.boolean().default(true).optional(),
  sortOrder: z.number().int().min(0).default(0).optional(),
});

export const updateOptionGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Components ─────────────────────────────────────────────────────────────────

export const addComponentSchema = z
  .object({
    componentProductId: z.string().uuid().optional(),
    componentVariantId: z.string().uuid().optional(),
    optionGroupId: z.string().uuid().optional(),
    quantity: z.number().int().min(1).default(1).optional(),
    sortOrder: z.number().int().min(0).default(0).optional(),
  })
  .refine((d) => d.componentProductId ?? d.componentVariantId, {
    message: "Either componentProductId or componentVariantId is required",
  });

export const updateComponentSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  optionGroupId: z.string().uuid().nullable().optional(),
});

// ── Params ─────────────────────────────────────────────────────────────────────

export const bundleProductParamSchema = z.object({
  bundleProductId: z.string().uuid(),
});

export const optionGroupParamSchema = z.object({
  bundleProductId: z.string().uuid(),
  groupId: z.string().uuid(),
});

export const componentParamSchema = z.object({
  bundleProductId: z.string().uuid(),
  componentId: z.string().uuid(),
});
