import Papa from "papaparse";
import type { ColumnMapping } from "./templates.js";

export interface ParseResult {
  entityType: "products" | "customers" | "orders";
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  records: Record<string, unknown>[];
  errors: Array<{ row: number; data: Record<string, string>; error: string }>;
  duplicates: Array<{ row: number; key: string }>;
}

/**
 * Validates a single email address with a basic but robust regex.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Parses and validates a CSV text string against the given entity type and
 * column mapping.  Returns a structured ParseResult with valid records,
 * error rows, and duplicate rows.
 */
export function parseAndValidate(
  csvText: string,
  entityType: "products" | "customers" | "orders",
  mapping: ColumnMapping,
  opts: { skipDuplicates: boolean },
): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const originalHeaders = parsed.meta.fields ?? [];
  const rows = parsed.data;

  const records: Record<string, unknown>[] = [];
  const errors: ParseResult["errors"] = [];
  const duplicates: ParseResult["duplicates"] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i] as Record<string, string>;
    const rowNumber = i + 2; // 1-based + header row

    // Map CSV column headers to internal field names.
    const mapped: Record<string, string> = {};
    for (const [csvHeader, value] of Object.entries(rawRow)) {
      const internalField = mapping[csvHeader];
      if (internalField !== undefined) {
        mapped[internalField] = value ?? "";
      } else {
        // Pass unmapped columns through as-is.
        mapped[csvHeader] = value ?? "";
      }
    }

    // Per-entity validation.
    let validationError: string | null = null;
    let duplicateKey: string | null = null;

    if (entityType === "products") {
      const sku = (mapped["sku"] ?? "").trim();
      if (!sku) {
        validationError = "SKU is required";
      } else if (mapped["inventoryQty"] !== undefined && mapped["inventoryQty"] !== "") {
        const qty = Number(mapped["inventoryQty"]);
        if (isNaN(qty) || qty < 0) {
          validationError = "Inventory Qty must be a number >= 0";
        }
      }
      if (!validationError) duplicateKey = sku;
    } else if (entityType === "customers") {
      const email = (mapped["email"] ?? "").trim();
      if (!email) {
        validationError = "Email is required";
      } else if (!isValidEmail(email)) {
        validationError = "Email is not a valid email address";
      }
      if (!validationError) duplicateKey = email.toLowerCase();
    } else if (entityType === "orders") {
      const orderNumber = (mapped["orderNumber"] ?? "").trim();
      if (!orderNumber) {
        validationError = "Order Number is required";
      } else {
        const qty = Number(mapped["quantity"] ?? "");
        if ((mapped["quantity"] ?? "").trim() === "") {
          validationError = "Quantity is required";
        } else if (isNaN(qty) || qty < 1) {
          validationError = "Quantity must be a number >= 1";
        }
      }
      if (!validationError) duplicateKey = (mapped["orderNumber"] ?? "").trim();
    }

    if (validationError !== null) {
      errors.push({ row: rowNumber, data: rawRow, error: validationError });
      continue;
    }

    // Duplicate detection.
    if (duplicateKey !== null) {
      if (seen.has(duplicateKey)) {
        duplicates.push({ row: rowNumber, key: duplicateKey });
        if (opts.skipDuplicates) continue;
      } else {
        seen.add(duplicateKey);
      }
    }

    records.push(mapped as Record<string, unknown>);
  }

  return {
    entityType,
    totalRows: rows.length,
    validRows: records.length,
    errorRows: errors.length,
    duplicateRows: duplicates.length,
    records,
    errors,
    duplicates,
  };
}

/**
 * Generates a CSV string with the original columns plus an "Error" column.
 * Only error rows are included.  Uses papaparse.unparse for consistent output.
 */
export function generateErrorCsv(
  originalHeaders: string[],
  errors: ParseResult["errors"],
): string {
  const headers = [...originalHeaders, "Error"];
  const dataRows = errors.map(({ data, error }) => {
    const row: Record<string, string> = {};
    for (const header of originalHeaders) {
      row[header] = data[header] ?? "";
    }
    row["Error"] = error;
    return row;
  });

  return Papa.unparse({ fields: headers, data: dataRows });
}
