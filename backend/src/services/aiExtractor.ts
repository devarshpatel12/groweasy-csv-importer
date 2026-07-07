import OpenAI from "openai";
import { z } from "zod";
import { config } from "../config.js";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "../prompts/extractionPrompt.js";
import {
  CRM_STATUSES,
  DATA_SOURCES,
  type CrmRecord,
  type RawCsvRow,
  emptyCrmRecord,
} from "../types/crm.js";
import { hasContactInfo } from "./csvParser.js";

const aiRecordSchema = z.object({
  rowIndex: z.number(),
  status: z.enum(["imported", "skipped"]),
  reason: z.string().optional(),
  data: z.record(z.string()).optional(),
});

const aiResponseSchema = z.object({
  records: z.array(aiRecordSchema),
});

export interface ExtractionBatchResult {
  imported: CrmRecord[];
  skipped: Array<{ rowIndex: number; reason: string; raw: Record<string, string> }>;
}

function sanitizeCrmRecord(raw: Record<string, string | undefined>): CrmRecord {
  const record: Record<string, string> = { ...emptyCrmRecord() };

  for (const key of Object.keys(record)) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      record[key] = String(value).trim();
    }
  }

  const base = record as unknown as CrmRecord;

  if (base.crm_status && !CRM_STATUSES.includes(base.crm_status as (typeof CRM_STATUSES)[number])) {
    base.crm_note = [base.crm_note, `Original status: ${base.crm_status}`]
      .filter(Boolean)
      .join(" | ");
    base.crm_status = "";
  }

  if (base.data_source && !DATA_SOURCES.includes(base.data_source as (typeof DATA_SOURCES)[number])) {
    base.crm_note = [base.crm_note, `Original source: ${base.data_source}`]
      .filter(Boolean)
      .join(" | ");
    base.data_source = "";
  }

  if (base.created_at) {
    const parsed = new Date(base.created_at);
    if (isNaN(parsed.getTime())) {
      base.crm_note = [base.crm_note, `Unparseable date: ${base.created_at}`]
        .filter(Boolean)
        .join(" | ");
      base.created_at = "";
    }
  }

  return base;
}

function fallbackExtract(row: RawCsvRow): CrmRecord | null {
  const data = row.data;
  const lowerKeys = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k.toLowerCase(), v])
  );

  const findValue = (...patterns: RegExp[]): string => {
    for (const [key, value] of Object.entries(lowerKeys)) {
      if (patterns.some((p) => p.test(key)) && value) return value;
    }
    return "";
  };

  const record = emptyCrmRecord();
  record.name = findValue(/name|contact|lead/);
  record.email = findValue(/email|e-mail|mail/);
  record.mobile_without_country_code = findValue(/phone|mobile|cell|whatsapp|tel/);
  record.company = findValue(/company|organization|business|org/);
  record.city = findValue(/city|town/);
  record.state = findValue(/state|province|region/);
  record.country = findValue(/^country$|nation/);
  record.created_at = findValue(/created|date|time|timestamp|submitted/);
  record.crm_note = findValue(/note|comment|remark|description/);
  record.lead_owner = findValue(/owner|assigned|agent|rep/);

  if (!hasContactInfo(record)) return null;
  return record;
}

export class AiExtractor {
  private primaryClient: OpenAI | null;
  private secondaryClient: OpenAI | null;

  constructor() {
    this.primaryClient = config.openaiApiKey
      ? new OpenAI({
          apiKey: config.openaiApiKey,
          baseURL: config.openaiBaseUrl,
        })
      : null;

    this.secondaryClient = config.openaiSecondaryApiKey
      ? new OpenAI({
          apiKey: config.openaiSecondaryApiKey,
          baseURL: config.openaiSecondaryBaseUrl,
        })
      : null;
  }

  async extractBatch(
    headers: string[],
    rows: RawCsvRow[]
  ): Promise<ExtractionBatchResult> {
    const userPrompt = buildUserPrompt(headers, rows);
    const clients = [
      { client: this.primaryClient, label: "primary" },
      { client: this.secondaryClient, label: "secondary" },
    ].filter((entry): entry is { client: OpenAI; label: string } =>
      Boolean(entry.client)
    );

    if (clients.length === 0) {
      console.warn("No AI provider configured; using free heuristic fallback.");
      return this.fallbackBatch(rows);
    }

    let lastError: Error | null = null;

    for (const { client, label } of clients) {
      try {
        const response = await client.chat.completions.create({
          model: config.openaiModel,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from AI model");
        }

        return this.parseAiResponse(content, rows);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`AI extraction failed with ${label} provider:`, lastError.message);
      }
    }

    if (config.openaiFallbackMode) {
      console.warn("All AI providers failed; using free heuristic fallback.");
      return this.fallbackBatch(rows);
    }

    throw lastError ?? new Error("AI extraction failed and no fallback mode is enabled.");
  }

  private parseAiResponse(
    content: string,
    originalRows: RawCsvRow[]
  ): ExtractionBatchResult {
    const parsed = JSON.parse(content);
    const validated = aiResponseSchema.safeParse(parsed);

    if (!validated.success) {
      throw new Error(`Invalid AI response format: ${validated.error.message}`);
    }

    const rowMap = new Map(originalRows.map((r) => [r.rowIndex, r]));
    const imported: CrmRecord[] = [];
    const skipped: ExtractionBatchResult["skipped"] = [];
    const processedIndices = new Set<number>();

    for (const item of validated.data.records) {
      processedIndices.add(item.rowIndex);
      const rawRow = rowMap.get(item.rowIndex);

      if (item.status === "skipped" || !item.data) {
        skipped.push({
          rowIndex: item.rowIndex,
          reason: item.reason ?? "Skipped by AI",
          raw: rawRow?.data ?? {},
        });
        continue;
      }

      const record = sanitizeCrmRecord(item.data);

      if (!hasContactInfo(record)) {
        skipped.push({
          rowIndex: item.rowIndex,
          reason: "Missing both email and mobile number",
          raw: rawRow?.data ?? {},
        });
        continue;
      }

      imported.push(record);
    }

    for (const row of originalRows) {
      if (!processedIndices.has(row.rowIndex)) {
        const fallback = fallbackExtract(row);
        if (fallback) {
          imported.push(fallback);
        } else {
          skipped.push({
            rowIndex: row.rowIndex,
            reason: "Not processed by AI and no contact info found",
            raw: row.data,
          });
        }
      }
    }

    return { imported, skipped };
  }

  private fallbackBatch(rows: RawCsvRow[]): ExtractionBatchResult {
    const imported: CrmRecord[] = [];
    const skipped: ExtractionBatchResult["skipped"] = [];

    for (const row of rows) {
      const record = fallbackExtract(row);
      if (record) {
        imported.push(record);
      } else {
        skipped.push({
          rowIndex: row.rowIndex,
          reason: "Missing both email and mobile number (fallback mode)",
          raw: row.data,
        });
      }
    }

    return { imported, skipped };
  }
}

export async function extractWithRetry(
  extractor: AiExtractor,
  headers: string[],
  rows: RawCsvRow[],
  maxRetries: number
): Promise<ExtractionBatchResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractor.extractBatch(headers, rows);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Extraction failed after retries");
}
