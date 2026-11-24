"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  SquaresFour,
  User,
  Plus,
  ArrowRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { TestCase } from "@/components/test-management/test-case-table";

export interface TestCaseKanbanBoardProps {
  cases: TestCase[];
  onSelectCase?: (testCase: TestCase) => void;
  onAddCase?: () => void;
  onStatusChange?: (caseId: number, nextStatus: string) => void;
}

const KANBAN_COLUMNS = [
  {
    key: "Pending",
    label: "Pending",
    icon: <Clock size={14} weight="bold" className="text-gray-400" />,
    badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
    borderTop: "border-t-gray-400",
  },
  {
    key: "Passed",
    label: "Passed",
    icon: <CheckCircle size={14} weight="bold" className="text-emerald-500" />,
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderTop: "border-t-emerald-500",
  },
  {
    key: "Failed",
    label: "Failed",
    icon: <XCircle size={14} weight="bold" className="text-rose-500" />,
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    borderTop: "border-t-rose-500",
  },
  {
    key: "Blocked",
    label: "Blocked",
    icon: <Warning size={14} weight="bold" className="text-amber-500" />,
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    borderTop: "border-t-amber-500",
  },
];

const PRIORITY_BADGES: Record<string, string> = {
  Critical: "bg-rose-100 text-rose-800 border-rose-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Medium: "bg-blue-100 text-blue-800 border-blue-200",
  Low: "bg-gray-100 text-gray-700 border-gray-200",
};

export function TestCaseKanbanBoard({
  cases,
  onSelectCase,
  onAddCase,
  onStatusChange,
}: TestCaseKanbanBoardProps) {
  const [activeMenuCaseId, setActiveMenuCaseId] = useState<number | null>(null);

  const getColumnCases = (status: string) => {
    return cases.filter((c) => {
      const s = c.status || "Pending";
      if (status === "Pending") {
        return s === "Pending" || s === "draft" || s === "Not Yet Started" || !s;
      }
      return s.toLowerCase() === status.toLowerCase();
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full items-start">
      {KANBAN_COLUMNS.map((col) => {
        const colCases = getColumnCases(col.key);
        return (
          <div
            key={col.key}
            className={cn(
              "flex flex-col rounded-lg border border-gray-200 bg-gray-50/70 p-3 shadow-2xs min-h-[460px] border-t-4",
              col.borderTop,
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/80">
              <div className="flex items-center gap-1.5">
                {col.icon}
                <span className="text-xs font-bold text-gray-800">{col.label}</span>
                <span
                  className={cn(
                    "ml-1 inline-flex items-center rounded-full border px-1.5 py-0.2 text-[10px] font-bold",
                    col.badgeBg,
                  )}
                >
                  {colCases.length}
                </span>
              </div>
              {onAddCase && col.key === "Pending" && (
                <button
                  type="button"
                  onClick={onAddCase}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-gray-200 text-gray-600 transition"
                  title="Add Test Case"
                >
                  <Plus size={13} weight="bold" />
                </button>
              )}
            </div>

            {/* Cases list */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5">
              {colCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <SquaresFour size={24} weight="duotone" className="mb-1 opacity-50" />
                  <p className="text-xs font-medium">No test cases</p>
                </div>
              ) : (
                colCases.map((tc) => {
                  const priorityClass =
                    PRIORITY_BADGES[tc.priority || "Medium"] || PRIORITY_BADGES.Medium;
                  return (
                    <div
                      key={tc.id}
                      onClick={() => onSelectCase?.(tc)}
                      className="group relative cursor-pointer rounded-md border border-gray-200 bg-white p-3 shadow-2xs transition hover:border-blue-400 hover:shadow-xs"
                    >
                      {/* Top: TC ID & Priority */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-blue-600">
                          {tc.tcId || `TC-${tc.id}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "inline-block rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase",
                              priorityClass,
                            )}
                          >
                            {tc.priority || "Medium"}
                          </span>
                        </div>
                      </div>

                      {/* Title / Scenario */}
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug mb-2">
                        {tc.caseName || "Untitled Test Case"}
                      </p>

                      {/* Suite Name / Project */}
                      {(tc.suiteTitle || tc.planProject) && (
                        <p className="text-[10px] text-gray-500 truncate mb-2">
                          {tc.suiteTitle || tc.planProject}
                        </p>
                      )}

                      {/* Footer: Type & Status quick switch */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                        <span
                          className={cn(
                            "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            tc.typeCase?.toLowerCase() === "negative"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {tc.typeCase || "Positive"}
                        </span>

                        <div className="flex items-center gap-1">
                          {tc.assignee && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-medium max-w-[80px] truncate"
                              title={tc.assignee}
                            >
                              <User size={10} weight="bold" />
                              {tc.assignee}
                            </span>
                          )}

                          {onStatusChange && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuCaseId(
                                    activeMenuCaseId === tc.id ? null : tc.id,
                                  );
                                }}
                                className="inline-flex h-5 items-center gap-0.5 rounded px-1 text-[10px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                                title="Change status"
                              >
                                Move <ArrowRight size={9} weight="bold" />
                              </button>

                              {activeMenuCaseId === tc.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-6 z-20 w-32 rounded-md border border-gray-200 bg-white p-1 shadow-lg text-xs"
                                >
                                  {KANBAN_COLUMNS.map((c) => (
                                    <button
                                      key={c.key}
                                      type="button"
                                      disabled={tc.status === c.key}
                                      onClick={() => {
                                        onStatusChange(tc.id, c.key);
                                        setActiveMenuCaseId(null);
                                      }}
                                      className={cn(
                                        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-semibold transition cursor-pointer",
                                        tc.status === c.key
                                          ? "opacity-40 cursor-not-allowed bg-gray-50"
                                          : "hover:bg-blue-50 hover:text-blue-700",
                                      )}
                                    >
                                      {c.icon}
                                      {c.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
