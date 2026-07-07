"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { DataTable, CrmTable } from "@/components/DataTable";
import { UploadZone, FileBadge } from "@/components/UploadZone";
import { StatsCards, ProgressPanel, ErrorAlert } from "@/components/StatsCards";
import { parseCsvFile } from "@/lib/csv";
import { importCsvAsync, streamJobProgress, ApiError } from "@/lib/api";
import type {
  AppStep,
  BatchProgress,
  ImportResult,
  ParsedCsv,
} from "@/types/crm";
import { CRM_DISPLAY_FIELDS } from "@/types/crm";

const STEPS = ["Upload", "Preview", "Import", "Results"];

function stepToIndex(step: AppStep): number {
  const map: Record<AppStep, number> = {
    upload: 0,
    preview: 1,
    processing: 2,
    results: 3,
  };
  return map[step];
}

export default function HomePage() {
  const [step, setStep] = useState<AppStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    setIsParsing(true);
    setFile(selectedFile);

    try {
      const parsed = await parseCsvFile(selectedFile);
      if (parsed.totalRows === 0) {
        setError("CSV file appears to be empty or has no data rows.");
        setFile(null);
        return;
      }
      setParsedCsv(parsed);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!file) return;

    setError(null);
    setStep("processing");

    try {
      const { jobId } = await importCsvAsync(file);

      cleanupRef.current = streamJobProgress(
        jobId,
        (p) => {
          setProgress(p);
          if (p.status === "completed" && p.result) {
            setResult(p.result);
            setStep("results");
          }
        },
        (err) => {
          setError(err.message);
          setStep("preview");
        }
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to start import. Is the backend running?";
      setError(message);
      setStep("preview");
    }
  }, [file]);

  const handleReset = useCallback(() => {
    cleanupRef.current?.();
    setStep("upload");
    setFile(null);
    setParsedCsv(null);
    setResult(null);
    setProgress(null);
    setError(null);
  }, []);

  const handleDownloadResults = useCallback(() => {
    if (!result) return;

    const headers = CRM_DISPLAY_FIELDS.map((f) => f.key);
    const csvContent = [
      headers.join(","),
      ...result.imported.map((record) =>
        headers
          .map((h) => {
            const val = record[h as keyof typeof record] ?? "";
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `groweasy-import-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const skippedRows = result?.skipped.map((s) => ({
    "Row #": String(s.rowIndex),
    Reason: s.reason,
    ...s.raw,
  })) ?? [];

  const skippedHeaders =
    skippedRows.length > 0
      ? Object.keys(skippedRows[0])
      : ["Row #", "Reason"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-brand-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950/10">
      <Header step={stepToIndex(step)} steps={STEPS} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && step !== "processing" && (
          <div className="mb-6">
            <ErrorAlert
              message={error}
              onRetry={step === "preview" ? handleConfirmImport : undefined}
            />
          </div>
        )}

        {step === "upload" && (
          <section className="animate-in fade-in duration-300">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Import leads from any CSV
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
                Upload your CSV and our AI will intelligently map columns to
                GrowEasy CRM format — Facebook leads, Google Ads, Excel sheets,
                and more.
              </p>
            </div>
            <UploadZone
              onFileSelect={handleFileSelect}
              disabled={isParsing}
            />
            {isParsing && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Parsing CSV…
              </p>
            )}
          </section>
        )}

        {step === "preview" && parsedCsv && (
          <section className="animate-in fade-in duration-300">
            <div className="mb-6">
              <FileBadge
                fileName={parsedCsv.fileName}
                rowCount={parsedCsv.totalRows}
                onClear={handleReset}
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Preview your data
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Review the uploaded rows before AI processing
                </p>
              </div>
            </div>

            <DataTable
              headers={parsedCsv.headers}
              rows={parsedCsv.rows}
              maxHeight="32rem"
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Upload different file
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:from-brand-600 hover:to-brand-700"
              >
                <Sparkles className="h-4 w-4" />
                Confirm & Import with AI
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === "processing" && progress && (
          <section className="animate-in fade-in duration-300 py-12">
            <ProgressPanel progress={progress} />
          </section>
        )}

        {step === "results" && result && (
          <section className="animate-in fade-in duration-300 space-y-8">
            <StatsCards
              imported={result.totalImported}
              skipped={result.totalSkipped}
              total={result.totalProcessed}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Import complete
                </h2>
                <p className="text-sm text-slate-500">
                  AI-mapped CRM records ready for GrowEasy
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadResults}
                  disabled={result.totalImported === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  New import
                </button>
              </div>
            </div>

            {result.totalImported > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                  Successfully imported ({result.totalImported})
                </h3>
                <CrmTable
                  records={result.imported as unknown as Record<string, string>[]}
                  columns={CRM_DISPLAY_FIELDS}
                  maxHeight="28rem"
                  variant="success"
                />
              </div>
            )}

            {result.totalSkipped > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-amber-700 dark:text-amber-400">
                  Skipped records ({result.totalSkipped})
                </h3>
                <DataTable
                  headers={skippedHeaders}
                  rows={skippedRows}
                  maxHeight="20rem"
                  emptyMessage="No skipped records"
                />
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
        GrowEasy CSV Importer · Built for intelligent CRM lead extraction
      </footer>
    </div>
  );
}
