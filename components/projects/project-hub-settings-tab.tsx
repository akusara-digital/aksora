"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FloppyDisk,
  Archive,
  ArrowCounterClockwise,
  Trash,
  Key,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { ProjectData } from "./project-hub-types";

interface ProjectHubSettingsTabProps {
  project: ProjectData;
  onProjectUpdated?: (updated: ProjectData) => void;
}

export function ProjectHubSettingsTab({
  project,
  onProjectUpdated,
}: ProjectHubSettingsTabProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key || "");
  const [description, setDescription] = useState(project.description || "");
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isArchived = project.status === "archived";

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Project name cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: key.trim().toUpperCase() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to update project details.");
      }

      toast("Project details updated successfully!", "success");
      if (onProjectUpdated && json.data) {
        onProjectUpdated(json.data);
      }
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update project", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    const nextStatus = isArchived ? "active" : "archived";
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to update project status.");
      }

      toast(
        nextStatus === "archived"
          ? `Project "${project.name}" archived.`
          : `Project "${project.name}" restored to active.`,
        "success",
      );
      if (onProjectUpdated && json.data) {
        onProjectUpdated(json.data);
      }
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to change project status", "error");
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}?cascade=true`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete project.");
      }

      toast(`Project "${project.name}" deleted successfully.`, "success");
      router.push("/projects");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete project", "error");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Project Details Card ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          General Information
        </h3>

        <form onSubmit={handleSaveDetails} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Key
              </label>
              <div className="relative">
                <Key size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={10}
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="e.g. AKS"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description
            </label>
            <AutoResizeTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this project encompass?"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FloppyDisk size={14} weight="bold" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Lifecycle Card ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Lifecycle & Status
        </h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">
              {isArchived ? "Project is Archived" : "Project is Active"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {isArchived
                ? "Archived projects are hidden from default views but retain all historical data."
                : "Archive this project when no longer active. You can restore it at any time."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleArchive}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {isArchived ? (
              <>
                <ArrowCounterClockwise size={14} weight="bold" />
                Restore Project
              </>
            ) : (
              <>
                <Archive size={14} weight="bold" />
                Archive Project
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Danger Zone Card ── */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-rose-800 border-b border-rose-100 pb-3">
          Danger Zone
        </h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-rose-900">Delete this project</p>
            <p className="mt-0.5 text-xs text-rose-700/80">
              Soft-deletes this project and its associated sprint tasks, defects, and test plans.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
          >
            <Trash size={14} weight="bold" />
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete Project: ${project.name}`}
        message={`Are you sure you want to delete project "${project.name}"? Associated items will be soft-deleted.`}
        type="danger"
        confirmText={deleting ? "Deleting..." : "Delete Project"}
        cancelText="Cancel"
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
