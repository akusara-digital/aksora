"use client";

import { XCircle, Sparkle, ArrowRight } from "@phosphor-icons/react";

interface RunPlayFailureBannerProps {
  onAutoDraftBug: () => void;
  onContinue: () => void;
}

export function RunPlayFailureBanner({
  onAutoDraftBug,
  onContinue,
}: RunPlayFailureBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/50 via-rose-900/30 to-slate-900/60 p-3.5 shadow-lg shadow-rose-950/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle size={18} weight="bold" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-300 leading-snug">
              Test Case Marked as Failed
            </h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Draft an engineering bug report with AI or proceed to the next test case.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAutoDraftBug}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition active:scale-95"
          >
            <Sparkle size={14} weight="bold" />
            <span>Auto-Draft Bug with AI</span>
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/15 hover:text-white transition active:scale-95"
          >
            <span>Continue to Next Case (J / →)</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
