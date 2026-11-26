"use client";

import { Clock, PencilSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type WorkLogCreateMode = "manual" | "gap_fill";

interface WorkLogModalModeSelectorProps {
  mode: WorkLogCreateMode;
  onChange: (mode: WorkLogCreateMode) => void;
  remainingHours?: string;
}

export function WorkLogModalModeSelector({
  mode,
  onChange,
  remainingHours,
}: WorkLogModalModeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Mobile compact select menu */}
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as WorkLogCreateMode)}
        className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none sm:hidden"
        aria-label="Work Log Entry Mode"
      >
        <option value="manual">Manual Entry</option>
        <option value="gap_fill">
          {remainingHours ? `Fill Daily Gap (+${remainingHours}h)` : "Fill Daily Gap"}
        </option>
      </select>

      {/* Desktop segmented buttons */}
      <div className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onChange("manual")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer",
            mode === "manual"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-900"
          )}
        >
          <PencilSimple size={13} weight="bold" />
          <span>Manual Entry</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("gap_fill")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer",
            mode === "gap_fill"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-500 hover:text-blue-600"
          )}
        >
          <Clock size={13} weight="bold" className="text-blue-600" />
          <span>Fill Daily Gap {remainingHours ? `(+${remainingHours}h)` : ""}</span>
        </button>
      </div>
    </div>
  );
}
