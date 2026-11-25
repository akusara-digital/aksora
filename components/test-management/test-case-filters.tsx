"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Funnel, Plus, X, Table, Kanban, FolderPlus } from "@phosphor-icons/react";

export interface TestCaseFiltersProps {
  projectOptions: string[];
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  suitesCount: number;
  onOpenNewSuiteModal: () => void;
  onOpenNewCaseModal?: () => void;
  viewMode?: "table" | "kanban";
  onSetViewMode?: (mode: "table" | "kanban") => void;
  allConstant: string;
}

export function TestCaseFilters({
  projectOptions,
  filterProject,
  setFilterProject,
  filterStatus,
  setFilterStatus,
  suitesCount,
  onOpenNewSuiteModal,
  onOpenNewCaseModal,
  viewMode = "table",
  onSetViewMode,
  allConstant,
}: TestCaseFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/60 pb-3">
      {/* Left: View Mode Switcher */}
      <div className="flex flex-wrap items-center gap-2.5">
        {onSetViewMode && (
          <div className="flex h-8 items-center border border-gray-200 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => onSetViewMode("table")}
              className={cn(
                "h-full px-3 text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50",
              )}
            >
              <span className="inline-flex items-center gap-1">
                <Table size={13} weight="bold" />
                Table
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSetViewMode("kanban")}
              className={cn(
                "h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "kanban"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50",
              )}
            >
              <span className="inline-flex items-center gap-1">
                <Kanban size={13} weight="bold" />
                Kanban
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Filters and Actions */}
      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
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
                "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition max-w-[140px] sm:max-w-none truncate touch-manipulation cursor-pointer",
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
              "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition touch-manipulation cursor-pointer",
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
            className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
          >
            <X size={11} weight="bold" />
            Clear
          </button>
        )}

        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

        <span className="text-xs font-medium text-gray-400 hidden sm:inline">
          {suitesCount} suite{suitesCount === 1 ? "" : "s"}
        </span>

        {/* Secondary: New Suite */}
        <button
          type="button"
          onClick={onOpenNewSuiteModal}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs"
          title="Create a new Test Suite"
        >
          <FolderPlus size={14} weight="bold" className="text-gray-500" />
          <span>New Suite</span>
        </button>

        {/* Primary CTA: New Test Case (Matching Bugs UI) */}
        <button
          type="button"
          onClick={onOpenNewCaseModal || onOpenNewSuiteModal}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs"
        >
          <Plus size={14} weight="bold" />
          <span>New Test Case</span>
        </button>
      </div>
    </div>
  );
}
