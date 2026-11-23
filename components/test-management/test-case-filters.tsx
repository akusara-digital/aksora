"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Funnel, Plus, SidebarSimple, X } from "@phosphor-icons/react";

interface TestCaseFiltersProps {
  projectOptions: string[];
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  suitesCount: number;
  onOpenNewSuiteModal: () => void;
  allConstant: string;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

export function TestCaseFilters({
  projectOptions,
  filterProject,
  setFilterProject,
  filterStatus,
  setFilterStatus,
  suitesCount,
  onOpenNewSuiteModal,
  allConstant,
  showSidebar = true,
  onToggleSidebar,
}: TestCaseFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/60 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition select-none shadow-2xs",
              showSidebar
                ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                : "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold",
            )}
            title={showSidebar ? "Hide test suites" : "Show test suites"}
            aria-label={showSidebar ? "Hide test suites" : "Show test suites"}
          >
            <SidebarSimple size={14} weight="bold" />
            <span className="hidden sm:inline">{showSidebar ? "Hide Suites" : "Show Suites"}</span>
          </button>
        )}

        <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
          <Funnel size={13} weight="bold" />
          Filters
        </span>

        {/* Project Filter */}
        {projectOptions.length > 0 && (
          <div className="relative">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className={cn(
                "h-8 rounded-lg border px-2.5 text-xs font-semibold outline-none transition max-w-[140px] sm:max-w-none truncate touch-manipulation",
                filterProject !== allConstant
                  ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
              )}
            >
              <option value={allConstant}>All Projects</option>
              {projectOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={cn(
              "h-8 rounded-lg border px-2.5 text-xs font-semibold outline-none transition touch-manipulation",
              filterStatus !== allConstant
                ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
            )}
          >
            <option value={allConstant}>All Statuses</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Blocked">Blocked</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {(filterProject !== allConstant || filterStatus !== allConstant) && (
          <button
            type="button"
            onClick={() => {
              setFilterProject(allConstant);
              setFilterStatus(allConstant);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
          >
            <X size={11} weight="bold" />
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400">
          {suitesCount} suite{suitesCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onOpenNewSuiteModal}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-xs"
        >
          <Plus size={13} weight="bold" />
          New Suite
        </button>
      </div>
    </div>
  );
}
