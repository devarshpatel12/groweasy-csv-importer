"use client";

import { AlertCircle, CheckCircle2, Loader2, SkipForward } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { BatchProgress } from "@/types/crm";

interface StatsCardsProps {
  imported: number;
  skipped: number;
  total: number;
}

export function StatsCards({ imported, skipped, total }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Processed",
      value: total,
      icon: CheckCircle2,
      color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40",
    },
    {
      label: "Imported",
      value: imported,
      icon: CheckCircle2,
      color: "text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-950/40",
    },
    {
      label: "Skipped",
      value: skipped,
      icon: SkipForward,
      color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="glass rounded-xl p-5 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {formatNumber(value)}
              </p>
            </div>
            <div className={cn("rounded-xl p-3", color)}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProgressPanelProps {
  progress: BatchProgress;
}

export function ProgressPanel({ progress }: ProgressPanelProps) {
  const percent =
    progress.totalRows > 0
      ? Math.round((progress.processedRows / progress.totalRows) * 100)
      : 0;

  const batchPercent =
    progress.totalBatches > 0
      ? Math.round((progress.completedBatches / progress.totalBatches) * 100)
      : 0;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="glass rounded-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          AI is mapping your leads…
        </h2>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Processing batch {progress.currentBatch} of {progress.totalBatches}
        </p>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Rows processed</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {formatNumber(progress.processedRows)} / {formatNumber(progress.totalRows)}
          </span>
        </div>
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">AI batches</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {progress.completedBatches} / {progress.totalBatches}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-brand-300 transition-all duration-500 ease-out dark:bg-brand-700"
            style={{ width: `${batchPercent}%` }}
          />
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Intelligent field mapping with automatic retry on failures
        </p>
      </div>
    </div>
  );
}

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="font-medium text-red-800 dark:text-red-300">Something went wrong</p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
