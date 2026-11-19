"use client";

import { useState, useRef, useEffect } from "react";
import {
  Lightning,
  CaretDown,
  Clock,
  ClipboardText,
  CalendarCheck,
  ArrowsClockwise,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface WorkLogToolsMenuProps {
  onOpenPull: () => void;
  onCopyStandup: () => void;
  onOpenAudit: () => void;
  onSyncSicmundus: () => void;
  copying: boolean;
  syncingSicmundus: boolean;
  activeModel?: string;
}

export function WorkLogToolsMenu({
  onOpenPull,
  onCopyStandup,
  onOpenAudit,
  onSyncSicmundus,
  copying,
  syncingSicmundus,
  activeModel,
}: WorkLogToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition shadow-xs cursor-pointer",
          isOpen
            ? "border-blue-300 bg-blue-50/50 text-blue-700"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Automations & Integrations"
      >
        <Lightning size={14} weight="bold" className="text-amber-500 shrink-0" />
        <span>Tools</span>
        <CaretDown size={11} weight="bold" className="text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-1 w-64 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Work Log Automations
            </p>
          </div>

          <div className="py-1">
            {/* 1. Pull Today's QA Activity */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPull();
              }}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-violet-50 hover:text-violet-900 transition cursor-pointer"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                <Clock size={13} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">Pull QA Activity</p>
                <p className="text-[11px] text-gray-400 truncate">
                  Import today&apos;s verified test runs & bugs
                </p>
              </div>
            </button>

            {/* 2. Copy Standup */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCopyStandup();
              }}
              disabled={copying}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-sky-50 hover:text-sky-900 transition cursor-pointer disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                <ClipboardText size={13} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">
                  {copying ? "Copying..." : "Copy Standup"}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  Format for Slack or Teams message
                </p>
              </div>
            </button>

            {/* 3. Timesheet Audit */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAudit();
              }}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition cursor-pointer"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <CalendarCheck size={13} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">Audit Timesheet</p>
                <p className="text-[11px] text-gray-400 truncate">
                  Monthly missing hours calendar
                </p>
              </div>
            </button>

            {/* 4. Sync Sicmundus */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSyncSicmundus();
              }}
              disabled={syncingSicmundus}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-900 transition cursor-pointer disabled:opacity-50"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={cn(syncingSicmundus && "animate-spin")}
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">
                  {syncingSicmundus ? "Syncing..." : "Sync Sicmundus"}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  Bi-directional external timesheet sync
                </p>
              </div>
            </button>
          </div>

          {activeModel && (
            <div className="border-t border-gray-100 px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-400">
              <span className="flex items-center gap-1 font-medium">
                <Sparkle size={10} weight="bold" className="text-blue-500" />
                AI Model
              </span>
              <span className="font-mono text-[9px] bg-gray-50 border border-gray-200/80 rounded px-1.5 py-0.5 text-gray-600">
                {activeModel}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
