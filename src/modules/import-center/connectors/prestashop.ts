// ---------------------------------------------------------------------------
// Import Center — PrestaShop connector
// PrestaShop Web Services API (JSON mode)
// ---------------------------------------------------------------------------

import type {
  PrestaShopCredentials,
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

function buildAuthHeader(apiKey: string): string {
  // PrestaShop: API key as username, empty password
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

/** PrestaShop language arrays: [{ id: "1", value: "..." }, ...] or plain string */
function extractLangValue(
  langArray:
    | Array<{ id: string; value: string }>
    | string
    | undefined,
): string {
  if (!langArray) return "";
  if (typeof langArray === "string") return langArray;
  return langArray[0]?.value ?? "";
}

// ── Pagination ───────────────────────────────────────────────────────────────

async function psPaginatedFetch<T>(
  baseUrl: string,
  headers: Record<string, string>,
  resource: string,
  perPage = 100,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const url =
      `${baseUrl}/api/${resource}?output_format=JSON&display=full` +
      `&limit=${perPage}&page=${page}`;

    const resp = await safeFetch(url, { headers });
    const data = (await resp.json()) as Record<string, unknown>;

    // PrestaShop wraps results in a root key matching the resource name
    // e.g. { products: [...] }, { customers: [...] }
    const items = (data[resource] as T[] | undefined) ?? [];
    results.push(...items);

    // End detection: fewer items than requested means last page
    if (items.length < perPage) break;

    page++;
  }

  return results;
}

// ── PrestaShop API shapes ────────────────────────────────────────────────────

type LangValue = Array<{ id: string; value: string }> | string;

interface PSProduct {
  id: number | string;
  name: LangValue;
  description: LangValue;
  reference: string;
  price: string;
  active: string; // "0" | "1"
  ean13: string;
  associations?: {
    combinations?: Array<{ id: number | string }> | undefined;
    categories?: Array<{ id: number | string }> | undefined;
  } | undefined;
}

interface PSCombination {
  id: number | string;
  reference: string; // SKU
  ean13: string;
  price: string; // price impact
  quantity: number | string;
}

interface PSCategory {
  id: number | string;
  name: LangValue;
}

interface PSCustomer {
  id: number | string;
  email: string;
  firstname: string;
  lastname: string;
  active: string;
}

interface PSOrderRow {
  id: number | string;
  product_id: number | string;
  product_name: string;
  product_quantity: number | string;
  unit_price_tax_incl: string;
}

interface PSOrder {
  id: number | string;
  reference: string;
  current_state: number | string;
  id_customer: number | string;
  total_paid: string;
  id_currency: number | string;
  associations?: {
    order_rows?: PSOrderRow[];
  };
  date_add: string;
}

// ── Normalisers ──────────────────────────────────────────────────────────────

function normalizeProduct(
  product: PSProduct,
  combinationsMap?: Map<string, PSCombination[]>,
  categoryMap?: Map<string, string>,
): PlatformProduct {
  const rawDescription = extractLangValue(product.description);
  const basePrice = parseFloat(product.price || "0");

  const out: PlatformProduct = {
    externalId: String(product.id),
    name: extractLangValue(product.name),
    status: product.active === "1" ? "active" : "draft",
    price: basePrice,
    raw: product as unknown as Record<string, unknown>,
  };

  if (rawDescription) out.description = stripHtml(rawDescription);
  if (product.reference) out.sku = product.reference;
  if (product.ean13) out.ean = product.ean13;

  // Categories → collections
  const catAssocs = product.associations?.categories;
  if (catAssocs !== undefined && catAssocs.length > 0) {
    const names = catAssocs
      .map((c) => categoryMap?.get(String(c.id)) ?? String(c.id))
      .filter(Boolean);
    if (names.length > 0) out.collections = names;
  }

  // Combinations → variants
  const combinations = combinationsMap?.get(String(product.id));
  if (combinations !== undefined && combinations.length > 0) {
    out.variants = combinations.map((c) => {
      const variant: NonNullable<PlatformProduct["variants"]>[number] = {
        externalId: String(c.id),
        title: c.reference || String(c.id),
        price: basePrice + parseFloat(c.price || "0"),
        inventoryQuantity: Number(c.quantity),
      };
      if (c.reference) variant.sku = c.reference;
      if (c.ean13) variant.ean = c.ean13;
      return variant;
    });
  }

  return out;
}

function normalizeCustomer(customer: PSCustomer): PlatformCustomer {
  const out: PlatformCustomer = {
    externalId: String(customer.id),
    email: customer.email,
    raw: customer as unknown as Record<string, unknown>,
  };

  if (customer.firstname) out.firstName = customer.firstname;
  if (customer.lastname) out.lastName = customer.lastname;

  return out;
}

function normalizeOrder(order: PSOrder): PlatformOrder {
  const rows = order.associations?.order_rows ?? [];

  const lineItems = rows.map((row) => {
    const item: PlatformOrder["lineItems"][number] = {
      externalId: String(row.id),
      name: row.product_name,
      quantity: Number(row.product_quantity),
      price: parseFloat(row.unit_price_tax_incl),
    };
    return item;
  });

  const out: PlatformOrder = {
    externalId: String(order.id),
    orderNumber: order.reference,
    status: String(order.current_state),
    customerId: String(order.id_customer),
    // PrestaShop doesn't expose currency code at order level without
    // a separate currencies API call; store the currency ID for now.
    currency: String(order.id_currency),
    totalPrice: parseFloat(order.total_paid),
    lineItems,
    createdAt: order.date_add,
    raw: order as unknown as Record<string, unknown>,
  };

  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function validatePrestaShopCredentials(
  creds: PrestaShopCredentials,
): Promise<{ valid: boolean; shopName?: string; error?: string }> {
  const authHeader = buildAuthHeader(creds.apiKey);
  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
  };

  try {
    const url = `${creds.shopUrl}/api/shop?output_format=JSON`;
    const resp = await safeFetch(url, { headers });
    const data = (await resp.json()) as {
      shop?: { name?: string };
    };
    const shopName = data.shop?.name ?? creds.shopUrl;
    return { valid: true, shopName };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchPrestaShopData(
  creds: PrestaShopCredentials,
  entities: ImportEntity[],
  perPage = 100,
): Promise<Partial<PlatformData>> {
  const baseUrl = creds.shopUrl.replace(/\/$/, "");
  const authHeader = buildAuthHeader(creds.apiKey);
  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
  };

  const result: Partial<PlatformData> = {};

  if (entities.includes("products")) {
    const raw = await psPaginatedFetch<PSProduct>(
      baseUrl,
      headers,
      "products",
      perPage,
    );

    // Fetch categories and build id → name map
    const categoryMap = new Map<string, string>();
    try {
      const categories = await psPaginatedFetch<PSCategory>(
        baseUrl,
        headers,
        "categories",
        perPage,
      );
      for (const cat of categories) {
        categoryMap.set(String(cat.id), extractLangValue(cat.name));
      }
    } catch {
      // Non-fatal: categories are optional enrichment
    }

    // Fetch combinations for products that have them
    const combinationsMap = new Map<string, PSCombination[]>();
    for (const product of raw) {
      const combAssocs = product.associations?.combinations;
      if (combAssocs === undefined || combAssocs.length === 0) continue;

      const productId = String(product.id);
      const combos: PSCombination[] = [];

      for (const assoc of combAssocs) {
        try {
          const url =
            `${baseUrl}/api/combinations/${String(assoc.id)}` +
            `?output_format=JSON&display=full`;
          const resp = await safeFetch(url, { headers });
          const data = (await resp.json()) as { combination?: PSCombination };
          if (data.combination !== undefined) {
            combos.push(data.combination);
          }
        } catch {
          // Skip individual combination fetch errors
        }
      }

      if (combos.length > 0) {
        combinationsMap.set(productId, combos);
      }
    }

    result.products = raw.map((p) =>
      normalizeProduct(p, combinationsMap, categoryMap),
    );
  }

  if (entities.includes("customers")) {
    const raw = await psPaginatedFetch<PSCustomer>(
      baseUrl,
      headers,
      "customers",
      perPage,
    );
    result.customers = raw.map(normalizeCustomer);
  }

  if (entities.includes("orders")) {
    const raw = await psPaginatedFetch<PSOrder>(
      baseUrl,
      headers,
      "orders",
      perPage,
    );
    result.orders = raw.map(normalizeOrder);
  }

  return result;
}
