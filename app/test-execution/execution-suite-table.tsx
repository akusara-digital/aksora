"use client";

import Link from "next/link";
import {
  Play,
  CircleNotch,
  ArrowRight,
  User,
  Checks,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SuiteWithRun } from "./execution-suite-cards";

export interface ExecutionSuiteTableProps {
  suites: SuiteWithRun[];
  creating: number | null;
  onStartRun: (suite: SuiteWithRun) => void;
}

export function ExecutionSuiteTable({
  suites,
  creating,
  onStartRun,
}: ExecutionSuiteTableProps) {
  if (suites.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="border-b border-gray-200/80 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3">Suite Name</th>
              <th scope="col" className="px-4 py-3">Project / Plan</th>
              <th scope="col" className="px-3 py-3 text-center">Cases</th>
              <th scope="col" className="px-4 py-3">Latest Run Status</th>
              <th scope="col" className="px-4 py-3">Pass Rate</th>
              <th scope="col" className="px-4 py-3">Assignee / Tester</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suites.map((suite) => {
              const run = suite.lastRun;
              const isRunning = run?.status === "in-progress";
              const isCompleted = run?.status === "completed";
              const isPending = creating === suite.id;

              const totalCases = run?.totalCases || suite.caseCount || 0;
              const passed = run?.passed || 0;
              const failed = run?.failed || 0;
              const passRate = totalCases > 0 ? Math.round((passed / totalCases) * 100) : null;

              return (
                <tr
                  key={suite.id}
                  className="transition-colors hover:bg-gray-50/60"
                >
                  {/* Suite Name */}
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/test-execution/${suite.publicToken}`}
                      className="font-bold text-gray-900 hover:text-blue-600 transition"
                    >
                      {suite.title}
                    </Link>
                    {suite.notes && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500 max-w-xs sm:max-w-md">
                        {suite.notes}
                      </p>
                    )}
                  </td>

                  {/* Project / Plan */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-gray-800">
                        {suite.project || "General"}
                      </span>
                      {suite.planName && suite.planName !== "Standalone" && (
                        <span className="text-[10px] text-gray-400">
                          {suite.planName}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cases */}
                  <td className="px-3 py-3.5 text-center font-bold text-gray-900">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      <Checks size={12} weight="bold" />
                      {suite.caseCount}
                    </span>
                  </td>

                  {/* Latest Run Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        In Progress (#{run?.runNumber})
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Completed (#{run?.runNumber})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Ready
                      </span>
                    )}
                  </td>

                  {/* Pass Rate */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {passRate !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              passRate >= 80 ? "bg-emerald-500" : passRate >= 50 ? "bg-amber-500" : "bg-rose-500",
                            )}
                            style={{ width: `${passRate}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-700 text-xs">{passRate}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Assignee / Tester */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <User size={13} weight="bold" className="text-gray-400" />
                      <span>{run?.tester || suite.assignee || "Unassigned"}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {isRunning && run ? (
                        <Link
                          href={`/test-execution/${suite.publicToken}/run/${run.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs cursor-pointer"
                        >
                          <span>Resume Run</span>
                          <ArrowRight size={13} weight="bold" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartRun(suite)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          {isPending ? (
                            <CircleNotch size={13} className="animate-spin text-blue-600" />
                          ) : (
                            <Play size={13} weight="bold" className="text-blue-600" />
                          )}
                          <span>Run Suite</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
