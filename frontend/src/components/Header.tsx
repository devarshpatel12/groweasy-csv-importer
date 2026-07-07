"use client";

import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface HeaderProps {
  step: number;
  steps: string[];
}

export function Header({ step, steps }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              GrowEasy CSV Importer
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI-powered CRM lead extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-1 sm:flex">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    i <= step
                      ? "bg-brand-500 text-white"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium md:inline",
                    i <= step
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400"
                  )}
                >
                  {label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-px w-6",
                      i < step
                        ? "bg-brand-400"
                        : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )}
              </div>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
