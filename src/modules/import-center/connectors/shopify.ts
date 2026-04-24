// ---------------------------------------------------------------------------
// Import Center — Shopify connector
// Shopify Admin REST API 2024-01
// ---------------------------------------------------------------------------

import type {
  ShopifyCredentials,
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

// ── Pagination ───────────────────────────────────────────────────────────────

async function shopifyPaginatedFetch<T>(
  baseUrl: string,
  headers: Record<string, string>,
  initialPath: string,
  pageSize = 250,
): Promise<T[]> {
  const ITEM_LIMIT = 10_000;
  const results: T[] = [];

  let nextUrl: string | null =
    `${baseUrl}${initialPath}?limit=${pageSize}`;

  while (nextUrl !== null) {
    const resp = await safeFetch(nextUrl, { headers });
    const data = (await resp.json()) as Record<string, unknown>;

    // Shopify wraps results in a root key — infer it from the first key present
    const rootKey = Object.keys(data)[0];
    if (!rootKey) break;
    const page = (data[rootKey] as T[]) ?? [];
    results.push(...page);

    if (results.length >= ITEM_LIMIT) {
      break;
    }

    // Parse Link header for rel="next"
    const linkHeader = resp.headers.get("link") ?? "";
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match?.[1] ?? null;
  }

  return results;
}

// ── Normalisers ──────────────────────────────────────────────────────────────

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  barcode: string | null;
}

interface ShopifyCustomCollection {
  id: number;
  title: string;
}

interface ShopifyCollect {
  collection_id: number;
  product_id: number;
}

interface ShopifyProductOption {
  name: string;
  position: number;
}

interface ShopifyImage {
  src: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  status: string;
  tags: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  options: ShopifyProductOption[];
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  tags: string;
  orders_count: number;
  total_spent: string;
}

interface ShopifyLineItem {
  id: number;
  sku: string | null;
  name: string;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  financial_status: string;
  fulfillment_status: string | null;
  email: string;
  customer: { id: number } | null;
  total_price: string;
  currency: string;
  line_items: ShopifyLineItem[];
  created_at: string;
}

function normalizeProduct(
  product: ShopifyProduct,
  collectionsMap?: Map<number, string[]>,
): PlatformProduct {
  const optionNames = product.options.map((o) => o.name);

  const variants = product.variants.map((v) => {
    const options: Record<string, string> = {};
    if (v.option1 !== null && optionNames[0] !== undefined) {
      options[optionNames[0]] = v.option1;
    }
    if (v.option2 !== null && optionNames[1] !== undefined) {
      options[optionNames[1]] = v.option2;
    }
    if (v.option3 !== null && optionNames[2] !== undefined) {
      options[optionNames[2]] = v.option3;
    }

    const variant: NonNullable<PlatformProduct["variants"]>[number] = {
      externalId: String(v.id),
      title: v.title,
      price: parseFloat(v.price),
      inventoryQuantity: v.inventory_quantity,
    };
    if (v.sku !== null && v.sku !== "") variant.sku = v.sku;
    if (Object.keys(options).length > 0) variant.options = options;
    if (v.barcode !== null && v.barcode !== "") {
      variant.ean = v.barcode;
      variant.barcode = v.barcode;
    }
    return variant;
  });

  const out: PlatformProduct = {
    externalId: String(product.id),
    name: product.title,
    status:
      product.status === "active"
        ? "active"
        : product.status === "archived"
          ? "archived"
          : "draft",
    images: product.images.map((i) => i.src),
    variants,
    tags: product.tags
      ? product.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [],
    vendor: product.vendor,
    raw: product as unknown as Record<string, unknown>,
  };

  if (product.body_html) out.description = stripHtml(product.body_html);

  // EAN from first variant barcode (simple products)
  const firstBarcode = product.variants[0]?.barcode;
  if (firstBarcode !== null && firstBarcode !== undefined && firstBarcode !== "") {
    out.ean = firstBarcode;
  }

  // Collections from the pre-built map
  const collections = collectionsMap?.get(product.id);
  if (collections !== undefined && collections.length > 0) {
    out.collections = collections;
  }

  return out;
}

