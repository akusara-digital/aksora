"use client";

import Link from "next/link";
import {
  Play,
  CircleNotch,
  ArrowRight,
  User,
  Checks,
  CheckCircle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SuiteWithRun } from "./execution-suite-cards";

export interface ExecutionSuiteKanbanProps {
  suites: SuiteWithRun[];
  creating: number | null;
  onStartRun: (suite: SuiteWithRun) => void;
}

export function ExecutionSuiteKanban({
  suites,
  creating,
  onStartRun,
}: ExecutionSuiteKanbanProps) {
  const readyList = suites.filter((s) => !s.lastRun || (s.lastRun.status !== "in-progress" && s.lastRun.status !== "completed"));
  const inProgressList = suites.filter((s) => s.lastRun?.status === "in-progress");
  const completedList = suites.filter((s) => s.lastRun?.status === "completed");

  const columns = [
    {
      id: "ready",
      title: "Ready to Run",
      count: readyList.length,
      items: readyList,
      accent: "border-slate-300 text-slate-700 bg-slate-50/70",
      dot: "bg-slate-400",
    },
    {
      id: "in-progress",
      title: "In Progress",
      count: inProgressList.length,
      items: inProgressList,
      accent: "border-blue-300 text-blue-700 bg-blue-50/70",
      dot: "bg-blue-500 animate-pulse",
    },
    {
      id: "completed",
      title: "Completed",
      count: completedList.length,
      items: completedList,
      accent: "border-emerald-300 text-emerald-800 bg-emerald-50/70",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex flex-col rounded-lg border border-gray-200/80 bg-gray-50/50 p-3 min-h-[500px]"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between border-b border-gray-200/70 pb-2.5 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", col.dot)} />
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                {col.title}
              </h3>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-gray-600 border border-gray-200 shadow-2xs">
              {col.count}
            </span>
          </div>

          {/* Column Cards */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
            {col.items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
                No suites in this status
              </div>
            ) : (
              col.items.map((suite) => {
                const run = suite.lastRun;
                const isRunning = run?.status === "in-progress";
                const isPending = creating === suite.id;

                const totalCases = run?.totalCases || suite.caseCount || 0;
                const passed = run?.passed || 0;
                const failed = run?.failed || 0;
                const passRate = totalCases > 0 ? Math.round((passed / totalCases) * 100) : null;

                return (
                  <div
                    key={suite.id}
                    className="flex flex-col justify-between rounded-md border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-gray-300 hover:shadow-xs transition"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                          {suite.project || "General"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600">
                          <Checks size={12} weight="bold" />
                          {suite.caseCount} cases
                        </span>
                      </div>

                      {/* Suite Title */}
                      <Link
                        href={`/test-execution/${suite.publicToken}`}
                        className="text-xs font-bold text-gray-900 hover:text-blue-600 transition line-clamp-2"
                      >
                        {suite.title}
                      </Link>

                      {suite.planName && suite.planName !== "Standalone" && (
                        <p className="mt-1 text-[10px] text-gray-400 font-medium truncate">
                          Plan: {suite.planName}
                        </p>
                      )}

                      {/* Run Outcome if any */}
                      {run && (
                        <div className="mt-2.5 rounded border border-gray-100 bg-gray-50/80 p-2">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-gray-600">
                              Run #{run.runNumber}
                            </span>
                            {passRate !== null && (
                              <span
                                className={cn(
                                  "font-bold text-[10px]",
                                  passRate >= 80 ? "text-emerald-700" : passRate >= 50 ? "text-amber-700" : "text-rose-700",
                                )}
                              >
                                {passRate}% Pass
                              </span>
                            )}
                          </div>
                          {totalCases > 0 && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  passRate !== null && passRate >= 80 ? "bg-emerald-500" : passRate !== null && passRate >= 50 ? "bg-amber-500" : "bg-rose-500",
                                )}
                                style={{ width: `${passRate ?? 0}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1 truncate max-w-[120px]">
                        <User size={12} weight="bold" className="text-gray-400 shrink-0" />
                        <span className="truncate">{run?.tester || suite.assignee || "Unassigned"}</span>
                      </div>

                      {isRunning && run ? (
                        <Link
                          href={`/test-execution/${suite.publicToken}/run/${run.id}`}
                          className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2.5 text-[11px] font-bold text-white hover:bg-blue-700 transition shadow-2xs"
                        >
                          <span>Resume</span>
                          <ArrowRight size={11} weight="bold" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartRun(suite)}
                          disabled={isPending}
                          className="inline-flex h-7 items-center gap-1 rounded border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs cursor-pointer"
                        >
                          {isPending ? (
                            <CircleNotch size={11} className="animate-spin text-blue-600" />
                          ) : (
                            <Play size={11} weight="bold" className="text-blue-600" />
                          )}
                          <span>Run</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
