"use client";

import { Sparkle, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AiDraftRestoredBannerProps {
  isProcessing?: boolean;
  hasDraft?: boolean;
  domain?: string;
  draftTitle?: string;
  onReview?: () => void;
  onDiscard?: () => void;
  className?: string;
  message?: string;
}

export function AiDraftRestoredBanner({
  hasDraft = false,
  draftTitle,
  onReview,
  onDiscard,
  className,
  message,
}: AiDraftRestoredBannerProps) {
  if (!hasDraft) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3.5 py-2 text-xs border border-emerald-200 bg-emerald-50/80 rounded-md transition-all shadow-2xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkle size={14} weight="fill" className="text-emerald-600 shrink-0" />
        <span className="font-medium text-emerald-950 truncate">
          {message || (
            draftTitle ? (
              <>
                Restored draft: <strong className="font-semibold text-emerald-900">{draftTitle}</strong>
              </>
            ) : (
              "Restored previous AI draft session."
            )
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onReview && (
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition cursor-pointer shadow-2xs"
          >
            <span>Review & Edit</span>
          </button>
        )}
        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-white/80 rounded px-2 py-1 transition cursor-pointer"
            title="Discard cached draft and start fresh"
          >
            <Trash size={12} weight="bold" />
            <span>Discard</span>
          </button>
        )}
      </div>
    </div>
  );
}
