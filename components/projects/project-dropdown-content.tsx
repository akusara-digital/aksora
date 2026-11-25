"use client";

import Link from "next/link";
import { ArrowRight, Check, FolderSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function getProjectsPageUrl(): string {
  if (typeof window !== "undefined") {
    const ws = new URLSearchParams(window.location.search).get("ws");
    if (ws) return `/projects?ws=${encodeURIComponent(ws)}`;
  }
  return "/projects";
}

export interface ProjectOption {
  label: string;
  value: string;
}

export interface ProjectDropdownContentProps {
  options: ProjectOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose?: () => void;
  className?: string;
  title?: string;
  manageLabel?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export function ProjectDropdownContent({
  options,
  selectedValue,
  onSelect,
  onClose,
  className,
  title = "Select Project",
  manageLabel = "Manage Projects",
  emptyTitle = "No projects found",
  emptySubtitle = "Create a project first.",
}: ProjectDropdownContentProps) {
  const projectsUrl = getProjectsPageUrl();

  return (
    <div className={cn("w-full text-left", className)}>
      {title && (
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </div>
      )}

      {options.length > 0 ? (
        <>
          <div className="max-h-48 overflow-y-auto py-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === selectedValue || opt.label === selectedValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSelect(opt.value);
                    onClose?.();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center justify-between",
                    isSelected
                      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} weight="bold" className="text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 p-1 bg-slate-50/80 dark:bg-slate-900/80">
            <Link
              href={projectsUrl}
              onClick={() => onClose?.()}
              className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-1.5">
                <FolderSimple size={13} weight="bold" />
                <span>{manageLabel}</span>
              </span>
              <ArrowRight size={11} weight="bold" />
            </Link>
          </div>
        </>
      ) : (
        <div className="p-3 text-center">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{emptyTitle}</p>
          {emptySubtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {emptySubtitle}
            </p>
          )}
          <Link
            href={projectsUrl}
            onClick={() => onClose?.()}
            className="mt-2.5 inline-flex items-center justify-center gap-1.5 w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition"
          >
            <span>+ Create Project First</span>
            <ArrowRight size={11} weight="bold" />
          </Link>
        </div>
      )}
    </div>
  );
}
