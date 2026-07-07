"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn, truncate } from "@/lib/utils";

interface DataTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeight?: string;
  stickyHeader?: boolean;
  highlightColumns?: string[];
  emptyMessage?: string;
}

export function DataTable({
  headers,
  rows,
  maxHeight = "28rem",
  stickyHeader = true,
  highlightColumns,
  emptyMessage = "No data to display",
}: DataTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  if (headers.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700">
        {emptyMessage}
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const colCount = headers.length + 1;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div
        ref={parentRef}
        className="scrollbar-thin overflow-auto"
        style={{ maxHeight }}
      >
        <div className="min-w-max">
          <div
            className={cn(
              "grid border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80",
              stickyHeader && "sticky top-0 z-10 shadow-sm"
            )}
            style={{ gridTemplateColumns: `60px repeat(${headers.length}, minmax(140px, 1fr))` }}
          >
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              #
            </div>
            {headers.map((header) => (
              <div
                key={header}
                className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
                  highlightColumns?.includes(header)
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {header}
              </div>
            ))}
          </div>

          <div style={{ height: `${totalSize}px`, position: "relative" }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  className="absolute left-0 grid w-full border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: `60px repeat(${headers.length}, minmax(140px, 1fr))`,
                  }}
                >
                  <div className="flex items-center px-4 text-sm text-slate-400">
                    {virtualRow.index + 1}
                  </div>
                  {headers.map((header) => (
                    <div
                      key={header}
                      className="flex items-center truncate px-4 text-sm text-slate-700 dark:text-slate-300"
                      title={row[header] ?? ""}
                    >
                      {truncate(row[header] ?? "", 80) || "—"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        {rows.length.toLocaleString()} rows × {colCount - 1} columns
        {rows.length > 50 && " · Virtualized"}
      </div>
    </div>
  );
}

interface CrmTableProps {
  records: Record<string, string>[];
  columns: { key: string; label: string }[];
  maxHeight?: string;
  variant?: "success" | "warning";
}

export function CrmTable({
  records,
  columns,
  maxHeight = "24rem",
  variant = "success",
}: CrmTableProps) {
  const headers = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    keys.forEach((key, i) => {
      row[headers[i]] = record[key] ?? "";
    });
    return row;
  });

  return (
    <DataTable
      headers={headers}
      rows={rows}
      maxHeight={maxHeight}
      highlightColumns={
        variant === "success"
          ? headers.filter((h) =>
              ["Email", "Name", "Mobile", "Status"].includes(h)
            )
          : undefined
      }
      emptyMessage="No records"
    />
  );
}
