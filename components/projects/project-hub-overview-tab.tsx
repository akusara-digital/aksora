"use client";

import Link from "next/link";
import {
  Kanban,
  Bug,
  ClipboardText,
  Users,
  Warning,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import { formatDate, codeFromId } from "@/lib/utils";
import {
  ProjectData,
  TaskItem,
  BugItem,
  TestPlanItem,
  TestSuiteItem,
  ProjectMemberItem,
  ProjectHubTab,
} from "./project-hub-types";

interface ProjectHubOverviewTabProps {
  project: ProjectData;
  tasks: TaskItem[];
  bugs: BugItem[];
  testPlans: TestPlanItem[];
  testSuites: TestSuiteItem[];
  members: ProjectMemberItem[];
  onSelectTab: (tab: ProjectHubTab) => void;
  onOpenTaskModal: () => void;
  onOpenBugModal: () => void;
  onOpenMembersModal: () => void;
}

function getTaskStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "in_progress" || s === "doing") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (s === "need_to_test") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s === "backlog") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getPriorityClass(priority: string) {
  const p = priority.toUpperCase();
  if (p === "P0" || p === "CRITICAL") return "bg-rose-100 text-rose-700 font-bold";
  if (p === "P1" || p === "HIGH") return "bg-orange-100 text-orange-700 font-semibold";
  if (p === "P2" || p === "MEDIUM") return "bg-amber-100 text-amber-700 font-medium";
  return "bg-slate-100 text-slate-600";
}

function getBugSeverityClass(severity: string) {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "blocker") return "bg-rose-100 text-rose-700 border-rose-200 font-bold";
  if (s === "high" || s === "major") return "bg-orange-100 text-orange-700 border-orange-200 font-semibold";
  if (s === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function ProjectHubOverviewTab({
  project,
  tasks,
  bugs,
  testPlans,
  testSuites,
  members,
  onSelectTab,
  onOpenTaskModal,
  onOpenBugModal,
  onOpenMembersModal,
}: ProjectHubOverviewTabProps) {
  const completedTasks = tasks.filter((t) => ["completed", "done"].includes(t.status.toLowerCase())).length;
  const activeTasks = tasks.length - completedTasks;

  const criticalBugs = bugs.filter((b) =>
    ["critical", "blocker"].includes(b.severity.toLowerCase()),
  );
  const openBugs = bugs.filter(
    (b) => !["closed", "rejected", "resolved"].includes(b.status.toLowerCase()),
  ).length;

  const recentTasks = tasks.slice(0, 5);
  const recentBugs = bugs.slice(0, 5);
  const recentPlans = testPlans.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 4 KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tasks */}
        <div
          onClick={() => onSelectTab("tasks")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tasks
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
              <Kanban size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{tasks.length}</span>
            <span className="text-xs font-semibold text-slate-500">total</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <CheckCircle size={13} weight="bold" />
              {completedTasks} Done
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-medium text-slate-600">{activeTasks} Active</span>
          </div>
        </div>

        {/* Card 2: Bugs */}
        <div
          onClick={() => onSelectTab("bugs")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-rose-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Defects
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition">
              <Bug size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{bugs.length}</span>
            {criticalBugs.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                <Warning size={11} weight="bold" />
                {criticalBugs.length} Critical
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-rose-600">{openBugs} Open</span>
            <span className="text-slate-300">·</span>
            <span className="font-medium text-slate-500">{bugs.length - openBugs} Resolved</span>
          </div>
        </div>

        {/* Card 3: Test Management */}
        <div
          onClick={() => onSelectTab("tests")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Test Assets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
              <ClipboardText size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{testPlans.length}</span>
            <span className="text-xs font-semibold text-slate-500">Plans</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-600">{testSuites.length} Test Suites</span>
          </div>
        </div>

        {/* Card 4: Team Members */}
        <div
          onClick={onOpenMembersModal}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Team Members
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
              <Users size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{members.length}</span>
            <span className="text-xs font-semibold text-slate-500">members</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold group-hover:underline">
            Manage Access & Roles →
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Tasks & Recent Bugs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Kanban size={16} weight="bold" className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Tasks</h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("tasks")}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              View all ({tasks.length})
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-500">No tasks created for this project yet.</p>
                <button
                  type="button"
                  onClick={onOpenTaskModal}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                >
                  <Plus size={13} weight="bold" />
                  Create First Task
                </button>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-400">
                        {codeFromId("TASK", task.id)}
                      </span>
                      <Link
                        href={`/tasks?view=${task.publicToken || task.id}`}
                        className="truncate text-xs font-bold text-slate-900 hover:text-blue-600 transition"
                      >
                        {task.title}
                      </Link>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      {task.category && <span>{task.category}</span>}
                      {task.assignee && (
                        <>
                          <span>·</span>
                          <span className="text-slate-600">{task.assignee}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} weight="bold" />
                        {formatDate(task.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${getPriorityClass(task.priority)}`}>
                      {task.priority || "P2"}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getTaskStatusClass(task.status)}`}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Bugs Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bug size={16} weight="bold" className="text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Defects</h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab("bugs")}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
            >
              View all ({bugs.length})
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentBugs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-500">No bugs logged for this project. Clean state!</p>
                <button
                  type="button"
                  onClick={onOpenBugModal}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
                >
                  <Plus size={13} weight="bold" />
                  Log Bug
                </button>
              </div>
            ) : (
              recentBugs.map((bug) => (
                <div key={bug.id} className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-400">
                        {codeFromId("BUG", bug.id)}
                      </span>
                      <Link
                        href={`/bugs?view=${bug.publicToken || bug.id}`}
                        className="truncate text-xs font-bold text-slate-900 hover:text-rose-600 transition"
                      >
                        {bug.title}
                      </Link>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      {bug.module && <span className="font-medium text-slate-600">{bug.module}</span>}
                      {bug.suggestedDev && (
                        <>
                          <span>·</span>
                          <span>Dev: {bug.suggestedDev}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} weight="bold" />
                        {formatDate(bug.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] capitalize ${getBugSeverityClass(bug.severity)}`}>
                      {bug.severity}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                      {bug.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Test Plans Summary Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardText size={16} weight="bold" className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Test Plans & Coverage</h3>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab("tests")}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Manage Test Assets ({testPlans.length} plans, {testSuites.length} suites)
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>

        {recentPlans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <p className="text-xs text-slate-500">No test plans created for this project yet.</p>
            <Link
              href={`/test-plans?project=${encodeURIComponent(project.name)}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
            >
              <Plus size={13} weight="bold" />
              Create Test Plan
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/test-plans/${plan.publicToken || plan.id}`}
                className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-300 hover:bg-white hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-600">
                      {codeFromId("PLAN", plan.id)}
                    </span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                      {plan.status}
                    </span>
                  </div>
                  <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                    {plan.title}
                  </h4>
                  {plan.sprint && (
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Sprint: {plan.sprint}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-400">
                  <span>{formatDate(plan.updatedAt)}</span>
                  <span className="font-semibold text-blue-600 group-hover:underline">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
