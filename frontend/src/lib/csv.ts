import Papa from "papaparse";
import type { ParsedCsv } from "@/types/crm";

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          const fatal = results.errors.find((e) => e.type === "Quotes");
          if (fatal) {
            reject(new Error(`CSV parse error: ${fatal.message}`));
            return;
          }
        }

        const headers =
          results.meta.fields?.map((h) => h.replace(/^\uFEFF/, "").trim()) ??
          [];

        const rows = (results.data ?? []).map((row) => {
          const normalized: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            normalized[key.replace(/^\uFEFF/, "").trim()] = String(value ?? "").trim();
          }
          return normalized;
        });

        resolve({
          headers,
          rows,
          fileName: file.name,
          totalRows: rows.length,
        });
      },
      error: (error) => reject(error),
    });
  });
}

export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Please upload a .csv file";
  }
  if (file.size > 25 * 1024 * 1024) {
    return "File size must be under 25MB";
  }
  return null;
}
