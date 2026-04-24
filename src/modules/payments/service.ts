import type { Db } from "../../db/client.js";
import {
  paymentProviders,
  payments,
  webhookEvents,
  checkoutSessions,
  orders,
} from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../../lib/encryption.js";
import {
  getStripeClient,
  getWebhookSecret,
  createPaymentIntent,
  constructStripeEvent,
} from "./stripe.js";
import type { StripeConfig } from "./stripe.js";

// ── Provider CRUD ─────────────────────────────────────────────────────────────

export async function listProviders(db: Db, storeAccountId: string) {
  return db
    .select({
      id: paymentProviders.id,
      storeAccountId: paymentProviders.storeAccountId,
      type: paymentProviders.type,
      name: paymentProviders.name,
      isActive: paymentProviders.isActive,
      isTestMode: paymentProviders.isTestMode,
      publicConfig: paymentProviders.publicConfig,
      supportedCurrencies: paymentProviders.supportedCurrencies,
      sortOrder: paymentProviders.sortOrder,
      createdAt: paymentProviders.createdAt,
      updatedAt: paymentProviders.updatedAt,
    })
    .from(paymentProviders)
    .where(eq(paymentProviders.storeAccountId, storeAccountId));
}

export async function getProvider(db: Db, id: string, storeAccountId: string) {
  const [row] = await db
    .select({
      id: paymentProviders.id,
      storeAccountId: paymentProviders.storeAccountId,
      type: paymentProviders.type,
      name: paymentProviders.name,
      isActive: paymentProviders.isActive,
      isTestMode: paymentProviders.isTestMode,
      publicConfig: paymentProviders.publicConfig,
      supportedCurrencies: paymentProviders.supportedCurrencies,
      sortOrder: paymentProviders.sortOrder,
      createdAt: paymentProviders.createdAt,
      updatedAt: paymentProviders.updatedAt,
    })
    .from(paymentProviders)
    .where(and(eq(paymentProviders.id, id), eq(paymentProviders.storeAccountId, storeAccountId)))
    .limit(1);
  return row ?? null;
}

export async function createProvider(
  db: Db,
  storeAccountId: string,
  data: {
    type: "stripe" | "paypal" | "swish" | "klarna" | "manual";
    name: string;
    isTestMode: boolean;
    config: Record<string, unknown>;
    publicConfig: Record<string, unknown>;
    supportedCurrencies: string[];
    sortOrder: number;
  },
) {
  const encryptedConfig = encrypt(JSON.stringify(data.config));

  const [row] = await db
    .insert(paymentProviders)
    .values({
      storeAccountId,
      type: data.type,
      name: data.name,
      isTestMode: data.isTestMode,
      encryptedConfig,
      publicConfig: data.publicConfig,
      supportedCurrencies: data.supportedCurrencies,
      sortOrder: data.sortOrder,
    })
    .returning({
      id: paymentProviders.id,
      storeAccountId: paymentProviders.storeAccountId,
      type: paymentProviders.type,
      name: paymentProviders.name,
      isActive: paymentProviders.isActive,
      isTestMode: paymentProviders.isTestMode,
      publicConfig: paymentProviders.publicConfig,
      supportedCurrencies: paymentProviders.supportedCurrencies,
      sortOrder: paymentProviders.sortOrder,
      createdAt: paymentProviders.createdAt,
      updatedAt: paymentProviders.updatedAt,
    });

  return row!;
}

