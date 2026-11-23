"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { FolderSimple, Plus, Play, SidebarSimple } from "@phosphor-icons/react";
import type { SuiteGroup } from "./test-case-table";

interface SuiteSidebarListProps {
  filteredGroups: SuiteGroup[];
  allGroupsCount: number;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onOpenNewSuiteModal: () => void;
  onRunSuite?: (group: SuiteGroup) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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
  collapsed = false,
  onToggleCollapsed,
  filterStatus,
  filterAssignee,
  search,
  allConstant,
}: SuiteSidebarListProps) {
  if (collapsed) {
    return (
      <div className="hidden lg:flex w-12 shrink-0 flex-col items-center border-r border-gray-200/70 bg-gray-50/50 py-3 gap-3 select-none">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Show test suites"
          aria-label="Show test suites"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 shadow-2xs transition"
        >
          <SidebarSimple size={16} weight="bold" />
        </button>
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleCollapsed}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleCollapsed?.();
            }
          }}
          title={`Test Suites (${filteredGroups.length}) - Click to expand`}
          className="flex flex-1 flex-col items-center gap-2 cursor-pointer text-gray-400 hover:text-gray-700 transition"
        >
          <FolderSimple size={20} weight="bold" className="text-gray-500" />
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-bold text-blue-700">
            {filteredGroups.length}
          </span>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2">
            Suites
          </span>
        </div>
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="flex max-h-[320px] w-full shrink-0 flex-col gap-1 overflow-y-auto border-b border-gray-200/70 bg-transparent p-3 lg:h-full lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between pb-2 mb-1 px-1 border-b border-gray-200/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Suites (0)
          </span>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Hide test suites"
              aria-label="Hide test suites"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
            >
              <SidebarSimple size={15} weight="bold" />
            </button>
          )}
        </div>
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
      <div className="flex items-center justify-between pb-2 mb-1 px-1 border-b border-gray-200/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Suites ({filteredGroups.length})
        </span>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Hide test suites"
            aria-label="Hide test suites"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <SidebarSimple size={15} weight="bold" />
          </button>
        )}
      </div>
      {filteredGroups.map((group) => {
        const isActive = (selectedKey ?? filteredGroups[0]?.key) === group.key;
        const displayCount =
          filterStatus !== allConstant || search || filterAssignee !== allConstant
            ? (group.filteredCases?.length ?? group.cases.length)
            : group.cases.length;
        return (
          <div
            key={group.key}
            role="button"
            tabIndex={0}
            onClick={() => onSelectKey(group.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectKey(group.key);
              }
            }}
            className={cn(
              "w-full cursor-pointer rounded-md px-4 py-3.5 text-left transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
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
                    onKeyDown={(e) => {
                      e.stopPropagation();
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
          </div>
        );
      })}
    </div>
  );
}
