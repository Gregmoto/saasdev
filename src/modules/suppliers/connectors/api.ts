/**
 * HTTP API connector using Node.js built-in `fetch` (Node.js 18+).
 */

import type {
  SupplierFeed,
  SupplierCredentials,
  ApiConfig,
  MappingConfig,
} from "../../../db/schema/suppliers.js";
import type { ParsedRecord } from "./types.js";

// ── Helper: traverse a dot-path into a nested object ─────────────────────────

function extractField(obj: unknown, dotPath: string): unknown {
  const parts = dotPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ── Helper: build auth headers ────────────────────────────────────────────────

function buildAuthHeaders(
  apiConfig: ApiConfig,
  creds: SupplierCredentials,
): Record<string, string> {
  let authHeaders: Record<string, string>;

  switch (apiConfig.authType) {
    case "api_key": {
      const headerName = apiConfig.authHeader ?? "X-API-Key";
      authHeaders = { [headerName]: creds.apiKey ?? "" };
      break;
    }
    case "bearer": {
      authHeaders = { Authorization: `Bearer ${creds.bearerToken ?? ""}` };
      break;
    }
    case "basic": {
      const encoded = Buffer.from(
        `${creds.username ?? ""}:${creds.password ?? ""}`,
      ).toString("base64");
      authHeaders = { Authorization: `Basic ${encoded}` };
      break;
    }
  }

  if (apiConfig.headers) {
    return { ...authHeaders, ...apiConfig.headers };
  }
  return authHeaders;
}

// ── Helper: sleep ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Helper: GET a URL with query params and headers ───────────────────────────

async function fetchJson(
  url: string,
  params: Record<string, string | number>,
  headers: Record<string, string>,
): Promise<unknown> {
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    urlObj.searchParams.set(key, String(value));
  }

  const response = await fetch(urlObj.toString(), { headers });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText} for ${urlObj.toString()}`,
    );
  }

  return response.json() as Promise<unknown>;
}

// ── Helper: extract item array from response using dataField ──────────────────

function extractItems(responseBody: unknown, dataField: string): unknown[] {
  const raw = extractField(responseBody, dataField);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw;
}

// ── fetchAllPages ─────────────────────────────────────────────────────────────

async function fetchAllPages(
  apiConfig: ApiConfig,
  authHeaders: Record<string, string>,
): Promise<unknown[]> {
  const allItems: unknown[] = [];

  switch (apiConfig.paginationType) {
    case "none": {
      const body = await fetchJson(apiConfig.url, {}, authHeaders);
      const items = extractItems(body, apiConfig.dataField);
      allItems.push(...items);
      break;
    }

    case "page": {
      const pageParam = apiConfig.pageParam ?? "page";
      const perPageParam = apiConfig.perPageParam ?? "per_page";
      const pageSize = apiConfig.pageSize ?? 100;
      let pageNum = 1;

      while (pageNum <= 1000) {
        if (pageNum > 1) {
          await sleep(100);
        }

        const body = await fetchJson(
          apiConfig.url,
          { [pageParam]: pageNum, [perPageParam]: pageSize },
          authHeaders,
        );
        const items = extractItems(body, apiConfig.dataField);
        allItems.push(...items);

        if (items.length < pageSize) {
          break;
        }
        pageNum++;
      }
      break;
    }

    case "cursor": {
      const perPageParam = apiConfig.perPageParam ?? "per_page";
      const pageSize = apiConfig.pageSize ?? 100;
      let cursor: string | undefined;

      while (true) {
        const params: Record<string, string | number> = { [perPageParam]: pageSize };
        if (cursor !== undefined) {
          params["cursor"] = cursor;
        }

        if (cursor !== undefined) {
          await sleep(100);
        }

        const body = await fetchJson(apiConfig.url, params, authHeaders);
        const items = extractItems(body, apiConfig.dataField);
        allItems.push(...items);

        if (items.length === 0) {
          break;
        }

        if (apiConfig.nextCursorField) {
          const nextCursor = extractField(body, apiConfig.nextCursorField);
          if (nextCursor === null || nextCursor === undefined || nextCursor === "") {
            break;
          }
          cursor = String(nextCursor);
        } else {
          break;
        }
      }
      break;
    }

    case "offset": {
      const offsetParam = apiConfig.offsetParam ?? "offset";
      const perPageParam = apiConfig.perPageParam ?? "per_page";
      const pageSize = apiConfig.pageSize ?? 100;
      let currentOffset = 0;

      while (true) {
        if (currentOffset > 0) {
          await sleep(100);
        }

        const body = await fetchJson(
          apiConfig.url,
          { [offsetParam]: currentOffset, [perPageParam]: pageSize },
          authHeaders,
        );
        const items = extractItems(body, apiConfig.dataField);
        allItems.push(...items);

        if (items.length < pageSize) {
          break;
        }
        currentOffset += pageSize;
      }
      break;
    }
  }

  return allItems;
}

// ── Helper: map a raw API item to ParsedRecord ────────────────────────────────

function mapRecord(
  raw: Record<string, unknown>,
  mapping: MappingConfig,
): ParsedRecord | null {
  const qtyRaw = raw[mapping.qty];
  const qty = Number(qtyRaw);
  if (!isFinite(qty) || qty < 0) {
    return null;
  }

  const record: ParsedRecord = {
    qty,
    raw: Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, String(v)]),
    ),
  };

  if (mapping.sku !== undefined) {
    const v = raw[mapping.sku];
    if (v !== undefined && v !== null && String(v).trim()) {
      record.sku = String(v).trim();
    }
  }

  if (mapping.ean !== undefined) {
    const v = raw[mapping.ean];
    if (v !== undefined && v !== null && String(v).trim()) {
      record.ean = String(v).trim();
    }
  }

  if (mapping.price !== undefined) {
    const v = Number(raw[mapping.price]);
    if (isFinite(v)) {
      record.price = v;
    }
  }

  if (mapping.costPrice !== undefined) {
    const v = Number(raw[mapping.costPrice]);
    if (isFinite(v)) {
      record.costPrice = v;
    }
  }

  return record;
}

// ── Main connector ────────────────────────────────────────────────────────────

export async function runApiConnector(
  feed: SupplierFeed,
  creds: SupplierCredentials,
): Promise<{ records: ParsedRecord[] }> {
  const apiConfig = feed.apiConfig;
  if (!apiConfig) {
    throw new Error("API connector: apiConfig is required but was null");
  }

  const authHeaders = buildAuthHeaders(apiConfig, creds);
  const rawItems = await fetchAllPages(apiConfig, authHeaders);

  const records: ParsedRecord[] = [];
  for (const item of rawItems) {
    const mapped = mapRecord(item as Record<string, unknown>, feed.mappingConfig);
    if (mapped !== null) {
      records.push(mapped);
    }
  }

  return { records };
}
