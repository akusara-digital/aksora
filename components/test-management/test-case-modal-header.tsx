"use client";

import { useState, useRef, useEffect } from "react";
import { Lightning, ListBullets, X, CaretDown, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ProjectDropdownContent } from "@/components/projects/project-dropdown-content";

export interface TestCaseModalHeaderProps {
  title?: string;
  project?: string;
  onProjectChange?: (project: string) => void;
  projectOptions?: Array<{ label: string; value: string }>;
  suiteTitle?: string;
  suiteId?: string;
  onSuiteChange?: (suiteId: string) => void;
  suiteOptions?: Array<{ label: string; value: string; project?: string }>;
  mode: "ai" | "manual";
  onModeChange: (mode: "ai" | "manual") => void;
  onClose: () => void;
  isEditing?: boolean;
}

export function TestCaseModalHeader({
  title = "New Test Case",
  project = "",
  onProjectChange,
  projectOptions = [],
  suiteTitle = "",
  suiteId = "",
  onSuiteChange,
  suiteOptions = [],
  mode,
  onModeChange,
  onClose,
  isEditing = false,
}: TestCaseModalHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentProjectOpt = projectOptions.find((o) => o.value === project || o.label === project);
  const currentSuiteOpt = suiteOptions.find((o) => o.value === suiteId || o.label === suiteTitle);
  const projectDisplay = currentProjectOpt ? currentProjectOpt.label : project;
  const suiteDisplay = currentSuiteOpt ? currentSuiteOpt.label : suiteTitle;

  const displayContext = suiteDisplay
    ? projectDisplay
      ? `${projectDisplay} / ${suiteDisplay}`
      : suiteDisplay
    : projectDisplay
    ? `${projectDisplay} / New Suite`
    : "New Suite (Auto-Created)";

  const hasContextOptions =
    (projectOptions.length > 0 && Boolean(onProjectChange)) ||
    (suiteOptions.length > 0 && Boolean(onSuiteChange)) ||
    suiteOptions.length === 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
      {/* Left: Breadcrumb with Title & Scope Dropdown */}
      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-base font-bold text-slate-900 tracking-tight shrink-0">{title}</h3>
        <span className="text-slate-300 font-medium select-none">/</span>

        {hasContextOptions ? (
          <div ref={dropdownRef} className="relative inline-block text-left min-w-0">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 transition cursor-pointer shadow-2xs max-w-full"
            >
              <SquaresFour size={14} weight="bold" className="text-slate-500 shrink-0" />
              <span className="max-w-[160px] sm:max-w-[240px] truncate">{displayContext}</span>
              <CaretDown size={12} weight="bold" className="text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                {/* Auto-create suite banner when no suites exist */}
                {suiteOptions.length === 0 && (
                  <div className="border-b border-slate-100 px-3 py-1.5 bg-blue-50/70 mb-1 rounded-t-md text-[11px] text-blue-900 flex items-center justify-between gap-1.5">
                    <span className="font-semibold flex items-center gap-1">📁 Auto-Suite</span>
                    <span className="font-medium text-blue-700 truncate">&quot;{suiteDisplay || "General Test Suite"}&quot;</span>
                  </div>
                )}

                {/* Suite Options */}
                {suiteOptions.length > 0 && onSuiteChange && (
                  <div className="border-b border-slate-100 pb-1 mb-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Suite
                    </div>
                    {suiteOptions.map((opt) => {
                      const isSelected = opt.value === suiteId || opt.label === suiteTitle;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onSuiteChange(opt.value);
                            setDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center justify-between",
                            isSelected
                              ? "bg-blue-50 font-semibold text-blue-700"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                          )}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <span className="text-blue-600 text-xs font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Project Options */}
                {Boolean(onProjectChange) && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    <ProjectDropdownContent
                      options={projectOptions}
                      selectedValue={project}
                      onSelect={(val) => {
                        onProjectChange?.(val);
                        setDropdownOpen(false);
                      }}
                      onClose={() => setDropdownOpen(false)}
                      title="Select Project"
                      emptyTitle="No projects found"
                      emptySubtitle="Create a project first."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
            <SquaresFour size={14} weight="bold" className="text-slate-500 shrink-0" />
            <span className="max-w-[200px] truncate">{displayContext}</span>
          </span>
        )}
      </div>

      {/* Right: Mode Switcher & Close Button */}
      <div className="flex items-center gap-3">
        {!isEditing && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onModeChange("ai")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer",
                mode === "ai"
                  ? "bg-white text-blue-600 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <Lightning size={13} weight="bold" className={mode === "ai" ? "text-blue-600" : "text-slate-400"} />
              <span>Auto (AI)</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange("manual")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer",
                mode === "manual"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              <ListBullets size={13} weight="bold" className={mode === "manual" ? "text-slate-900" : "text-slate-400"} />
              <span>Manual</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Close"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
