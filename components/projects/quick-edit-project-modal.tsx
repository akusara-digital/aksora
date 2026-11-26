"use client";

import { useEffect, useState } from "react";
import { PencilSimple, Check } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface ProjectEditItem {
  id: number;
  name: string;
  key?: string;
  description?: string;
  status?: string;
  publicToken?: string;
}

export interface QuickEditProjectModalProps {
  project: ProjectEditItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: ProjectEditItem) => void;
}

export function QuickEditProjectModal({
  project,
  isOpen,
  onClose,
  onSuccess,
}: QuickEditProjectModalProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setKey(project.key || "");
      setDescription(project.description || "");
      setStatus(project.status || "active");
      setError(null);
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          key: key.trim().toUpperCase() || undefined,
          description: description.trim(),
          status: status === "archived" ? "archived" : "active",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update project");
      }

      toast("Project updated successfully", "success");
      if (onSuccess && json.data) {
        onSuccess(json.data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      description="Update project details, rename project key, or change archive status."
      icon={<PencilSimple size={20} weight="bold" className="text-blue-600" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <InlineAlert variant="error" message={error} />}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Project Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Mobile App, E-Commerce Platform"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Project Key <span className="text-slate-400 font-normal">(Optional code, e.g. MOB, ECM)</span>
          </label>
          <input
            type="text"
            maxLength={10}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="Code prefix for items"
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Status</label>
          <CustomSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active", dot: "bg-emerald-500" },
              { value: "archived", label: "Archived", dot: "bg-slate-400" },
            ]}
            className="h-10 rounded-md"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <AutoResizeTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxHeight={220}
            placeholder="Brief scope or purpose of this project..."
            className="p-3 text-xs placeholder:text-slate-400 rounded-md"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} weight="bold" />
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
