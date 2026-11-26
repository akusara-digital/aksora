"use client";

import { Sparkle, ArrowCounterClockwise, Trash, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AiDraftRestoredBannerProps {
  isProcessing?: boolean;
  hasDraft?: boolean;
  onDiscard?: () => void;
  className?: string;
  message?: string;
}

export function AiDraftRestoredBanner({
  isProcessing = false,
  hasDraft = false,
  onDiscard,
  className,
  message,
}: AiDraftRestoredBannerProps) {
  if (!isProcessing && !hasDraft) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 text-xs border rounded-none transition-all",
        isProcessing
          ? "border-blue-200 bg-blue-50/70 text-blue-900"
          : "border-emerald-200 bg-emerald-50/70 text-emerald-950",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isProcessing ? (
          <CircleNotch size={14} weight="bold" className="text-blue-600 animate-spin shrink-0" />
        ) : (
          <Sparkle size={14} weight="fill" className="text-emerald-600 shrink-0" />
        )}
        <span className="font-semibold truncate">
          {message ||
            (isProcessing
              ? "AI is structuring in background — your session is preserved even if closed."
              : "Restored previous AI draft session from browser cache.")}
        </span>
      </div>

      {!isProcessing && onDiscard && (
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer px-1.5 py-0.5 hover:bg-white/80 rounded"
          title="Discard cached draft and start fresh"
        >
          <Trash size={12} weight="bold" />
          <span>Discard</span>
        </button>
      )}
    </div>
  );
}
