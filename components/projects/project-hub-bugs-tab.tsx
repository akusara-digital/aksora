"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bug,
  MagnifyingGlass,
  X,
  Plus,
  Clock,
  ArrowSquareOut,
  Funnel,
} from "@phosphor-icons/react";
import { formatDate, codeFromId } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { BugItem } from "./project-hub-types";

interface ProjectHubBugsTabProps {
  bugs: BugItem[];
  projectName: string;
  onOpenBugModal: () => void;
}

function getBugSeverityClass(severity: string) {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "blocker") return "bg-rose-100 text-rose-700 border-rose-200 font-bold";
  if (s === "high" || s === "major") return "bg-orange-100 text-orange-700 border-orange-200 font-semibold";
  if (s === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function ProjectHubBugsTab({
  bugs,
  projectName,
  onOpenBugModal,
}: ProjectHubBugsTabProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const query = search.trim().toLowerCase();
  const filtered = bugs.filter((bug) => {
    if (severityFilter !== "all" && bug.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== "all" && bug.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (!query) return true;
    return (
      bug.title.toLowerCase().includes(query) ||
      (bug.module && bug.module.toLowerCase().includes(query)) ||
      (bug.suggestedDev && bug.suggestedDev.toLowerCase().includes(query)) ||
      codeFromId("BUG", bug.id).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar: Search & Filters */}
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
              placeholder="Search defects..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
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

          {/* Severity Filter */}
          <div className="min-w-[135px]">
            <CustomSelect
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                { value: "all", label: "All Severities" },
                { value: "critical", label: "Critical", dot: "bg-rose-600" },
                { value: "high", label: "High", dot: "bg-orange-500" },
                { value: "medium", label: "Medium", dot: "bg-amber-500" },
                { value: "low", label: "Low", dot: "bg-slate-400" },
              ]}
              icon={<Funnel size={13} weight="bold" />}
              className="h-8 rounded-md py-1"
            />
          </div>

          {/* Status Filter */}
          <div className="min-w-[130px]">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "open", label: "Open", dot: "bg-blue-500" },
                { value: "in_progress", label: "In Progress", dot: "bg-amber-500" },
                { value: "ready_to_retest", label: "Ready to Retest", dot: "bg-purple-500" },
                { value: "closed", label: "Closed", dot: "bg-emerald-500" },
              ]}
              className="h-8 rounded-md py-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenBugModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            Log Bug
          </button>
          <Link
            href={`/bugs?project=${encodeURIComponent(projectName)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            title="Open full Bugs workspace"
          >
            <ArrowSquareOut size={14} weight="bold" />
            Full Tracker
          </Link>
        </div>
      </div>

      {/* Bugs List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
              <Bug size={24} weight="bold" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No defects found</h4>
            <p className="mt-1 text-xs text-slate-500">
              {search || severityFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "No bugs currently reported for this project."}
            </p>
            <button
              type="button"
              onClick={onOpenBugModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
            >
              <Plus size={13} weight="bold" />
              Log First Bug
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((bug) => (
              <div
                key={bug.id}
                className="group flex flex-col gap-2 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {codeFromId("BUG", bug.id)}
                    </span>
                    <Link
                      href={`/bugs?view=${bug.publicToken || bug.id}`}
                      className="truncate text-xs font-bold text-slate-900 group-hover:text-rose-600 transition"
                    >
                      {bug.title}
                    </Link>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {bug.module && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                        Module: {bug.module}
                      </span>
                    )}
                    {bug.suggestedDev && (
                      <span>
                        Suggested Dev: <strong className="text-slate-700">{bug.suggestedDev}</strong>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={11} weight="bold" />
                      Reported {formatDate(bug.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className={`rounded border px-2 py-0.5 text-[10px] capitalize ${getBugSeverityClass(bug.severity)}`}>
                    {bug.severity}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-slate-700">
                    {bug.status.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/bugs?view=${bug.publicToken || bug.id}`}
                    className="inline-flex items-center gap-1 rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
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
