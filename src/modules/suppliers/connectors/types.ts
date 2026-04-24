export interface DownloadResult {
  content: string;
  fileName: string;
}

export interface ParsedRecord {
  sku?: string;
  ean?: string;
  qty: number;
  price?: number;
  costPrice?: number;
  raw?: Record<string, string>;
}
