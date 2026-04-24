import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, gt, ne, sql } from "drizzle-orm";
import { shopDomains } from "../../db/schema/shops.js";
import { integrationConnections, integrationProviders } from "../../db/schema/integrations.js";
import { shippingZones } from "../../db/schema/shipping.js";
import { storeTaxConfigs } from "../../db/schema/tax.js";
import { products } from "../../db/schema/products.js";
import { shops } from "../../db/schema/shops.js";
import { storeFaqs } from "../../db/schema/store-faqs.js";
import { orders } from "../../db/schema/orders.js";

export type CheckResult = {
  key: string;
  label: string;
  status: "pass" | "fail" | "warning";
  detail?: string;
  required: boolean;
};

function check(
  key: string,
  label: string,
  status: CheckResult["status"],
  detail: string | null,
  required: boolean,
): CheckResult {
  const result: CheckResult = { key, label, status, required };
  if (detail !== null) {
    result.detail = detail;
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLaunchReadiness(db: PostgresJsDatabase<any>, storeAccountId: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. domain_verified
  try {
    const domainRows = await db
      .select({ id: shopDomains.id })
      .from(shopDomains)
      .where(and(eq(shopDomains.storeAccountId, storeAccountId), eq(shopDomains.isVerified, true)))
      .limit(1);

    results.push(check(
      "domain_verified",
      "Domain verified",
      domainRows.length > 0 ? "pass" : "fail",
      domainRows.length > 0 ? null : "No verified domain found. Add and verify a domain for your shop.",
      true,
    ));
  } catch {
    results.push(check("domain_verified", "Domain verified", "warning", "Kunde inte verifiera", false));
  }

  // 2. payments_connected
  try {
    const paymentProviders = await db
      .select({ slug: integrationProviders.slug, id: integrationProviders.id })
      .from(integrationProviders)
      .where(sql`${integrationProviders.slug} ILIKE '%stripe%' OR ${integrationProviders.slug} ILIKE '%klarna%'`);

    let paymentConnected = false;
    if (paymentProviders.length > 0) {
      for (const provider of paymentProviders) {
        const conn = await db
          .select({ id: integrationConnections.id })
          .from(integrationConnections)
          .where(
            and(
              eq(integrationConnections.storeAccountId, storeAccountId),
              eq(integrationConnections.providerId, provider.id),
              eq(integrationConnections.status, "connected"),
            ),
          )
          .limit(1);
        if (conn.length > 0) {
          paymentConnected = true;
          break;
        }
      }
    }

    results.push(check(
      "payments_connected",
      "Payment provider connected",
      paymentConnected ? "pass" : "fail",
      paymentConnected ? null : "Connect Stripe or Klarna to accept payments.",
      true,
    ));
  } catch {
    results.push(check("payments_connected", "Payment provider connected", "warning", "Kunde inte verifiera", false));
  }

  // 3. shipping_configured
  try {
    const shippingRows = await db
      .select({ id: shippingZones.id })
      .from(shippingZones)
      .where(eq(shippingZones.storeAccountId, storeAccountId))
      .limit(1);

    results.push(check(
      "shipping_configured",
      "Shipping configured",
      shippingRows.length > 0 ? "pass" : "warning",
      shippingRows.length > 0 ? null : "No shipping zones found. Configure shipping to enable order fulfillment.",
      true,
    ));
  } catch {
    results.push(check("shipping_configured", "Shipping configured", "warning", "Kunde inte verifiera", false));
  }

  // 4. taxes_configured
  try {
    const taxRows = await db
      .select({ id: storeTaxConfigs.id })
      .from(storeTaxConfigs)
      .where(eq(storeTaxConfigs.storeAccountId, storeAccountId))
      .limit(1);

    results.push(check(
      "taxes_configured",
      "Tax configuration",
      taxRows.length > 0 ? "pass" : "warning",
      taxRows.length > 0 ? null : "No tax configuration found. Configure tax settings for your store.",
      true,
    ));
  } catch {
    results.push(check("taxes_configured", "Tax configuration", "warning", "Kunde inte verifiera", false));
  }

  // 5. has_products
  try {
    const productRows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.storeAccountId, storeAccountId), eq(products.status, "published")))
      .limit(1);

    results.push(check(
      "has_products",
      "Published products",
      productRows.length > 0 ? "pass" : "fail",
      productRows.length > 0 ? null : "No published products found. Publish at least one product.",
      true,
    ));
  } catch {
    results.push(check("has_products", "Published products", "warning", "Kunde inte verifiera", false));
  }

  // 6. has_market
  try {
    const shopRows = await db
      .select({ id: shops.id })
      .from(shops)
      .where(and(eq(shops.storeAccountId, storeAccountId), eq(shops.isActive, true)))
      .limit(1);

    results.push(check(
      "has_market",
      "Active storefront",
      shopRows.length > 0 ? "pass" : "fail",
      shopRows.length > 0 ? null : "No active shop found. Create and activate a storefront.",
      true,
    ));
  } catch {
    results.push(check("has_market", "Active storefront", "warning", "Kunde inte verifiera", false));
  }

  // 7. legal_pages
  try {
    const legalFaqs = await db
      .select({ id: storeFaqs.id })
      .from(storeFaqs)
      .where(and(eq(storeFaqs.storeAccountId, storeAccountId), eq(storeFaqs.category, "legal")))
      .limit(1);

    results.push(check(
      "legal_pages",
      "Legal pages",
      legalFaqs.length > 0 ? "pass" : "warning",
      legalFaqs.length > 0 ? null : "No legal pages (returns policy, privacy policy, terms) found.",
      false,
    ));
  } catch {
    results.push(check("legal_pages", "Legal pages", "warning", "Kunde inte verifiera", false));
  }

  // 8. test_order
  try {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.storeAccountId, storeAccountId), ne(orders.status, "pending")))
      .limit(1);

    results.push(check(
      "test_order",
      "Test order placed",
      testOrders.length > 0 ? "pass" : "warning",
      testOrders.length > 0 ? null : "No test order found. Consider placing a test order before launch.",
      false,
    ));
  } catch {
    results.push(check("test_order", "Test order placed", "warning", "Kunde inte verifiera", false));
  }

  // 9. email_templates — always warning
  results.push(check(
    "email_templates",
    "Email templates",
    "warning",
    "Kontrollera att orderbekräftelse-mejlet är konfigurerat.",
    false,
  ));

  // 10. min_stock
  try {
    const inStockProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.storeAccountId, storeAccountId), eq(products.status, "published"), gt(products.inventoryQuantity, 0)))
      .limit(1);

    results.push(check(
      "min_stock",
      "Product stock",
      inStockProducts.length > 0 ? "pass" : "warning",
      inStockProducts.length > 0 ? null : "All published products have 0 stock. Make sure products are in stock before launch.",
      false,
    ));
  } catch {
    results.push(check("min_stock", "Product stock", "warning", "Kunde inte verifiera", false));
  }

  return results;
}