export async function updateProvider(
  db: Db,
  id: string,
  storeAccountId: string,
  data: Partial<{
    type: "stripe" | "paypal" | "swish" | "klarna" | "manual";
    name: string;
    isTestMode: boolean;
    config: Record<string, unknown>;
    publicConfig: Record<string, unknown>;
    supportedCurrencies: string[];
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  const values: Partial<typeof paymentProviders.$inferInsert> = {};

  if (data.type !== undefined) values.type = data.type;
  if (data.name !== undefined) values.name = data.name;
  if (data.isTestMode !== undefined) values.isTestMode = data.isTestMode;
  if (data.isActive !== undefined) values.isActive = data.isActive;
  if (data.publicConfig !== undefined) values.publicConfig = data.publicConfig;
  if (data.supportedCurrencies !== undefined) values.supportedCurrencies = data.supportedCurrencies;
  if (data.sortOrder !== undefined) values.sortOrder = data.sortOrder;
  if (data.config !== undefined) values.encryptedConfig = encrypt(JSON.stringify(data.config));

  values.updatedAt = new Date();

  const [row] = await db
    .update(paymentProviders)
    .set(values)
    .where(and(eq(paymentProviders.id, id), eq(paymentProviders.storeAccountId, storeAccountId)))
    .returning({
      id: paymentProviders.id,
      storeAccountId: paymentProviders.storeAccountId,
      type: paymentProviders.type,
      name: paymentProviders.name,
      isActive: paymentProviders.isActive,
      isTestMode: paymentProviders.isTestMode,
      publicConfig: paymentProviders.publicConfig,
      supportedCurrencies: paymentProviders.supportedCurrencies,
      sortOrder: paymentProviders.sortOrder,
      createdAt: paymentProviders.createdAt,
      updatedAt: paymentProviders.updatedAt,
    });

  return row ?? null;
}

export async function deleteProvider(db: Db, id: string, storeAccountId: string) {
  const [row] = await db
    .delete(paymentProviders)
    .where(and(eq(paymentProviders.id, id), eq(paymentProviders.storeAccountId, storeAccountId)))
    .returning({ id: paymentProviders.id });
  return row ?? null;
}

// ── Payment intents ───────────────────────────────────────────────────────────

export async function initiateStripePayment(
  db: Db,
  opts: {
    storeAccountId: string;
    shopId?: string;
    checkoutSessionId: string;
    providerId: string;
    idempotencyKey: string;
  },
): Promise<{ clientSecret: string; paymentId: string }> {
  // 1. Load provider, validate it's a stripe provider
  const [provider] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.id, opts.providerId),
        eq(paymentProviders.storeAccountId, opts.storeAccountId),
        eq(paymentProviders.isActive, true),
      ),
    )
    .limit(1);

  if (!provider) {
    throw Object.assign(new Error("Payment provider not found"), { statusCode: 404 });
  }
  if (provider.type !== "stripe") {
    throw Object.assign(new Error("Provider is not a Stripe provider"), { statusCode: 400 });
  }

  // 2. Load checkoutSession, get totalCents and currency
  const [session] = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, opts.checkoutSessionId),
        eq(checkoutSessions.storeAccountId, opts.storeAccountId),
      ),
    )
    .limit(1);

  if (!session) {
    throw Object.assign(new Error("Checkout session not found"), { statusCode: 404 });
  }

  // 3. Create Stripe PaymentIntent
  const stripe = getStripeClient(provider.encryptedConfig);
  const metadata: Record<string, string> = {
    checkoutSessionId: opts.checkoutSessionId,
    storeAccountId: opts.storeAccountId,
  };
  if (opts.shopId !== undefined) {
    metadata["shopId"] = opts.shopId;
  }

  const { clientSecret, paymentIntentId } = await createPaymentIntent(stripe, {
    amountCents: session.totalCents,
    currency: session.currency,
    idempotencyKey: opts.idempotencyKey,
    metadata,
  });

  // 4. Insert into payments table
  const insertValues: typeof payments.$inferInsert = {
    storeAccountId: opts.storeAccountId,
    checkoutSessionId: opts.checkoutSessionId,
    providerId: opts.providerId,
    providerType: "stripe",
    externalId: paymentIntentId,
    status: "pending",
    amountCents: session.totalCents,
    currency: session.currency,
    idempotencyKey: opts.idempotencyKey,
  };
  if (opts.shopId !== undefined) insertValues.shopId = opts.shopId;
  if (session.orderId !== null) insertValues.orderId = session.orderId;

  const [payment] = await db.insert(payments).values(insertValues).returning({ id: payments.id });

  return { clientSecret, paymentId: payment!.id };
}

