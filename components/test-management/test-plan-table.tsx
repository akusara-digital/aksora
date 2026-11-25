"use client";

import React from "react";
import Link from "next/link";
import {
  Play,
  PencilSimple,
  Trash,
  ArrowSquareOut,
  Calendar,
  User,
  Checks,
} from "@phosphor-icons/react";
import { cn, formatDate } from "@/lib/utils";
import type { TestPlanItem } from "./test-plan-kanban-board";

export interface TestPlanTableProps {
  plans: TestPlanItem[];
  onSelectPlan?: (plan: TestPlanItem) => void;
  onEditPlan?: (plan: TestPlanItem) => void;
  onDeletePlan?: (plan: TestPlanItem) => void;
  onRunPlan?: (plan: TestPlanItem) => void;
}

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

export function TestPlanTable({
  plans,
  onSelectPlan,
  onEditPlan,
  onDeletePlan,
  onRunPlan,
}: TestPlanTableProps) {
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400 bg-white rounded-lg border border-gray-200">
        <Checks size={36} weight="bold" className="text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-700">No test plans found</p>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          Create a test plan or change your filters to see plans.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-2xs">
      <table className="w-full min-w-[950px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-bold uppercase tracking-wider text-[11px]">
            <th className="py-3 px-4">Test Plan</th>
            <th className="py-3 px-3">Project</th>
            <th className="py-3 px-3">Sprint</th>
            <th className="py-3 px-3">Schedule</th>
            <th className="py-3 px-3">Suites & Cases</th>
            <th className="py-3 px-3">Progress</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3">Assignee</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {plans.map((plan) => {
            const statusKey = String(plan.status || "draft").toLowerCase().replace(/\s+/g, "_");
            const badgeClass = STATUS_BADGES[statusKey] || STATUS_BADGES.draft;
            const passRate =
              plan.caseCount > 0
                ? Math.round((plan.passedCount / plan.caseCount) * 100)
                : 0;

            return (
              <tr
                key={plan.id}
                className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => onSelectPlan?.(plan)}
              >
                {/* Plan Name */}
                <td className="py-3.5 px-4 font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 line-clamp-1">{plan.title}</span>
                    <Link
                      href={`/test-plans/${plan.publicToken || plan.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-blue-600"
                      title="Open Detail"
                    >
                      <ArrowSquareOut size={13} weight="bold" />
                    </Link>
                  </div>
                  {plan.scope && (
                    <p className="text-[11px] font-normal text-gray-500 line-clamp-1 mt-0.5">
                      {plan.scope}
                    </p>
                  )}
                </td>

                {/* Project */}
                <td className="py-3.5 px-3">
                  <span className="inline-block rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    {plan.project || "General"}
                  </span>
                </td>

                {/* Sprint */}
                <td className="py-3.5 px-3">
                  {plan.sprint ? (
                    <span className="inline-block rounded bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                      {plan.sprint}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Schedule */}
                <td className="py-3.5 px-3 whitespace-nowrap text-gray-600">
                  {plan.startDate || plan.endDate ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar size={13} weight="bold" className="text-gray-400 shrink-0" />
                      <span>
                        {plan.startDate ? formatDate(plan.startDate) : "Any"}
                        {" - "}
                        {plan.endDate ? formatDate(plan.endDate) : "Ongoing"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Suites & Cases */}
                <td className="py-3.5 px-3 whitespace-nowrap font-medium text-gray-700">
                  <span>{plan.suiteCount} suites</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-gray-500">{plan.caseCount} cases</span>
                </td>

                {/* Progress */}
                <td className="py-3.5 px-3 min-w-[130px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500">
                      <span>{passRate}% pass</span>
                      <span>{plan.passedCount}/{plan.caseCount}</span>
                    </div>
                    {plan.caseCount > 0 ? (
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        {plan.passedCount > 0 && (
                          <div
                            style={{ width: `${(plan.passedCount / plan.caseCount) * 100}%` }}
                            className="bg-emerald-500"
                          />
                        )}
                        {plan.failedCount > 0 && (
                          <div
                            style={{ width: `${(plan.failedCount / plan.caseCount) * 100}%` }}
                            className="bg-rose-500"
                          />
                        )}
                        {plan.blockedCount > 0 && (
                          <div
                            style={{ width: `${(plan.blockedCount / plan.caseCount) * 100}%` }}
                            className="bg-amber-500"
                          />
                        )}
                        {plan.pendingCount > 0 && (
                          <div
                            style={{ width: `${(plan.pendingCount / plan.caseCount) * 100}%` }}
                            className="bg-gray-300"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-1.5 w-full rounded-full bg-gray-100" />
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize",
                      badgeClass,
                    )}
                  >
                    {statusKey.replace("_", " ")}
                  </span>
                </td>

                {/* Assignee */}
                <td className="py-3.5 px-3 text-gray-600">
                  {plan.assignee ? (
                    <div className="flex items-center gap-1.5 max-w-[110px] truncate" title={plan.assignee}>
                      <User size={13} weight="bold" className="text-gray-400 shrink-0" />
                      <span className="truncate">{plan.assignee}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {onRunPlan && (
                      <button
                        type="button"
                        onClick={() => onRunPlan(plan)}
                        className="inline-flex h-7 items-center gap-1 rounded bg-blue-600 px-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs cursor-pointer"
                        title="Run Plan"
                      >
                        <Play size={11} weight="bold" />
                        <span>Run</span>
                      </button>
                    )}

                    {onEditPlan && (
                      <button
                        type="button"
                        onClick={() => onEditPlan(plan)}
                        className="h-7 w-7 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer"
                        title="Edit Plan"
                      >
                        <PencilSimple size={13} weight="bold" />
                      </button>
                    )}

                    {onDeletePlan && (
                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan)}
                        className="h-7 w-7 rounded border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash size={13} weight="bold" />
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
  );
}
