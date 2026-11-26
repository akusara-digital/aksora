"use client";

import { useState } from "react";
import Link from "next/link";
import { SicmundusSyncModal } from "@/components/tasks/sicmundus-sync-modal";
import { workLogToSicmundusProp } from "@/components/tasks/sicmundus-sync-parts";

type Row = Record<string, string | number | unknown>;

type ModuleRowActionsProps = {
  module: string;
  row: Row;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onSyncSicmundus?: () => void;
};

export function ModuleRowActions({
  module,
  row,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onReopen,
  onDelete,
  onSyncSicmundus,
}: ModuleRowActionsProps) {
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const publicToken = String(row.publicToken ?? "");
  const isClosedBug = module === "bugs" && (String(row.status) === "closed" || String(row.status) === "fixed");

  const taskProp = workLogToSicmundusProp(row);

  return (
    <>
      <div className="flex items-center gap-2">
        {module === "work-logs" && (
          <div className="flex items-center gap-1.5">
            {row.sicmundusEntryId ? (
              <span
                className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700"
                title={`Synced to Sicmundus (Entry: ${row.sicmundusEntryId})`}
              >
                ✓ Sicmundus
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (onSyncSicmundus) onSyncSicmundus();
                else setIsSyncOpen(true);
              }}
              className="rounded-sm border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
              title={row.sicmundusEntryId ? "Re-sync / edit in Sicmundus" : "Sync to Sicmundus"}
            >
              {row.sicmundusEntryId ? "Re-sync" : "Sync"}
            </button>
          </div>
        )}
        {module === "test-suites" && (
          <Link
            href={`/test-execution/${publicToken}`}
            className="rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Execute
          </Link>
        )}
        {module === "test-plans" && publicToken && (
          <Link
            href={`/test-plans/${publicToken}`}
            className="rounded-sm bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 inline-flex items-center gap-1"
          >
            Open Plan
          </Link>
        )}
        {module === "test-cases" && publicToken && (
          <Link
            href={`/test-cases/detail/${publicToken}`}
            className="rounded-sm border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 inline-flex items-center gap-1"
          >
            Details
          </Link>
        )}
        {!["users", "assignees"].includes(module) && (
          <button
            type="button"
            onClick={onView}
            className="rounded-sm border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            View
          </button>
        )}
        {canEdit && module !== "sprints" && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-sm border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Edit
          </button>
        )}
        {isClosedBug && canEdit && (
          <button
            type="button"
            onClick={onReopen}
            className="rounded-sm border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
          >
            Re-open
          </button>
        )}
        {canDelete && module !== "sprints" && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-sm border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Delete
          </button>
        )}
      </div>

      {isSyncOpen && (
        <SicmundusSyncModal
          isOpen={isSyncOpen}
          onClose={() => setIsSyncOpen(false)}
          task={taskProp}
        />
      )}
    </>
  );
}
