"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderSimple,
  FolderSimplePlus,
  Plus,
  MagnifyingGlass,
  X,
  ArrowRight,
  ClipboardText,
  Bug,
  Kanban,
  Clock,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Users,
  PencilSimple,
} from "@phosphor-icons/react";
import { QuickProjectModal } from "@/components/projects/quick-project-modal";
import { QuickEditProjectModal } from "@/components/projects/quick-edit-project-modal";
import { ProjectMembersModal } from "@/components/projects/project-members-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { formatDate, cn } from "@/lib/utils";

interface ProjectItem {
  id: number;
  name: string;
  key: string;
  description: string;
  status: string;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
  planCount: number;
  bugCount: number;
  taskCount: number;
}

type TabFilter = "active" | "archived" | "all";

export function ProjectsClient() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [membersProject, setMembersProject] = useState<ProjectItem | null>(null);
  const [editTarget, setEditTarget] = useState<ProjectItem | null>(null);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects.");
      const data = await res.json();
      setProjects(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleToggleArchive = async (project: ProjectItem) => {
    const nextStatus = project.status === "archived" ? "active" : "archived";
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update project status.");
      }
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p)),
      );
      toast(
        nextStatus === "archived"
          ? `Project "${project.name}" archived.`
          : `Project "${project.name}" restored to active.`,
        "success",
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to change project status", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}?cascade=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete project.");
      }
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast(`Project "${deleteTarget.name}" deleted successfully.`, "success");
      setDeleteTarget(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete project", "error");
    } finally {
      setDeleting(false);
    }
  };

  const query = search.trim().toLowerCase();
  const filtered = projects.filter((p) => {
    if (tab === "active" && p.status === "archived") return false;
    if (tab === "archived" && p.status !== "archived") return false;

    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.key && p.key.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  const activeCount = projects.filter((p) => p.status !== "archived").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;

  return (
    <>
      <section className="overflow-hidden bg-white border border-gray-200">
        {/* Header Row */}
        <div className="border-b border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700 border border-blue-100">
                  <FolderSimple size={18} weight="bold" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Projects</h2>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">Projects, test plans, suites, tasks, and defects for your workspace.</p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-2.5 lg:w-auto lg:flex-1 lg:justify-end">
              <div className="relative w-full min-w-0 md:w-56 lg:max-w-56">
                <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                  <MagnifyingGlass size={14} weight="bold" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects..."
                  className="h-8 w-full border border-gray-200 bg-white pl-8 pr-7 text-[13px] outline-none transition-colors focus:border-blue-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-[13px] font-bold text-white transition hover:bg-blue-700 shadow-xs shrink-0"
              >
                <Plus size={14} weight="bold" className="shrink-0" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Toolbar Row */}
        <div className="sticky top-0 z-[var(--z-sticky)] border-b border-gray-200 bg-white px-4 sm:px-5 py-2.5 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Tabs */}
            <div className="flex h-8 items-center border border-gray-200 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setTab("active")}
                className={cn(
                  "h-full px-3 text-[12px] font-medium transition-colors cursor-pointer",
                  tab === "active"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setTab("archived")}
                className={cn(
                  "h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors cursor-pointer",
                  tab === "archived"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                Archived ({archivedCount})
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={cn(
                  "h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors cursor-pointer",
                  tab === "all"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                All ({projects.length})
              </button>
            </div>

            {/* Right: Info & Clear */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {(tab !== "active" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("active");
                    setSearch("");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
                >
                  <X size={11} weight="bold" />
                  Clear
                </button>
              )}

              <div className="h-4 w-px bg-gray-200 hidden sm:block" />

              <span className="text-xs font-medium text-gray-400 hidden sm:inline">
                {filtered.length} project{filtered.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">

      {error && <InlineAlert variant="error" message={error} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
              <FolderSimplePlus size={28} weight="bold" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No projects yet</h3>
            <p className="mt-1.5 max-w-sm text-xs text-slate-500">
              Projects are the root parent for everything: test plans, test suites, sprint tasks, and bugs. Create your first project to get started.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
            >
              <Plus size={14} weight="bold" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-xs font-medium text-slate-600">
              No {tab !== "all" ? tab : ""} projects found {search ? `matching "${search}"` : ""}.
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const isArchived = project.status === "archived";
            const totalAssoc = (project.planCount || 0) + (project.bugCount || 0) + (project.taskCount || 0);

            return (
              <div
                key={project.id}
                className={`group flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition hover:shadow-sm ${
                  isArchived ? "border-slate-200/70 bg-slate-50/50 opacity-80" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                          isArchived ? "bg-slate-200 text-slate-600" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {project.key || <FolderSimple size={18} weight="bold" />}
                      </div>
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition"
                        >
                          {project.name}
                        </Link>
                        {project.key && (
                          <span className="inline-block font-mono text-[11px] text-slate-400">
                            [{project.key}]
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isArchived
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {project.status || "active"}
                      </span>

                      {/* Archive toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(project)}
                        title={isArchived ? "Restore project" : "Archive project"}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                      >
                        {isArchived ? (
                          <ArrowCounterClockwise size={14} weight="bold" />
                        ) : (
                          <Archive size={14} weight="bold" />
                        )}
                      </button>

                      {/* Edit / Rename button */}
                      <button
                        type="button"
                        onClick={() => setEditTarget(project)}
                        title="Edit / Rename project"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>

                      {/* Members / Team button */}
                      <button
                        type="button"
                        onClick={() => setMembersProject(project)}
                        title="Project members & access"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                      >
                        <Users size={14} weight="bold" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(project)}
                        title="Delete project"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs text-slate-500 min-h-[2rem]">
                    {project.description || "No description provided."}
                  </p>

                  {/* Counts / metrics */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                    <Link
                      href={`/projects/${project.id}?tab=tests`}
                      className="rounded-lg bg-slate-50 p-2 transition hover:bg-blue-50"
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700">
                        <ClipboardText size={13} weight="bold" className="text-blue-500" />
                        {project.planCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Plans</div>
                    </Link>
                    <Link
                      href={`/projects/${project.id}?tab=bugs`}
                      className="rounded-lg bg-slate-50 p-2 transition hover:bg-rose-50"
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700">
                        <Bug size={13} weight="bold" className="text-rose-500" />
                        {project.bugCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Bugs</div>
                    </Link>
                    <Link
                      href={`/projects/${project.id}?tab=tasks`}
                      className="rounded-lg bg-slate-50 p-2 transition hover:bg-emerald-50"
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700">
                        <Kanban size={13} weight="bold" className="text-emerald-500" />
                        {project.taskCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Tasks</div>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={12} weight="bold" />
                    {formatDate(project.createdAt)}
                  </span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                  >
                    Open Hub
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      </section>

      {/* Project Members Modal */}
      <ProjectMembersModal
        project={membersProject}
        isOpen={Boolean(membersProject)}
        onClose={() => setMembersProject(null)}
      />

      {/* Creation Modal */}
      <QuickProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchProjects()}
      />

      {/* Edit Project Modal */}
      <QuickEditProjectModal
        project={editTarget}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={(updated) => {
          setProjects((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
          setEditTarget(null);
        }}
      />

      {/* Protective Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title={`Delete Project: ${deleteTarget.name}`}
          message={
            (deleteTarget.planCount || 0) + (deleteTarget.bugCount || 0) + (deleteTarget.taskCount || 0) > 0
              ? `Warning: Project "${deleteTarget.name}" contains ${deleteTarget.planCount || 0} test plans, ${deleteTarget.bugCount || 0} bugs, and ${deleteTarget.taskCount || 0} tasks. Deleting this project will soft-delete all associated items. Are you sure you want to proceed?`
              : `Are you sure you want to delete project "${deleteTarget.name}"? This action cannot be undone.`
          }
          type="danger"
          confirmText={deleting ? "Deleting..." : "Delete Project"}
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
