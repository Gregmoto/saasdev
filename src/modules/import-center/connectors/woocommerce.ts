// ---------------------------------------------------------------------------
// Import Center — WooCommerce connector
// WooCommerce REST API v3
// ---------------------------------------------------------------------------

import type {
  WooCommerceCredentials,
  PlatformData,
  PlatformProduct,
  PlatformCustomer,
  PlatformOrder,
  ImportEntity,
} from "./types.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function safeFetch(
  url: string,
  opts: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...opts, signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(
        `HTTP ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`,
      );
    }
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

function buildAuthHeader(consumerKey: string, consumerSecret: string): string {
  const encoded = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );
  return `Basic ${encoded}`;
}

// ── Pagination ───────────────────────────────────────────────────────────────

const PAGE_LIMIT = 50;

async function wcPaginatedFetch<T>(
  baseUrl: string,
  headers: Record<string, string>,
  path: string,
  perPage = 100,
): Promise<T[]> {
  const results: T[] = [];

  // Page 1
  const firstUrl = `${baseUrl}${path}?per_page=${perPage}&page=1`;
  const firstResp = await safeFetch(firstUrl, { headers });
  const firstPage = (await firstResp.json()) as T[];
  results.push(...firstPage);

  const totalPagesHeader = firstResp.headers.get("x-wp-totalpages") ?? "1";
  const totalPages = Math.min(parseInt(totalPagesHeader, 10), PAGE_LIMIT);

  for (let page = 2; page <= totalPages; page++) {
    const url = `${baseUrl}${path}?per_page=${perPage}&page=${page}`;
    const resp = await safeFetch(url, { headers });
    const items = (await resp.json()) as T[];
    results.push(...items);
  }

  return results;
}

// ── WooCommerce API shapes ───────────────────────────────────────────────────

interface WCImage {
  src: string;
}

interface WCCategory {
  id: number;
  name: string;
}

interface WCVariation {
  id: number;
  sku: string;
  price: string;
  stock_quantity: number | null;
  attributes: Array<{ name: string; option: string }>;
  meta_data: Array<{ key: string; value: unknown }>;
}

interface WCProduct {
  id: number;
  name: string;
  description: string;
  status: string;
  sku: string;
  price: string;
  type: string;
  images: WCImage[];
  categories: WCCategory[];
  meta_data: Array<{ key: string; value: unknown }>;
  variations?: WCVariation[] | undefined;
}

interface WCCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
}

interface WCLineItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

interface WCOrder {
  id: number;
  number: number;
  status: string;
  payment_method_title: string;
  billing: { email: string };
  customer_id: number;
  total: string;
  currency: string;
  line_items: WCLineItem[];
  date_created: string;
}

// ── Normalisers ──────────────────────────────────────────────────────────────

function normalizeProduct(product: WCProduct): PlatformProduct {
  const out: PlatformProduct = {
    externalId: String(product.id),
    name: product.name,
    status:
      product.status === "publish"
        ? "active"
        : product.status === "trash"
          ? "archived"
          : "draft",
    price: parseFloat(product.price || "0"),
    images: product.images.map((i) => i.src),
    raw: product as unknown as Record<string, unknown>,
  };

  if (product.description) out.description = stripHtml(product.description);
  if (product.sku) out.sku = product.sku;

  // Categories → collections
  if (product.categories.length > 0) {
    out.collections = product.categories.map((c) => c.name);
  }

  // EAN from meta_data
  const eanMeta = product.meta_data.find(
    (m) => m.key === "_ean" || m.key === "ean",
  );
  if (eanMeta !== undefined && typeof eanMeta.value === "string" && eanMeta.value !== "") {
    out.ean = eanMeta.value;
  }

  // Variants (variable products with pre-fetched variations)
  if (product.type === "variable" && product.variations !== undefined && product.variations.length > 0) {
    out.variants = product.variations.map((v) => {
      const options = v.attributes.reduce<Record<string, string>>((acc, a) => {
        acc[a.name] = a.option;
        return acc;
      }, {});

      const variant: NonNullable<PlatformProduct["variants"]>[number] = {
        externalId: String(v.id),
        title: v.attributes.map((a) => a.option).join(" / ") || String(v.id),
        price: parseFloat(v.price || "0"),
        inventoryQuantity: v.stock_quantity ?? 0,
      };

      if (v.sku) variant.sku = v.sku;
      if (Object.keys(options).length > 0) variant.options = options;

      const varEanMeta = v.meta_data.find((m) => m.key === "_ean");
      if (varEanMeta !== undefined && typeof varEanMeta.value === "string" && varEanMeta.value !== "") {
        variant.ean = varEanMeta.value;
      }

      return variant;
    });
  } else {
    out.variants = [];
  }

  return out;
}

