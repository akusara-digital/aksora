"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderSimplePlus, Plus } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { InlineAlert } from "@/components/ui/inline-alert";

export interface QuickProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: { id: number; name: string; key: string }) => void;
}

function generateProjectKey(projectName: string): string {
  const words = projectName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length >= 2) {
    return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
  }
  return words[0].slice(0, 4).toUpperCase();
}

export function QuickProjectModal({ isOpen, onClose, onSuccess }: QuickProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          key: key.trim().toUpperCase() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create project");
      }

      toast(`Project "${trimmedName}" created successfully!`, "success");
      setName("");
      setKey("");
      setIsKeyManuallyEdited(false);
      setDescription("");
      if (onSuccess && json.data) {
        onSuccess(json.data);
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Projects are the primary parent for test plans, suites, tasks, and bugs."
      icon={<FolderSimplePlus size={20} weight="bold" className="text-blue-600" />}
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
              const nextName = e.target.value;
              setName(nextName);
              if (!isKeyManuallyEdited) {
                setKey(generateProjectKey(nextName));
              }
              if (error) setError(null);
            }}
            placeholder="e.g. Mobile App, E-Commerce Platform"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Project Key <span className="text-slate-400 font-normal">(Optional code, max 4 chars, e.g. MOB, VANA)</span>
          </label>
          <input
            type="text"
            maxLength={4}
            value={key}
            onChange={(e) => {
              const nextKey = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
              setKey(nextKey);
              setIsKeyManuallyEdited(nextKey.length > 0);
              if (error) setError(null);
            }}
            placeholder="Auto-generated if left empty"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm uppercase text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
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
            className="p-3 text-xs placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={14} weight="bold" />
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
