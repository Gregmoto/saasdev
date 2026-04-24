import { z } from "zod";

export const createProviderSchema = z.object({
  type: z.enum(["stripe", "paypal", "swish", "klarna", "manual"]),
  name: z.string().min(1),
  isTestMode: z.boolean().default(false),
  config: z.object({
    secretKey: z.string().min(1),
    webhookSecret: z.string().min(1),
    publishableKey: z.string().optional(),
  }),
  publicConfig: z.record(z.unknown()).default({}),
  supportedCurrencies: z.array(z.string()).default(["SEK"]),
  sortOrder: z.number().int().default(0),
});

export const updateProviderSchema = createProviderSchema.partial();

export const createPaymentIntentSchema = z.object({
  checkoutSessionId: z.string().uuid(),
  providerId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
});

export const providerIdParamSchema = z.object({ id: z.string().uuid() });