// ── Webhook processing ────────────────────────────────────────────────────────

export async function processStripeWebhook(
  db: Db,
  opts: {
    storeAccountId: string;
    providerId: string;
    rawBody: Buffer;
    signature: string;
  },
): Promise<{ processed: boolean; eventType: string }> {
  // 1. Load provider, get webhookSecret
  const [provider] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.id, opts.providerId),
        eq(paymentProviders.storeAccountId, opts.storeAccountId),
      ),
    )
    .limit(1);

  if (!provider) {
    throw Object.assign(new Error("Payment provider not found"), { statusCode: 404 });
  }

  const webhookSecret = getWebhookSecret(provider.encryptedConfig);
  const stripe = getStripeClient(provider.encryptedConfig);

  // 2. Construct Stripe event (signature verification) — throws on failure
  const event = constructStripeEvent(stripe, opts.rawBody, opts.signature, webhookSecret);

  // 3. Check for duplicate event
  const [existing] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.providerType, "stripe"),
        eq(webhookEvents.externalEventId, event.id),
      ),
    )
    .limit(1);

  if (existing) {
    return { processed: false, eventType: event.type };
  }

  // 4. Insert webhookEvent row immediately (processedAt=null)
  const [webhookRow] = await db
    .insert(webhookEvents)
    .values({
      storeAccountId: opts.storeAccountId,
      providerId: opts.providerId,
      providerType: "stripe",
      externalEventId: event.id,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
      processedAt: null,
    })
    .returning({ id: webhookEvents.id });

  // 5. Handle event type
  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as { id: string };
      const paymentIntentId = intent.id;

      // Update payment status
      const [updatedPayment] = await db
        .update(payments)
        .set({ status: "succeeded", succeededAt: new Date(), updatedAt: new Date() })
        .where(eq(payments.externalId, paymentIntentId))
        .returning({ orderId: payments.orderId });

      // Update order payment status if we have an order
      if (updatedPayment?.orderId) {
        await db
          .update(orders)
          .set({ paymentStatus: "paid" })
          .where(eq(orders.id, updatedPayment.orderId));
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as {
        id: string;
        last_payment_error?: { code?: string; message?: string };
      };

      const updateValues: Partial<typeof payments.$inferInsert> = {
        status: "failed",
        failedAt: new Date(),
        updatedAt: new Date(),
      };
      if (intent.last_payment_error?.code !== undefined) {
        updateValues.failureCode = intent.last_payment_error.code;
      }
      if (intent.last_payment_error?.message !== undefined) {
        updateValues.failureMessage = intent.last_payment_error.message;
      }

      await db
        .update(payments)
        .set(updateValues)
        .where(eq(payments.externalId, intent.id));
    }

    // 6. Mark webhook as processed
    await db
      .update(webhookEvents)
      .set({ processedAt: new Date(), error: null })
      .where(eq(webhookEvents.id, webhookRow!.id));
  } catch (err) {
    // Record the error but don't rethrow — we've already inserted the event
    const errMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(webhookEvents)
      .set({ error: errMsg })
      .where(eq(webhookEvents.id, webhookRow!.id));
    throw err;
  }

  return { processed: true, eventType: event.type };
}

// ── Provider lookup for webhook routing ───────────────────────────────────────

export async function lookupProviderByWebhook(
  db: Db,
  storeAccountId: string,
  providerType: string,
) {
  const [provider] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.storeAccountId, storeAccountId),
        eq(paymentProviders.type, providerType as "stripe" | "paypal" | "swish" | "klarna" | "manual"),
        eq(paymentProviders.isActive, true),
      ),
    )
    .limit(1);
  return provider ?? null;
}
