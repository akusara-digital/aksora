"use client";

import Link from "next/link";
import { WarningCircle, FolderSimple, Plus, ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getProjectsPageUrl } from "@/components/projects/project-dropdown-content";

export interface ProjectRequiredBannerProps {
  hasProjects?: boolean;
  selectedProject?: string;
  className?: string;
  onCreateProject?: () => void;
}

export function ProjectRequiredBanner({
  hasProjects = true,
  selectedProject = "",
  className,
  onCreateProject,
}: ProjectRequiredBannerProps) {
  const projectsUrl = getProjectsPageUrl();
  const trimmed = selectedProject.trim();
  const isSelected =
    trimmed.length > 0 &&
    trimmed.toLowerCase() !== "select project" &&
    trimmed.toLowerCase() !== "choose project";

  // If a valid project is already selected, don't show the warning banner
  if (hasProjects && isSelected) {
    return null;
  }

  // Case 1: Workspace has 0 projects created
  if (!hasProjects) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <WarningCircle size={16} weight="bold" className="text-amber-600 shrink-0" />
          <span className="font-semibold text-amber-900">
            No projects found in this workspace.
          </span>
          <span className="text-amber-800/90 hidden sm:inline">
            You must create a project first before adding work items.
          </span>
        </div>

        {onCreateProject ? (
          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus size={12} weight="bold" />
            <span>Create Project</span>
          </button>
        ) : (
          <Link
            href={projectsUrl}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer shrink-0 shadow-2xs"
          >
            <Plus size={12} weight="bold" />
            <span>Create Project</span>
            <ArrowRight size={11} weight="bold" />
          </Link>
        )}
      </div>
    );
  }

  // Case 2: Projects exist, but user hasn't selected one
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-blue-200/90 bg-blue-50/80 px-3.5 py-2 text-xs text-blue-950",
        className
      )}
    >
      <FolderSimple size={15} weight="bold" className="text-blue-600 shrink-0" />
      <span className="font-semibold text-blue-900">
        Project Required:
      </span>
      <span className="text-blue-800/90">
        Please select a project from the header dropdown above to proceed.
      </span>
    </div>
  );
}
