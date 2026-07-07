import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import type { BatchProgress, ImportResult } from "../types/crm.js";
import { chunkArray, parseCsvBuffer } from "./csvParser.js";
import { AiExtractor, extractWithRetry } from "./aiExtractor.js";
import {
  completeJob,
  createJobRecord,
  failJob,
  getJob as getStoredJob,
  updateJobProgress,
} from "../database.js";

const jobs = new Map<string, BatchProgress>();

type ProgressCallback = (progress: BatchProgress) => void;

export function getJob(jobId: string): BatchProgress | undefined {
  return getStoredJob(jobId);
}

export function createImportJob(
  buffer: Buffer,
  onProgress?: ProgressCallback
): string {
  const jobId = uuidv4();
  const { headers, rows, totalRows } = parseCsvBuffer(buffer);
  const batches = chunkArray(rows, config.batchSize);

  const progress: BatchProgress = {
    jobId,
    status: "pending",
    totalRows,
    processedRows: 0,
    totalBatches: batches.length,
    completedBatches: 0,
    currentBatch: 0,
  };

  jobs.set(jobId, progress);
  createJobRecord(jobId, totalRows, batches.length);

  processJob(jobId, headers, batches, onProgress).catch((error) => {
    const job = getStoredJob(jobId);
    if (job) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      jobs.set(jobId, job);
      onProgress?.(job);
      failJob(jobId, error);
    }
  });

  return jobId;
}

async function processJob(
  jobId: string,
  headers: string[],
  batches: ReturnType<typeof chunkArray<import("../types/crm.js").RawCsvRow>>,
  onProgress?: ProgressCallback
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";
  jobs.set(jobId, job);
  onProgress?.(job);

  const extractor = new AiExtractor();
  const imported: ImportResult["imported"] = [];
  const skipped: ImportResult["skipped"] = [];

  for (let i = 0; i < batches.length; i++) {
    job.currentBatch = i + 1;
    onProgress?.(job);
    updateJobProgress(job);

    const batch = batches[i];
    const result = await extractWithRetry(
      extractor,
      headers,
      batch,
      config.maxRetries
    );

    imported.push(...result.imported);
    skipped.push(...result.skipped);

    job.processedRows += batch.length;
    job.completedBatches = i + 1;
    jobs.set(jobId, job);
    updateJobProgress(job);
    onProgress?.(job);
  }

  job.status = "completed";
  job.result = {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    totalProcessed: job.totalRows,
  };
  jobs.set(jobId, job);
  onProgress?.(job);
  completeJob(jobId, job.result);

  setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000);
}

export async function processImportSync(buffer: Buffer): Promise<ImportResult> {
  const { headers, rows } = parseCsvBuffer(buffer);
  const batches = chunkArray(rows, config.batchSize);
  const extractor = new AiExtractor();

  const imported: ImportResult["imported"] = [];
  const skipped: ImportResult["skipped"] = [];

  for (const batch of batches) {
    const result = await extractWithRetry(
      extractor,
      headers,
      batch,
      config.maxRetries
    );
    imported.push(...result.imported);
    skipped.push(...result.skipped);
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    totalProcessed: rows.length,
  };
}

export function subscribeToJob(
  jobId: string,
  callback: ProgressCallback
): () => void {
  const job = jobs.get(jobId);
  if (job) callback(job);

  const interval = setInterval(() => {
    const current = jobs.get(jobId);
    if (current) callback(current);
    if (!current || current.status === "completed" || current.status === "failed") {
      clearInterval(interval);
    }
  }, 500);

  return () => clearInterval(interval);
}
