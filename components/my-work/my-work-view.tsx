"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Kanban,
  Bug,
  MagnifyingGlass,
  ArrowRight,
  Clock,
  Plus,
  CheckCircle,
  X,
  Buildings,
  FolderSimple,
} from "@phosphor-icons/react";
import type { MyWorkItem } from "@/lib/my-work";

interface MyWorkViewProps {
  items: MyWorkItem[];
  todayMinutes: number;
  userName: string;
}

function getPriorityBadge(priority: string) {
  const p = priority.toLowerCase();
  if (p.includes("urgent") || p.includes("critical") || p.includes("high") || p.includes("blocker")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (p.includes("medium") || p.includes("normal")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("resolved") || s.includes("closed")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progress") || s.includes("review") || s.includes("test")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (s.includes("block") || s.includes("reject") || s.includes("cancel")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function MyWorkView({ items, todayMinutes, userName }: MyWorkViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "bugs">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const taskCount = items.filter((item) => item.type === "Task").length;
  const bugCount = items.filter((item) => item.type === "Bug").length;
  const totalCount = items.length;

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === "tasks" && item.type !== "Task") return false;
      if (activeTab === "bugs" && item.type !== "Bug") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.project.toLowerCase().includes(q) ||
        item.workspace.toLowerCase().includes(q)
      );
    });
  }, [items, activeTab, searchQuery]);

  const targetMinutes = 480; // 8 hours daily target
  const targetPct = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100));

  return (
    <div className="space-y-6">
      {/* Today's Work Log Widget */}
      <section
        aria-label="Today's Work Log"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Clock size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Today&apos;s Work Log
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Day Mode
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  {(todayMinutes / 60).toFixed(1)} hrs logged today
                </span>
                <span className="text-xs font-medium text-slate-500">
                  ({todayMinutes} mins)
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Don&apos;t forget to submit your daily work log before the end of the day.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/work-logs"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus size={14} weight="bold" />
              <span>Log Daily Standup / Work</span>
            </Link>
          </div>
        </div>

        {/* Daily Target Progress */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Daily target progress: <strong className="text-slate-800">{targetPct}%</strong> of 8.0 hrs
            </span>
            <span className="text-slate-400">
              {todayMinutes >= targetMinutes ? "Target achieved!" : `${Math.max(0, 8 - todayMinutes / 60).toFixed(1)} hrs remaining`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                targetPct >= 100 ? "bg-emerald-500" : targetPct >= 50 ? "bg-blue-600" : "bg-amber-500"
              }`}
              style={{ width: `${targetPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Controls: Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter work items"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "tasks"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tasks ({taskCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bugs"}
            onClick={() => setActiveTab("bugs")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              activeTab === "bugs"
                ? "bg-white text-rose-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Bugs ({bugCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, code, or project..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label="Clear search"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Work Item Cards (Day Mode) */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <CheckCircle size={28} weight="bold" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              {items.length === 0
                ? "All caught up!"
                : "No matching work items found"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {items.length === 0
                ? "There is no open task or bug assigned to you across your active workspaces."
                : `No work items matched "${searchQuery}". Try adjusting your search query or reset the filter.`}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="group bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-sm transition hover:shadow-md flex items-center justify-between gap-4"
            >
              {/* Left Column */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Code Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-bold border shrink-0 ${
                      item.type === "Bug"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {item.type === "Bug" ? (
                      <Bug size={13} weight="bold" className="text-rose-600" />
                    ) : (
                      <Kanban size={13} weight="bold" className="text-blue-600" />
                    )}
                    <span>{item.code}</span>
                  </span>

                  {/* Title */}
                  <Link
                    href={item.href}
                    className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 transition"
                  >
                    {item.title}
                  </Link>
                </div>

                {/* Subtitle / Metadata Badges */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {/* Project Badge */}
                  <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                    <FolderSimple size={12} weight="bold" className="text-slate-500" />
                    <span>{item.project}</span>
                  </span>

                  {/* Priority Badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium border ${getPriorityBadge(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>

                  {/* Status Pill */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>

                  {/* Workspace Tag */}
                  <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded font-medium border border-purple-100 inline-flex items-center gap-1">
                    <Buildings size={12} weight="bold" className="text-purple-500" />
                    <span>{item.workspace}</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Clickable Navigation Link Arrow */}
              <Link
                href={item.href}
                aria-label={`Open ${item.code}: ${item.title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
