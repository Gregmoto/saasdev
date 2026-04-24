// ---------------------------------------------------------------------------
// Import Center — shared connector types
// ---------------------------------------------------------------------------

// ── Credential shapes ──────────────────────────────────────────────────────

export interface ShopifyCredentials {
  shopUrl: string;       // "mystore.myshopify.com"
  accessToken: string;   // "shpat_..."
}

export interface WooCommerceCredentials {
  siteUrl: string;       // "https://mystore.com"
  consumerKey: string;   // "ck_..."
  consumerSecret: string; // "cs_..."
}

export interface PrestaShopCredentials {
  shopUrl: string;       // "https://mystore.com"
  apiKey: string;
}

export interface ImportFieldMapping {
  products?: Record<string, string>;
  customers?: Record<string, string>;
  orders?: Record<string, string>;
}

// ── Normalized platform output types ──────────────────────────────────────

export interface PlatformProduct {
  externalId: string;
  name: string;
  description?: string | undefined;
  sku?: string | undefined;
  price?: number | undefined;
  cost?: number | undefined;
  ean?: string | undefined;
  collections?: string[] | undefined;
  status: "active" | "draft" | "archived";
  images?: string[] | undefined;
  variants?: Array<{
    externalId: string;
    title: string;
    sku?: string | undefined;
    price?: number | undefined;
    inventoryQuantity?: number | undefined;
    options?: Record<string, string> | undefined;
    ean?: string | undefined;
    barcode?: string | undefined;
  }> | undefined;
  tags?: string[] | undefined;
  vendor?: string | undefined;
  raw: Record<string, unknown>;
}

export type ImportMode = "create_only" | "update_existing" | "create_and_update";

export interface PlatformCustomer {
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  ordersCount?: number;
  totalSpent?: number;
  raw: Record<string, unknown>;
}

export interface PlatformOrder {
  externalId: string;
  orderNumber?: string;
  status: string;
  financialStatus?: string;
  customerEmail?: string;
  customerId?: string;
  totalPrice: number;
  currency: string;
  lineItems: Array<{
    externalId: string;
    sku?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: string;
  raw: Record<string, unknown>;
}

export interface PlatformData {
  products: PlatformProduct[];
  customers: PlatformCustomer[];
  orders: PlatformOrder[];
}

export type ImportEntity = "products" | "customers" | "orders";
