"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  PlayCircle,
  ArrowsClockwise,
  CheckCircle,
  Archive,
  Calendar,
  User,
  Plus,
  ArrowRight,
  Play,
  ArrowSquareOut,
  DotsThreeVertical,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { cn, formatDate } from "@/lib/utils";

export interface TestPlanItem {
  id: number;
  publicToken: string;
  title: string;
  project: string;
  sprint?: string;
  scope?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  assignee?: string;
  notes?: string;
  suiteCount: number;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  pendingCount: number;
  completionRate: number;
  suites?: Array<{ id: number; publicToken: string; title: string; status: string }>;
}

export interface TestPlanKanbanBoardProps {
  plans: TestPlanItem[];
  onSelectPlan?: (plan: TestPlanItem) => void;
  onEditPlan?: (plan: TestPlanItem) => void;
  onDeletePlan?: (plan: TestPlanItem) => void;
  onAddPlan?: () => void;
  onStatusChange?: (planId: number, nextStatus: string) => void;
  onRunPlan?: (plan: TestPlanItem) => void;
}

const KANBAN_COLUMNS = [
  {
    key: "draft",
    label: "Draft",
    icon: <FileText size={14} weight="bold" className="text-gray-400" />,
    badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
    borderTop: "border-t-gray-400",
  },
  {
    key: "active",
    label: "Active",
    icon: <PlayCircle size={14} weight="bold" className="text-blue-500" />,
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    borderTop: "border-t-blue-500",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: <ArrowsClockwise size={14} weight="bold" className="text-amber-500" />,
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    borderTop: "border-t-amber-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <CheckCircle size={14} weight="bold" className="text-emerald-500" />,
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderTop: "border-t-emerald-500",
  },
  {
    key: "archived",
    label: "Archived",
    icon: <Archive size={14} weight="bold" className="text-slate-400" />,
    badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
    borderTop: "border-t-slate-400",
  },
];

