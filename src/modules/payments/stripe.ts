import Stripe from "stripe";
import { decrypt } from "../../lib/encryption.js";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  publishableKey?: string;
}

export function getStripeClient(encryptedConfig: string): Stripe {
  const cfg = JSON.parse(decrypt(encryptedConfig)) as StripeConfig;
  return new Stripe(cfg.secretKey, { apiVersion: "2026-03-25.dahlia" });
}

export function getWebhookSecret(encryptedConfig: string): string {
  const cfg = JSON.parse(decrypt(encryptedConfig)) as StripeConfig;
  return cfg.webhookSecret;
}

export async function createPaymentIntent(
  stripe: Stripe,
  opts: {
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  },
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const intent = await stripe.paymentIntents.create(
    {
      amount: opts.amountCents,
      currency: opts.currency.toLowerCase(),
      metadata: opts.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: opts.idempotencyKey },
  );
  if (!intent.client_secret) throw new Error("Stripe did not return client_secret");
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

export function constructStripeEvent(
  stripe: Stripe,
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
