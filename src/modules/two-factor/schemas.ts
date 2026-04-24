import { z } from "zod";

export const confirmTotpSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
});

export const disableTotpSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/),
});

export const verifyTotpSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
});

export const recoveryCodeSchema = z.object({
  code: z.string().length(10),
});

export const adminResetTotpSchema = z.object({
  targetUserId: z.string().uuid(),
});
