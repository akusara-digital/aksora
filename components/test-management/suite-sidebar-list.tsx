"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FolderSimple, Plus, Play } from "@phosphor-icons/react";
import type { SuiteGroup } from "./test-case-table";

interface SuiteSidebarListProps {
  filteredGroups: SuiteGroup[];
  allGroupsCount: number;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onOpenNewSuiteModal: () => void;
  onRunSuite?: (group: SuiteGroup) => void;
  filterStatus: string;
  filterAssignee: string;
  search: string;
  allConstant: string;
}

export function SuiteSidebarList({
  filteredGroups,
  allGroupsCount,
  selectedKey,
  onSelectKey,
  onOpenNewSuiteModal,
  onRunSuite,
  filterStatus,
  filterAssignee,
  search,
  allConstant,
}: SuiteSidebarListProps) {
  if (filteredGroups.length === 0) {
    return (
      <div className="flex max-h-[320px] w-full shrink-0 flex-col gap-1 overflow-y-auto border-b border-gray-200/70 bg-transparent p-3 lg:h-full lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center text-gray-400">
          <FolderSimple size={32} weight="bold" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700">
              {allGroupsCount === 0 ? "No test suites yet" : "No suites match filter"}
            </p>
            <p className="text-[11px] text-gray-500">
              {allGroupsCount === 0
                ? "Create a suite to organize modules and write test cases."
                : "Adjust your filters or create a new suite."}
            </p>
          </div>
          {allGroupsCount === 0 && (
            <div className="mt-1 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onOpenNewSuiteModal}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={13} weight="bold" />
                Create First Suite
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[320px] w-full shrink-0 flex-col gap-1 overflow-y-auto border-b border-gray-200/70 bg-transparent p-3 lg:h-full lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
      {filteredGroups.map((group) => {
        const isActive = (selectedKey ?? filteredGroups[0]?.key) === group.key;
        const displayCount =
          filterStatus !== allConstant || search || filterAssignee !== allConstant
            ? (group.filteredCases?.length ?? group.cases.length)
            : group.cases.length;
        return (
          <button
            key={group.key}
            type="button"
            onClick={() => onSelectKey(group.key)}
            className={cn(
              "w-full cursor-pointer rounded-md px-4 py-3.5 text-left transition-all",
              isActive
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "hover:bg-gray-50",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {group.planProject && (
                  <p
                    className={cn(
                      "mb-0.5 truncate text-[10px] font-bold uppercase tracking-widest",
                      isActive ? "text-blue-200" : "text-blue-500",
                    )}
                  >
                    {group.planProject}
                  </p>
                )}
                <p
                  className={cn(
                    "truncate text-sm font-bold leading-snug",
                    isActive ? "text-white" : "text-gray-800",
                  )}
                >
                  {group.suiteTitle}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-[11px] font-semibold",
                    isActive ? "text-blue-200" : "text-gray-400",
                  )}
                >
                  {group.planTitle || "No plan"}
                </p>
                {group.suiteAssignee && (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[11px] font-semibold",
                      isActive ? "text-blue-100" : "text-gray-500",
                    )}
                  >
                    {group.suiteAssignee}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onRunSuite && (
                  <button
                    type="button"
                    title={`Run ${group.suiteTitle} immediately`}
                    aria-label={`Run suite ${group.suiteTitle}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRunSuite(group);
                    }}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded transition cursor-pointer",
                      isActive
                        ? "bg-white/20 text-white hover:bg-white/35"
                        : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-600",
                    )}
                  >
                    <Play size={11} weight="fill" />
                  </button>
                )}
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {displayCount}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "mt-2 flex items-center gap-2.5 text-[11px] font-bold",
                isActive ? "text-blue-200" : "text-gray-400",
              )}
            >
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-emerald-300" : "bg-emerald-500",
                  )}
                />
                {group.passed}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-rose-300" : "bg-rose-500",
                  )}
                />
                {group.failed}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-amber-300" : "bg-amber-400",
                  )}
                />
                {group.blocked}
              </span>
              {group.cases.length > 0 && (
                <div className="ml-auto flex h-1 flex-1 max-w-[48px] overflow-hidden rounded-full bg-white/20">
                  <div
                    style={{
                      width: `${(group.passed / group.cases.length) * 100}%`,
                    }}
                    className={cn(
                      "h-full transition-all",
                      isActive ? "bg-emerald-300" : "bg-emerald-500",
                    )}
                  />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
