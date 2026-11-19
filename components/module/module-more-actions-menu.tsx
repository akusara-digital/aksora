"use client";

import { useState, useRef, useEffect } from "react";
import {
  DotsThreeVertical,
  FileXls,
  FilePdf,
  UploadSimple,
  SlidersHorizontal,
  Check,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Column = {
  key: string;
  label: string;
};

interface ModuleMoreActionsMenuProps {
  module: string;
  canAdd: boolean;
  onImportFile?: (file: File) => void;
  allColumns?: Column[];
  visibleColumnKeys?: string[];
  onToggleColumn?: (key: string) => void;
  onResetColumns?: () => void;
}

export function ModuleMoreActionsMenu({
  module,
  canAdd,
  onImportFile,
  allColumns,
  visibleColumnKeys,
  onToggleColumn,
  onResetColumns,
}: ModuleMoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowColumns(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setShowColumns(false);
        }}
        title="More actions & export"
        aria-label="More actions"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-xs",
          open && "bg-gray-100 text-gray-900 border-gray-300",
        )}
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {!showColumns ? (
            <>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Export & Utilities
              </div>

              <a
                href={`/api/export/${module}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
              >
                <FileXls size={15} weight="bold" className="text-emerald-600 shrink-0" />
                <span>Export to Excel (.xlsx)</span>
              </a>

              <a
                href={`/api/export/${module}?format=pdf`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition"
              >
                <FilePdf size={15} weight="bold" className="text-rose-600 shrink-0" />
                <span>Export / Print PDF</span>
              </a>

              {canAdd && onImportFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition cursor-pointer"
                >
                  <UploadSimple size={15} weight="bold" className="text-blue-600 shrink-0" />
                  <span>Import from Excel</span>
                </button>
              )}

              {allColumns && allColumns.length > 0 && onToggleColumn && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => setShowColumns(true)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <SlidersHorizontal size={15} weight="bold" className="text-gray-500 shrink-0" />
                      <span>Customize Columns</span>
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                      {visibleColumnKeys?.length || allColumns.length}/{allColumns.length}
                    </span>
                  </button>
                </>
              )}
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setShowColumns(false)}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  &larr; Back
                </button>
                {onResetColumns && (
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto px-1 py-1">
                {allColumns?.map((col) => {
                  const isVisible = visibleColumnKeys?.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => onToggleColumn?.(col.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs font-medium transition cursor-pointer",
                        isVisible
                          ? "text-gray-900 hover:bg-gray-50"
                          : "text-gray-400 hover:bg-gray-50 line-through",
                      )}
                    >
                      <span>{col.label}</span>
                      {isVisible && <Check size={13} weight="bold" className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input for import */}
      {canAdd && onImportFile && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImportFile(file);
              setOpen(false);
            }
            event.target.value = "";
          }}
        />
      )}
    </div>
  );
}
