/**
 * Content parser: CSV (native state machine), XML (regex), JSON.
 * No external parsing packages required.
 */

import type { MappingConfig } from "../../../db/schema/suppliers.js";
import type { ParsedRecord } from "./types.js";

// ── mapRecord ─────────────────────────────────────────────────────────────────

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

// ── CSV parser (RFC 4180 state machine) ───────────────────────────────────────

function parseCsv(content: string): Array<Record<string, string>> {
  // Normalise line endings
  const normalised = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;

  while (i < normalised.length) {
    const ch = normalised[i]!;

    if (insideQuotes) {
      if (ch === '"') {
        // Peek at next character
        const next = normalised[i + 1];
        if (next === '"') {
          // Escaped quote ("") → literal "
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          insideQuotes = false;
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        insideQuotes = true;
        i++;
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (ch === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += ch;
        i++;
      }
    }
  }

  // Flush last field / row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  // First row = headers
  const headers = rows[0]!;
  const result: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    // Skip entirely empty rows
    if (row.every((f) => f.trim() === "")) {
      continue;
    }
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c] ?? `col${c}`;
      obj[header] = row[c] ?? "";
    }
    result.push(obj);
  }

  return result;
}

// ── XML parser (regex-based for well-structured XML) ─────────────────────────

function parseXml(content: string): Array<Record<string, string>> {
  // Try common repeating element names
  const candidateTags = ["item", "product", "row", "record", "entry"];

  let tagName: string | null = null;

  for (const candidate of candidateTags) {
    // Check if this tag appears more than once
    const openTagRegex = new RegExp(`<${candidate}[\\s>]`, "gi");
    const matches = content.match(openTagRegex);
    if (matches && matches.length > 1) {
      tagName = candidate;
      break;
    }
  }

  // Fallback: find the first tag that appears more than once by scanning
  if (!tagName) {
    const allTags = content.match(/<([a-zA-Z][a-zA-Z0-9_:-]*)[^>]*>/g) ?? [];
    const tagCounts = new Map<string, number>();

    for (const tag of allTags) {
      const nameMatch = /<([a-zA-Z][a-zA-Z0-9_:-]*)/.exec(tag);
      if (nameMatch) {
        const name = nameMatch[1]!.toLowerCase();
        tagCounts.set(name, (tagCounts.get(name) ?? 0) + 1);
      }
    }

    // Find the first tag (in document order) that has count > 1
    const seen = new Set<string>();
    for (const tag of allTags) {
      const nameMatch = /<([a-zA-Z][a-zA-Z0-9_:-]*)/.exec(tag);
      if (nameMatch) {
        const name = nameMatch[1]!.toLowerCase();
        if (!seen.has(name)) {
          seen.add(name);
          if ((tagCounts.get(name) ?? 0) > 1) {
            tagName = name;
            break;
          }
        }
      }
    }
  }

  if (!tagName) {
    return [];
  }

  // Extract each element block
  const elementRegex = new RegExp(
    `<${tagName}[\\s>][\\s\\S]*?<\\/${tagName}>`,
    "gi",
  );
  const elements = content.match(elementRegex) ?? [];

  return elements.map((element) => {
    const obj: Record<string, string> = {};
    // Extract child text nodes: <tagName>value</tagName>
    const childRegex = /<([a-zA-Z][a-zA-Z0-9_:-]*)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    let match: RegExpExecArray | null;

    while ((match = childRegex.exec(element)) !== null) {
      const childTag = match[1]!;
      const childValue = match[2]!;
      obj[childTag] = childValue.trim();
    }

    return obj;
  });
}

// ── JSON parser ───────────────────────────────────────────────────────────────

function parseJson(
  content: string,
  mapping: MappingConfig,
): ParsedRecord[] {
  const parsed: unknown = JSON.parse(content);

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else {
    const firstArray = Object.values(parsed as Record<string, unknown>).find(
      (v) => Array.isArray(v),
    );
    arr = Array.isArray(firstArray) ? firstArray : [];
  }

  const records: ParsedRecord[] = [];
  for (const item of arr) {
    const mapped = mapRecord(item as Record<string, unknown>, mapping);
    if (mapped !== null) {
      records.push(mapped);
    }
  }
  return records;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseRecords(
  content: string,
  format: "csv" | "xml" | "json",
  mapping: MappingConfig,
): Promise<ParsedRecord[]> {
  switch (format) {
    case "csv": {
      const rawRows = parseCsv(content);
      const records: ParsedRecord[] = [];
      for (const row of rawRows) {
        const mapped = mapRecord(row, mapping);
        if (mapped !== null) {
          records.push(mapped);
        }
      }
      return records;
    }

    case "xml": {
      const rawRows = parseXml(content);
      const records: ParsedRecord[] = [];
      for (const row of rawRows) {
        const mapped = mapRecord(row, mapping);
        if (mapped !== null) {
          records.push(mapped);
        }
      }
      return records;
    }

    case "json": {
      return parseJson(content, mapping);
    }
  }
}
