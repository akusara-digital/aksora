"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  Trash,
  X,
  CircleNotch,
} from "@phosphor-icons/react";

interface TestCaseBulkBarProps {
  selectedCount: number;
  onBulkStatus: (status: string) => Promise<void>;
  onBulkPriority: (priority: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
}

export function TestCaseBulkBar({
  selectedCount,
  onBulkStatus,
  onBulkPriority,
  onBulkDelete,
  onClearSelection,
}: TestCaseBulkBarProps) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  const handleStatus = async (status: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onBulkStatus(status);
    } finally {
      setBusy(false);
    }
  };

  const handlePriority = async (priority: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onBulkPriority(priority);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onBulkDelete();
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 border-r border-slate-700 pr-3 font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
          {selectedCount}
        </span>
        <span className="text-slate-200">selected</span>
      </div>

      {busy ? (
        <div className="flex items-center gap-2 px-3 text-slate-300">
          <CircleNotch size={14} className="animate-spin text-blue-400" />
          <span>Updating cases...</span>
        </div>
      ) : confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-rose-300 font-medium">Delete {selectedCount} case(s)?</span>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Status selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => handleStatus("Passed")}
              className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-emerald-950/80 hover:text-emerald-300 px-2 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
              title="Mark as Passed"
            >
              <CheckCircle size={12} weight="fill" className="text-emerald-400" />
              Passed
            </button>
            <button
              type="button"
              onClick={() => handleStatus("Failed")}
              className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 px-2 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
              title="Mark as Failed"
            >
              <XCircle size={12} weight="fill" className="text-rose-400" />
              Failed
            </button>
            <button
              type="button"
              onClick={() => handleStatus("Blocked")}
              className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-amber-950/80 hover:text-amber-300 px-2 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
              title="Mark as Blocked"
            >
              <Warning size={12} weight="fill" className="text-amber-400" />
              Blocked
            </button>
            <button
              type="button"
              onClick={() => handleStatus("Pending")}
              className="inline-flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition cursor-pointer"
              title="Reset to Pending"
            >
              <Clock size={12} weight="fill" className="text-slate-400" />
              Pending
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Priority selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1">Priority:</span>
            <select
              aria-label="Bulk priority selector"
              onChange={(e) => {
                if (e.target.value) {
                  handlePriority(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="h-7 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200 outline-none hover:bg-slate-700 cursor-pointer"
            >
              <option value="" disabled>Change...</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Delete button */}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 transition cursor-pointer"
            title="Delete selected test cases"
          >
            <Trash size={14} />
            <span>Delete</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onClearSelection}
        className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        title="Deselect all (Esc)"
        aria-label="Clear selection"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