export function TestPlanKanbanBoard({
  plans,
  onSelectPlan,
  onEditPlan,
  onDeletePlan,
  onAddPlan,
  onStatusChange,
  onRunPlan,
}: TestPlanKanbanBoardProps) {
  const [activeMenuPlanId, setActiveMenuPlanId] = useState<number | null>(null);

  const getColumnPlans = (statusKey: string) => {
    return plans.filter((p) => {
      const s = String(p.status || "draft").toLowerCase().replace(/\s+/g, "_");
      if (statusKey === "in_progress") {
        return s === "in_progress" || s === "in-progress" || s === "progress";
      }
      return s === statusKey;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 h-full items-start">
      {KANBAN_COLUMNS.map((col) => {
        const colPlans = getColumnPlans(col.key);
        return (
          <div
            key={col.key}
            className={cn(
              "flex flex-col rounded-lg border border-gray-200 bg-gray-50/70 p-3 shadow-2xs min-h-[500px] border-t-4",
              col.borderTop,
            )}
          >
            {/* Header */}
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
                  {colPlans.length}
                </span>
              </div>

              {onAddPlan && (col.key === "draft" || col.key === "active") && (
                <button
                  type="button"
                  onClick={onAddPlan}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-gray-200 text-gray-600 transition"
                  title="Add Test Plan"
                >
                  <Plus size={13} weight="bold" />
                </button>
              )}
            </div>

            {/* Plans List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
              {colPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                  <p className="text-xs font-medium">No plans in {col.label}</p>
                </div>
              ) : (
                colPlans.map((plan) => {
                  const passRate =
                    plan.caseCount > 0
                      ? Math.round((plan.passedCount / plan.caseCount) * 100)
                      : 0;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => onSelectPlan?.(plan)}
                      className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-2xs transition hover:border-blue-400 hover:shadow-xs space-y-2.5"
                    >
                      {/* Badges: Project & Sprint */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 overflow-hidden">
                          <span className="inline-block max-w-[110px] truncate rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            {plan.project || "General"}
                          </span>
                          {plan.sprint && (
                            <span className="inline-block max-w-[90px] truncate rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                              {plan.sprint}
                            </span>
                          )}
                        </div>

                        {/* Card menu */}
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          {onEditPlan && (
                            <button
                              type="button"
                              onClick={() => onEditPlan(plan)}
                              className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                              title="Edit Plan"
                            >
                              <PencilSimple size={12} weight="bold" />
                            </button>
                          )}
                          <Link
                            href={`/test-plans/${plan.publicToken || plan.id}`}
                            className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition"
                            title="Open Plan Detail"
                          >
                            <ArrowSquareOut size={12} weight="bold" />
                          </Link>
                        </div>
                      </div>

                      {/* Plan Title */}
                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-2 leading-snug">
                        {plan.title}
                      </h4>

                      {/* Dates */}
                      {(plan.startDate || plan.endDate) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                          <Calendar size={12} weight="bold" className="text-gray-400 shrink-0" />
                          <span className="truncate">
                            {plan.startDate ? formatDate(plan.startDate) : "Any"}
                            {" → "}
                            {plan.endDate ? formatDate(plan.endDate) : "Ongoing"}
                          </span>
                        </div>
                      )}

                      {/* Scope excerpt */}
                      {plan.scope && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed bg-gray-50/70 rounded p-1.5 border border-gray-100">
                          {plan.scope}
                        </p>
                      )}

                      {/* Suites & Cases Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                          <span>
                            {plan.suiteCount} suite{plan.suiteCount === 1 ? "" : "s"} · {plan.caseCount} case{plan.caseCount === 1 ? "" : "s"}
                          </span>
                          {plan.caseCount > 0 && (
                            <span className={cn(
                              "font-bold",
                              passRate >= 80 ? "text-emerald-600" : passRate >= 50 ? "text-amber-600" : "text-gray-500"
                            )}>
                              {passRate}% pass
                            </span>
                          )}
                        </div>

                        {/* Multi-segment progress bar */}
                        {plan.caseCount > 0 ? (
                          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            {plan.passedCount > 0 && (
                              <div
                                style={{ width: `${(plan.passedCount / plan.caseCount) * 100}%` }}
                                className="bg-emerald-500"
                                title={`Passed: ${plan.passedCount}`}
                              />
                            )}
                            {plan.failedCount > 0 && (
                              <div
                                style={{ width: `${(plan.failedCount / plan.caseCount) * 100}%` }}
                                className="bg-rose-500"
                                title={`Failed: ${plan.failedCount}`}
                              />
                            )}
                            {plan.blockedCount > 0 && (
                              <div
                                style={{ width: `${(plan.blockedCount / plan.caseCount) * 100}%` }}
                                className="bg-amber-500"
                                title={`Blocked: ${plan.blockedCount}`}
                              />
                            )}
                            {plan.pendingCount > 0 && (
                              <div
                                style={{ width: `${(plan.pendingCount / plan.caseCount) * 100}%` }}
                                className="bg-gray-300"
                                title={`Pending: ${plan.pendingCount}`}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="h-1.5 w-full rounded-full bg-gray-100" />
                        )}
                      </div>

                      {/* Footer: Assignee, Run button, Move status */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                        <div className="flex items-center gap-1 text-gray-500 font-medium truncate max-w-[100px]">
                          <User size={11} weight="bold" />
                          <span className="truncate">{plan.assignee || "Unassigned"}</span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onRunPlan && (
                            <button
                              type="button"
                              onClick={() => onRunPlan(plan)}
                              className="inline-flex h-5 items-center gap-1 rounded bg-blue-50 px-1.5 font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs cursor-pointer"
                              title="Start execution run for this plan"
                            >
                              <Play size={9} weight="bold" />
                              <span>Run</span>
                            </button>
                          )}

                          {onStatusChange && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuPlanId(
                                    activeMenuPlanId === plan.id ? null : plan.id,
                                  )
                                }
                                className="inline-flex h-5 items-center gap-0.5 rounded px-1 font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                              >
                                Move <ArrowRight size={9} weight="bold" />
                              </button>

                              {activeMenuPlanId === plan.id && (
                                <div className="absolute right-0 bottom-6 z-20 w-32 rounded-md border border-gray-200 bg-white p-1 shadow-lg text-xs">
                                  {KANBAN_COLUMNS.map((c) => (
                                    <button
                                      key={c.key}
                                      type="button"
                                      disabled={plan.status.toLowerCase() === c.key}
                                      onClick={() => {
                                        onStatusChange(plan.id, c.key);
                                        setActiveMenuPlanId(null);
                                      }}
                                      className={cn(
                                        "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs font-semibold transition cursor-pointer",
                                        plan.status.toLowerCase() === c.key
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
