"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Kanban } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { ProjectMemberItem } from "./project-hub-types";

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: { id: number; name: string };
  members?: ProjectMemberItem[];
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  "Feature",
  "Enhancement",
  "Bug Fix",
  "Tech Debt",
  "Research",
  "Refactor",
  "Documentation",
  "Improvement",
];

const STATUS_OPTIONS = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Backlog", value: "backlog" },
  { label: "Need to Test", value: "need_to_test" },
  { label: "Completed", value: "completed" },
];

const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"];

export function QuickTaskModal({
  isOpen,
  onClose,
  project,
  members = [],
  onSuccess,
}: QuickTaskModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Feature");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("P2");
  const [relatedFeature, setRelatedFeature] = useState("");
  const [assignee, setAssignee] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Task title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/items/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          project: project.name,
          projectId: project.id,
          category,
          status,
          priority,
          relatedFeature: relatedFeature.trim() || undefined,
          assignee: assignee.trim() || undefined,
          description: description.trim() || trimmedTitle,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to create task");
      }

      toast(`Task "${trimmedTitle}" created successfully!`, "success");
      setTitle("");
      setRelatedFeature("");
      setAssignee("");
      setDescription("");
      if (onSuccess) onSuccess();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description={`Add a new task to ${project.name}`}
      icon={<Kanban size={20} weight="bold" className="text-blue-600" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement user profile avatar upload"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Related Feature</label>
            <input
              type="text"
              value={relatedFeature}
              onChange={(e) => setRelatedFeature(e.target.value)}
              placeholder="e.g. Authentication"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assignee</label>
            {members.length > 0 ? (
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name || m.email}>
                    {m.name || m.email} ({m.role.toUpperCase()})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
          <AutoResizeTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description, requirements, or steps..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Plus size={14} weight="bold" />
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
