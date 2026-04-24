import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, "Password must be at least 12 characters"),
  storeName: z.string().min(2).max(255),
  storeSlug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
  mode: z.enum(["WEBSHOP", "MULTISHOP", "MARKETPLACE", "RESELLER_PANEL"]).default("WEBSHOP"),
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase alphanumeric with hyphens")
    .optional(),
});
