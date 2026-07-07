import Database from "better-sqlite3";
import { config } from "./config.js";
import type { BatchProgress, ImportResult } from "./types/crm.js";

interface JobRow {
  job_id: string;
  status: BatchProgress["status"];
  total_rows: number;
  processed_rows: number;
  total_batches: number;
  completed_batches: number;
  current_batch: number;
  result_json: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.prepare(
  `CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    total_rows INTEGER NOT NULL,
    processed_rows INTEGER NOT NULL,
    total_batches INTEGER NOT NULL,
    completed_batches INTEGER NOT NULL,
    current_batch INTEGER NOT NULL,
    result_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS imported_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    created_at TEXT,
    name TEXT,
    email TEXT,
    country_code TEXT,
    mobile_without_country_code TEXT,
    company TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    lead_owner TEXT,
    crm_status TEXT,
    crm_note TEXT,
    data_source TEXT,
    possession_time TEXT,
    description TEXT,
    FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS skipped_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    reason TEXT NOT NULL,
    raw TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
  )`
).run();

const insertJob = db.prepare(
  `INSERT INTO jobs (
    job_id, status, total_rows, processed_rows, total_batches,
    completed_batches, current_batch, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const updateJobProgressStmt = db.prepare(
  `UPDATE jobs
   SET status = ?, processed_rows = ?, completed_batches = ?, current_batch = ?, updated_at = ?
   WHERE job_id = ?`
);

const completeJobStmt = db.prepare(
  `UPDATE jobs
   SET status = ?, result_json = ?, processed_rows = ?, completed_batches = ?, current_batch = ?, updated_at = ?
   WHERE job_id = ?`
);

const failJobStmt = db.prepare(
  `UPDATE jobs
   SET status = ?, error = ?, updated_at = ?
   WHERE job_id = ?`
);

const selectJobStmt = db.prepare(`SELECT * FROM jobs WHERE job_id = ?`);

const insertImportedRecordStmt = db.prepare(
  `INSERT INTO imported_records (
    job_id, row_index, created_at, name, email, country_code,
    mobile_without_country_code, company, city, state, country,
    lead_owner, crm_status, crm_note, data_source, possession_time, description
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertSkippedRecordStmt = db.prepare(
  `INSERT INTO skipped_records (job_id, row_index, reason, raw)
   VALUES (?, ?, ?, ?)`
);

function now(): string {
  return new Date().toISOString();
}

export function createJobRecord(
  jobId: string,
  totalRows: number,
  totalBatches: number
): void {
  insertJob.run(
    jobId,
    "pending",
    totalRows,
    0,
    totalBatches,
    0,
    0,
    now(),
    now()
  );
}

export function updateJobProgress(job: BatchProgress): void {
  updateJobProgressStmt.run(
    job.status,
    job.processedRows,
    job.completedBatches,
    job.currentBatch,
    now(),
    job.jobId
  );
}

export function completeJob(jobId: string, result: ImportResult): void {
  const row = selectJobStmt.get(jobId) as JobRow | undefined;
  const resultJson = JSON.stringify(result);
  completeJobStmt.run(
    "completed",
    resultJson,
    result.totalProcessed,
    row?.total_batches ?? 0,
    row?.total_batches ?? 0,
    now(),
    jobId
  );

  const insertImported = db.transaction((records: ImportResult["imported"]) => {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      insertImportedRecordStmt.run(
        jobId,
        i + 1,
        record.created_at,
        record.name,
        record.email,
        record.country_code,
        record.mobile_without_country_code,
        record.company,
        record.city,
        record.state,
        record.country,
        record.lead_owner,
        record.crm_status,
        record.crm_note,
        record.data_source,
        record.possession_time,
        record.description
      );
    }
  });

  const insertSkipped = db.transaction((skipped: ImportResult["skipped"]) => {
    for (const item of skipped) {
      insertSkippedRecordStmt.run(
        jobId,
        item.rowIndex,
        item.reason,
        JSON.stringify(item.raw)
      );
    }
  });

  insertImported(result.imported);
  insertSkipped(result.skipped);
}

export function failJob(jobId: string, error: Error | string): void {
  failJobStmt.run("failed", String(error), now(), jobId);
}

export function getJob(jobId: string): BatchProgress | undefined {
  const row = selectJobStmt.get(jobId) as JobRow | undefined;
  if (!row) return undefined;

  const progress: BatchProgress = {
    jobId: row.job_id,
    status: row.status,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    totalBatches: row.total_batches,
    completedBatches: row.completed_batches,
    currentBatch: row.current_batch,
  };

  if (row.status === "completed" && row.result_json) {
    try {
      progress.result = JSON.parse(row.result_json) as ImportResult;
    } catch {
      progress.result = undefined;
    }
  }

  if (row.status === "failed") {
    progress.error = row.error ?? undefined;
  }

  return progress;
}
