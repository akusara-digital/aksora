"use client";

import { Sparkle, PencilSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type BugCreateMode = "manual" | "ai";

interface BugModalModeSelectorProps {
  mode: BugCreateMode;
  onChange: (mode: BugCreateMode) => void;
}

export function BugModalModeSelector({ mode, onChange }: BugModalModeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Mobile compact select menu */}
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as BugCreateMode)}
        className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-800 outline-none sm:hidden"
        aria-label="Creation Mode"
      >
        <option value="ai">By AI (Fast)</option>
        <option value="manual">Manual</option>
      </select>

      {/* Desktop segmented buttons */}
      <div className="hidden sm:inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onChange("ai")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer",
            mode === "ai"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-gray-500 hover:text-blue-600",
          )}
        >
          <Sparkle size={13} weight="bold" className="text-blue-600" />
          <span>By AI (Fast)</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("manual")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer",
            mode === "manual"
              ? "bg-white text-gray-900 shadow-xs"
              : "text-gray-500 hover:text-gray-900",
          )}
        >
          <PencilSimple size={13} weight="bold" />
          <span>Manual</span>
        </button>
      </div>
    </div>
  );
}