function normalizeCustomer(customer: ShopifyCustomer): PlatformCustomer {
  const out: PlatformCustomer = {
    externalId: String(customer.id),
    email: customer.email,
    ordersCount: customer.orders_count,
    totalSpent: parseFloat(customer.total_spent),
    raw: customer as unknown as Record<string, unknown>,
  };

  if (customer.first_name) out.firstName = customer.first_name;
  if (customer.last_name) out.lastName = customer.last_name;
  if (customer.phone) out.phone = customer.phone;
  if (customer.tags) {
    out.tags = customer.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return out;
}

function normalizeOrder(order: ShopifyOrder): PlatformOrder {
  const lineItems = order.line_items.map((li) => {
    const item: PlatformOrder["lineItems"][number] = {
      externalId: String(li.id),
      name: li.name,
      quantity: li.quantity,
      price: parseFloat(li.price),
    };
    if (li.sku) item.sku = li.sku;
    return item;
  });

  const out: PlatformOrder = {
    externalId: String(order.id),
    orderNumber: String(order.order_number),
    status: order.fulfillment_status ?? "unfulfilled",
    financialStatus: order.financial_status,
    customerEmail: order.email,
    totalPrice: parseFloat(order.total_price),
    currency: order.currency,
    lineItems,
    createdAt: order.created_at,
    raw: order as unknown as Record<string, unknown>,
  };

  if (order.customer) out.customerId = String(order.customer.id);

  return out;
}

// ── Collections map builder ───────────────────────────────────────────────────
//
// Fetches custom_collections + collects (product↔collection links) and builds
// a Map<productId, collectionTitles[]> for use during product normalisation.

async function buildCollectionsMap(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();

  try {
    // 1. Fetch all custom collections (id → title)
    const collections = await shopifyPaginatedFetch<ShopifyCustomCollection>(
      baseUrl,
      headers,
      "/custom_collections.json",
    );
    const collectionTitles = new Map<number, string>(
      collections.map((c) => [c.id, c.title]),
    );

    // 2. Fetch collects (the join table: collection_id + product_id)
    const collects = await shopifyPaginatedFetch<ShopifyCollect>(
      baseUrl,
      headers,
      "/collects.json",
    );

    for (const collect of collects) {
      const title = collectionTitles.get(collect.collection_id);
      if (title === undefined) continue;
      const existing = map.get(collect.product_id);
      if (existing !== undefined) {
        existing.push(title);
      } else {
        map.set(collect.product_id, [title]);
      }
    }
  } catch {
    // Non-fatal: if collections fetch fails, products still import without them
  }

  return map;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function validateShopifyCredentials(
  creds: ShopifyCredentials,
): Promise<{ valid: boolean; shopName?: string; error?: string }> {
  const baseUrl = `https://${creds.shopUrl}/admin/api/2024-01`;
  const headers = { "X-Shopify-Access-Token": creds.accessToken };

  try {
    const resp = await safeFetch(`${baseUrl}/shop.json`, { headers });
    const data = (await resp.json()) as { shop: { name: string } };
    return { valid: true, shopName: data.shop.name };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchShopifyData(
  creds: ShopifyCredentials,
  entities: ImportEntity[],
  pageSize = 250,
): Promise<Partial<PlatformData>> {
  const baseUrl = `https://${creds.shopUrl}/admin/api/2024-01`;
  const headers = { "X-Shopify-Access-Token": creds.accessToken };

  const result: Partial<PlatformData> = {};

  if (entities.includes("products")) {
    const raw = await shopifyPaginatedFetch<ShopifyProduct>(
      baseUrl,
      headers,
      "/products.json",
      pageSize,
    );

    // Build productId → collection titles map
    const collectionsMap = await buildCollectionsMap(baseUrl, headers);

    result.products = raw.map((p) => normalizeProduct(p, collectionsMap));
  }

  if (entities.includes("customers")) {
    const raw = await shopifyPaginatedFetch<ShopifyCustomer>(
      baseUrl,
      headers,
      "/customers.json",
      pageSize,
    );
    result.customers = raw.map(normalizeCustomer);
  }

  if (entities.includes("orders")) {
    // The paginated fetcher appends ?limit=N, we add &status=any via a
    // modified initial path that already contains the extra param.
    // To keep paginatedFetch generic we construct the first URL manually and
    // handle the rest in the loop — simplest approach: use a wrapper path.
    const raw = await shopifyOrdersFetch(baseUrl, headers, pageSize);
    result.orders = raw.map(normalizeOrder);
  }

  return result;
}

// Orders require an extra query param (status=any) so we handle them via a
// small dedicated fetcher that builds the correct initial URL.
async function shopifyOrdersFetch(
  baseUrl: string,
  headers: Record<string, string>,
  pageSize: number,
): Promise<ShopifyOrder[]> {
  const ITEM_LIMIT = 10_000;
  const results: ShopifyOrder[] = [];

  let nextUrl: string | null =
    `${baseUrl}/orders.json?limit=${pageSize}&status=any`;

  while (nextUrl !== null) {
    const resp = await safeFetch(nextUrl, { headers });
    const data = (await resp.json()) as { orders: ShopifyOrder[] };
    results.push(...data.orders);

    if (results.length >= ITEM_LIMIT) break;

    const linkHeader = resp.headers.get("link") ?? "";
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match?.[1] ?? null;
  }

  return results;
}
