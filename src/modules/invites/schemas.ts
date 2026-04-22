import { z } from "zod";

const STORE_INVITABLE_ROLES = [
  "store_admin",
  "store_staff",
  "marketplace_owner",
  "vendor_admin",
  "vendor_staff",
  "reseller_admin",
] as const;

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(STORE_INVITABLE_ROLES),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

export const revokeInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

export const revokeMemberSchema = z.object({
  userId: z.string().uuid(),
});