function normalizeCustomer(customer: WCCustomer): PlatformCustomer {
  const out: PlatformCustomer = {
    externalId: String(customer.id),
    email: customer.email,
    ordersCount: customer.orders_count,
    totalSpent: parseFloat(customer.total_spent || "0"),
    raw: customer as unknown as Record<string, unknown>,
  };

  if (customer.first_name) out.firstName = customer.first_name;
  if (customer.last_name) out.lastName = customer.last_name;

  return out;
}

function normalizeOrder(order: WCOrder): PlatformOrder {
  const lineItems = order.line_items.map((li) => {
    const item: PlatformOrder["lineItems"][number] = {
      externalId: String(li.id),
      name: li.name,
      quantity: li.quantity,
      price: li.price,
    };
    if (li.sku) item.sku = li.sku;
    return item;
  });

  const out: PlatformOrder = {
    externalId: String(order.id),
    orderNumber: String(order.number),
    status: order.status,
    financialStatus: order.payment_method_title || order.status,
    customerEmail: order.billing.email,
    totalPrice: parseFloat(order.total),
    currency: order.currency,
    lineItems,
    createdAt: order.date_created,
    raw: order as unknown as Record<string, unknown>,
  };

  if (order.customer_id) out.customerId = String(order.customer_id);

  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function validateWooCommerceCredentials(
  creds: WooCommerceCredentials,
): Promise<{ valid: boolean; siteName?: string; error?: string }> {
  const baseUrl = `${creds.siteUrl}/wp-json/wc/v3`;
  const authHeader = buildAuthHeader(creds.consumerKey, creds.consumerSecret);
  const headers = { Authorization: authHeader };

  try {
    const resp = await safeFetch(`${baseUrl}/system_status`, { headers });
    const data = (await resp.json()) as {
      settings?: { store_address?: string };
    };
    const siteName = data.settings?.store_address ?? creds.siteUrl;
    return { valid: true, siteName };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchWooCommerceData(
  creds: WooCommerceCredentials,
  entities: ImportEntity[],
  perPage = 100,
): Promise<Partial<PlatformData>> {
  const baseUrl = `${creds.siteUrl}/wp-json/wc/v3`;
  const authHeader = buildAuthHeader(creds.consumerKey, creds.consumerSecret);
  const headers = { Authorization: authHeader };

  const result: Partial<PlatformData> = {};

  if (entities.includes("products")) {
    const raw = await wcPaginatedFetch<WCProduct>(
      baseUrl,
      headers,
      "/products",
      perPage,
    );

    // Fetch variations for variable products
    for (const product of raw) {
      if (product.type === "variable") {
        try {
          const variations = await wcPaginatedFetch<WCVariation>(
            baseUrl,
            headers,
            `/products/${product.id}/variations`,
            perPage,
          );
          product.variations = variations;
        } catch {
          product.variations = [];
        }
      }
    }

    result.products = raw.map(normalizeProduct);
  }

  if (entities.includes("customers")) {
    const raw = await wcPaginatedFetch<WCCustomer>(
      baseUrl,
      headers,
      "/customers",
      perPage,
    );
    result.customers = raw.map(normalizeCustomer);
  }

  if (entities.includes("orders")) {
    const raw = await wcPaginatedFetch<WCOrder>(
      baseUrl,
      headers,
      "/orders",
      perPage,
    );
    result.orders = raw.map(normalizeOrder);
  }

  return result;
}
