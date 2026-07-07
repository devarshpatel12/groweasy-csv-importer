"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { validateCsvFile } from "@/lib/csv";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateCsvFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "group relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200",
          isDragging
            ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/30"
            : "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600 dark:hover:bg-brand-950/20",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 transition group-hover:scale-105 dark:bg-brand-900/40">
          <Upload className="h-8 w-8 text-brand-600 dark:text-brand-400" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
          Drop your CSV here
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          or click to browse files
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Supports Facebook Leads, Google Ads, Excel exports, CRM dumps & more
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: FileSpreadsheet, label: "Any CSV format", desc: "Flexible column mapping" },
          { icon: Upload, label: "Up to 25MB", desc: "Large file support" },
          { icon: FileSpreadsheet, label: "AI extraction", desc: "Smart field detection" },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="glass rounded-xl p-4 text-center"
          >
            <Icon className="mx-auto mb-2 h-5 w-5 text-brand-500" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {label}
            </p>
            <p className="text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FileBadgeProps {
  fileName: string;
  rowCount: number;
  onClear: () => void;
}

export function FileBadge({ fileName, rowCount, onClear }: FileBadgeProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
          <FileSpreadsheet className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{fileName}</p>
          <p className="text-sm text-slate-500">
            {formatNumber(rowCount)} rows detected
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        aria-label="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
