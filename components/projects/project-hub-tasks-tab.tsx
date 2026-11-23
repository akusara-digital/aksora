"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Kanban,
  MagnifyingGlass,
  X,
  Plus,
  Clock,
  ArrowSquareOut,
  Funnel,
} from "@phosphor-icons/react";
import { formatDate, codeFromId } from "@/lib/utils";
import { TaskItem } from "./project-hub-types";

interface ProjectHubTasksTabProps {
  tasks: TaskItem[];
  projectName: string;
  onOpenTaskModal: () => void;
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

export function ProjectHubTasksTab({
  tasks,
  projectName,
  onOpenTaskModal,
}: ProjectHubTasksTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const query = search.trim().toLowerCase();
  const filtered = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (priorityFilter !== "all" && task.priority.toUpperCase() !== priorityFilter.toUpperCase()) {
      return false;
    }
    if (!query) return true;
    return (
      task.title.toLowerCase().includes(query) ||
      (task.category && task.category.toLowerCase().includes(query)) ||
      (task.assignee && task.assignee.toLowerCase().includes(query)) ||
      (task.relatedFeature && task.relatedFeature.toLowerCase().includes(query)) ||
      codeFromId("TASK", task.id).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* ── Toolbar: Search & Filters ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={15}
              weight="bold"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} weight="bold" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Funnel size={14} weight="bold" className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="need_to_test">Need to Test</option>
              <option value="completed">Completed</option>
              <option value="backlog">Backlog</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 (Critical)</option>
            <option value="P1">P1 (High)</option>
            <option value="P2">P2 (Medium)</option>
            <option value="P3">P3 (Low)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTaskModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
          >
            <Plus size={14} weight="bold" />
            New Task
          </button>
          <Link
            href={`/tasks?project=${encodeURIComponent(projectName)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            title="Open full Tasks workspace"
          >
            <ArrowSquareOut size={14} weight="bold" />
            Full Board
          </Link>
        </div>
      </div>

      {/* ── Task List ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
              <Kanban size={24} weight="bold" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No tasks found</h4>
            <p className="mt-1 text-xs text-slate-500">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "Get started by adding the first task to this project."}
            </p>
            <button
              type="button"
              onClick={onOpenTaskModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus size={13} weight="bold" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="group flex flex-col gap-2 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {codeFromId("TASK", task.id)}
                    </span>
                    <Link
                      href={`/tasks?view=${task.publicToken || task.id}`}
                      className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600 transition"
                    >
                      {task.title}
                    </Link>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {task.category && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        {task.category}
                      </span>
                    )}
                    {task.relatedFeature && (
                      <span className="font-medium text-slate-500">
                        Feature: {task.relatedFeature}
                      </span>
                    )}
                    {task.assignee && (
                      <span>
                        Assignee: <strong className="text-slate-700">{task.assignee}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={11} weight="bold" />
                      Updated {formatDate(task.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${getPriorityClass(task.priority)}`}>
                    {task.priority || "P2"}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${getTaskStatusClass(task.status)}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/tasks?view=${task.publicToken || task.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    View
                    <ArrowSquareOut size={12} weight="bold" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
