"use client";

import { createPortal } from "react-dom";
import { Lightning, ListBullets, X, CaretDown, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { usePortalDropdown } from "@/hooks/use-portal-dropdown";
import { ProjectDropdownContent } from "@/components/projects/project-dropdown-content";

interface SuiteModalHeaderProps {
  title?: string;
  project?: string;
  onProjectChange?: (project: string) => void;
  projectOptions?: Array<{ label: string; value: string }>;
  mode: "ai" | "manual";
  onModeChange: (mode: "ai" | "manual") => void;
  onClose: () => void;
}

export function SuiteModalHeader({
  title = "New Test Suite",
  project = "",
  onProjectChange,
  projectOptions = [],
  mode,
  onModeChange,
  onClose,
}: SuiteModalHeaderProps) {
  const { setOpen: setProjectOpen, toggle, triggerRef, menuRef, ready, portalStyle } = usePortalDropdown({
    width: 256,
    estHeight: 280,
  });

  const currentOption = projectOptions.find((o) => o.value === project || o.label === project);
  const hasNoProjects = projectOptions.length === 0;
  const isMissingProject = !project || project === "Select Project" || project === "Choose project";
  const displayLabel = currentOption
    ? currentOption.label
    : hasNoProjects
    ? "Create Project First *"
    : "Select Project *";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
      {/* Left: Breadcrumb with Title & Project Dropdown */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>

        {Boolean(onProjectChange) && (
          <>
            <span className="text-slate-300 font-medium select-none">/</span>
            <div className="relative inline-block text-left">
              <button
                ref={triggerRef}
                type="button"
                onClick={toggle}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition cursor-pointer shadow-2xs",
                  hasNoProjects
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300/40"
                    : isMissingProject
                    ? "border-blue-300 bg-blue-50/70 text-blue-900 hover:bg-blue-100/70 ring-1 ring-blue-300/30"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80"
                )}
              >
                <SquaresFour
                  size={14}
                  weight="bold"
                  className={hasNoProjects ? "text-amber-600 shrink-0" : isMissingProject ? "text-blue-600 shrink-0" : "text-slate-500 shrink-0"}
                />
                <span className="max-w-[160px] sm:max-w-[200px] truncate">{displayLabel}</span>
                <CaretDown size={12} weight="bold" className={hasNoProjects ? "text-amber-500 shrink-0" : "text-slate-400 shrink-0"} />
              </button>

              {ready &&
                createPortal(
                  <div
                    ref={menuRef}
                    style={portalStyle}
                    className="w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100"
                  >
                    <ProjectDropdownContent
                      options={projectOptions}
                      selectedValue={project}
                      onSelect={(val) => onProjectChange?.(val)}
                      onClose={() => setProjectOpen(false)}
                      title="Select Project"
                      emptyTitle="No projects found"
                      emptySubtitle="Create a project first."
                    />
                  </div>,
                  document.body,
                )}
            </div>
          </>
        )}
      </div>

      {/* Right: Mode Switcher & Close Button */}
      <div className="flex items-center gap-3">
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
