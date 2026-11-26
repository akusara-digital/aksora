"use client";

import { Badge } from "@/components/shared/badge";
import { ModulePagination } from "@/components/module/module-pagination";
import { PAGE_SIZE } from "@/lib/pagination";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { DotsThree, Eye, PencilSimple, Trash } from "@phosphor-icons/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ModuleKey } from "@/lib/modules";

type TableRow = {
  id: string | number;
  status?: string;
  priority?: string;
  severity?: string;
  title?: string;
  caseName?: string;
  name?: string;
  code?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  assignee?: string;
  project?: string;
  [key: string]: unknown;
};

type Column = {
  key: string;
  label: string;
  tone?: "priority" | "severity" | "status";
};

type ModuleMobileCardsProps = {
  module: ModuleKey;
  shortTitle: string;
  rows: TableRow[];
  columns: Column[];
  safePage: number;
  totalPages: number;
  totalItems: number;
  canEdit: boolean;
  canDelete: boolean;
  onViewRow: (row: TableRow) => void;
  onEditRow: (row: TableRow) => void;
  onDeleteRow: (row: TableRow) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage?: (page: number) => void;
};

function CardActions({
  row: _row,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  }: {
  row: TableRow;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  void _row;
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; placement: "bottom" | "top" } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuWidth = 144;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const estHeight = 120;
    const placement: "bottom" | "top" =
      spaceBelow < estHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    setRect({
      top: placement === "bottom" ? r.bottom + 4 : r.top - 4,
      left: Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8)),
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className=" p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
      >
        <DotsThree size={18} weight="bold" />
      </button>
      {open &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: rect.placement === "bottom" ? rect.top : undefined,
              bottom: rect.placement === "top" ? window.innerHeight - rect.top : undefined,
              left: rect.left,
              zIndex: 99999,
            }}
            className="w-36 rounded-md border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in duration-150"
          >
            <button
              type="button"
              onClick={() => { onView(); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Eye size={14} weight="bold" /> View
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => { onEdit(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <PencilSimple size={14} weight="bold" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => { onDelete(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash size={14} weight="bold" /> Delete
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function ModuleMobileCards({
  module: _module,
  shortTitle,
  rows,
  columns: _columns,
  safePage,
  totalPages,
  totalItems,
  canEdit,
  canDelete,
  onViewRow,
  onEditRow,
  onDeleteRow,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: ModuleMobileCardsProps) {
  void _module;
  void _columns;
  const getTitle = (row: TableRow) => String(row.title || row.caseName || row.name || "-");

  if (rows.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-semibold text-gray-600">No {shortTitle} found</p>
        <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-24 pt-4">
      {rows.map((row, index) => (
        <div
          key={String(row.id)}
          onClick={() => onViewRow(row)}
          className="cursor-pointer  border border-gray-200 bg-white p-4 shadow-sm transition-all duration-150 active:scale-[0.98] "
        >
          {/* Top row: code + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {row.code || `#${(safePage - 1) * PAGE_SIZE + index + 1}`}
                </span>
                {row.status && <Badge value={String(row.status)} className="text-[9px] min-w-0 px-2" />}
              </div>
              <h4 className="mt-1.5 text-sm font-bold leading-snug text-gray-900 line-clamp-2">
                {getTitle(row)}
              </h4>
            </div>
            <CardActions
              row={row}
              canEdit={canEdit}
              canDelete={canDelete}
              onView={() => onViewRow(row)}
              onEdit={() => onEditRow(row)}
              onDelete={() => onDeleteRow(row)}
            />
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {row.priority && (
              <Badge value={String(row.priority)} className="text-[9px] min-w-0 px-2" />
            )}
            {row.severity && !row.priority && (
              <Badge value={String(row.severity)} className="text-[9px] min-w-0 px-2" />
            )}
            {row.project && (
              <span className=" bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                {String(row.project)}
              </span>
            )}
            {row.assignee && (
              <span className=" bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {String(row.assignee)}
              </span>
            )}
            {(row.updatedAt || row.createdAt) && (
              <span className="ml-auto text-[10px] text-gray-400" title={formatDate(String(row.updatedAt || row.createdAt))}>
                {formatRelativeTime(String(row.updatedAt || row.createdAt))}
              </span>
            )}
          </div>
        </div>
      ))}

      <ModulePagination
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPrev={onPrevPage}
        onNext={onNextPage}
        onGoToPage={onGoToPage}
      />
    </div>
  );
}

