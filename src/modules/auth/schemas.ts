import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  storeName: z.string().min(2).max(255),
  storeSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6),
});

export const totpEnableSchema = z.object({
  code: z.string().length(6),
});

export const totpDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});
