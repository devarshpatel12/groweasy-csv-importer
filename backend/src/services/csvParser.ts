import { parse } from "csv-parse/sync";
import type { RawCsvRow } from "../types/crm.js";

export interface CsvParseResult {
  headers: string[];
  rows: RawCsvRow[];
  totalRows: number;
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim();
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseCsvBuffer(buffer: Buffer): CsvParseResult {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) {
    const headerOnly = parse(text, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      to_line: 1,
    }) as string[][];

    const headers = (headerOnly[0] ?? []).map(normalizeHeader);
    return { headers, rows: [], totalRows: 0 };
  }

  const headers = Object.keys(records[0]).map(normalizeHeader);

  const rows: RawCsvRow[] = records.map((record, index) => {
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      data[normalizeHeader(key)] = normalizeCell(value);
    }
    return { rowIndex: index + 1, data };
  });

  return { headers, rows, totalRows: rows.length };
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function hasContactInfo(record: {
  email?: string;
  mobile_without_country_code?: string;
}): boolean {
  const email = (record.email ?? "").trim();
  const mobile = (record.mobile_without_country_code ?? "").trim();
  return email.length > 0 || mobile.length > 0;
}
