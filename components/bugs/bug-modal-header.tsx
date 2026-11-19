"use client";

import { useState, useRef, useEffect } from "react";
import { Lightning, ListBullets, X, CaretDown, SquaresFour } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface BugModalHeaderProps {
  title?: string;
  project: string;
  onProjectChange: (project: string) => void;
  projectOptions: Array<{ label: string; value: string }>;
  mode: "ai" | "manual";
  onModeChange: (mode: "ai" | "manual") => void;
  onClose: () => void;
  isEditing?: boolean;
}

export function BugModalHeader({
  title = "New Bug",
  project,
  onProjectChange,
  projectOptions = [],
  mode,
  onModeChange,
  onClose,
  isEditing = false,
}: BugModalHeaderProps) {
  const [projectOpen, setProjectOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = projectOptions.find((o) => o.value === project || o.label === project);
  const displayLabel = currentOption ? currentOption.label : project || "Select Project";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
      {/* Left: Breadcrumb with Title & Project Dropdown */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
        <span className="text-slate-300 font-medium select-none">/</span>

        {/* Project Selector Popover */}
        <div ref={dropdownRef} className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setProjectOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 transition cursor-pointer shadow-2xs"
          >
            <SquaresFour size={14} weight="bold" className="text-slate-500 shrink-0" />
            <span className="max-w-[160px] sm:max-w-[200px] truncate">{displayLabel}</span>
            <CaretDown size={12} weight="bold" className="text-slate-400 shrink-0" />
          </button>

          {projectOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Project
              </div>
              {projectOptions.length > 0 ? (
                projectOptions.map((opt) => {
                  const isSelected = opt.value === project || opt.label === project;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onProjectChange(opt.value);
                        setProjectOpen(false);
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
                })
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No projects found</div>
              )}
            </div>
          )}
        </div>
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
