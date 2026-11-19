"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  CheckSquareOffset,
  Bug,
  CircleNotch,
  WarningCircle,
  FolderSimple,
  User,
  Flag,
  Tag,
  Flame,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/components/layout/account-dropdown";

export interface GlobalCreateModalProps {
  open: boolean;
  onClose: () => void;
  user?: AppUser | null;
}

interface ProjectOption {
  id: number;
  name: string;
  key?: string;
}

interface AssigneeOption {
  value: string;
  label: string;
}

const PRIORITIES = [
  { value: "P0", label: "P0 - Blocker" },
  { value: "P1", label: "P1 - Critical" },
  { value: "P2", label: "P2 - Major" },
  { value: "P3", label: "P3 - Minor" },
] as const;

const TASK_CATEGORIES = ["Feature", "Enhancement", "Bug Fix", "Tech Debt", "Support"] as const;

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export function GlobalCreateModal({ open, onClose }: GlobalCreateModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [type, setType] = useState<"tasks" | "bugs">("tasks");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const [project, setProject] = useState("");
  const [customProject, setCustomProject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"P0" | "P1" | "P2" | "P3">("P2");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [category, setCategory] = useState<(typeof TASK_CATEGORIES)[number]>("Feature");
  const [assignee, setAssignee] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!optionsLoaded) {
      setLoadingOptions(true);
      Promise.all([
        fetch("/api/projects").then((r) => r.json()).then((d) => (Array.isArray(d?.data) ? (d.data as ProjectOption[]) : [])).catch(() => [] as ProjectOption[]),
        fetch("/api/options/assignees").then((r) => r.json()).then((d) => (Array.isArray(d?.options) ? (d.options as AssigneeOption[]) : [])).catch(() => [] as AssigneeOption[]),
      ]).then(([projList, assigneeList]) => {
        setProjects(projList);
        setAssignees(assigneeList);
        setOptionsLoaded(true);
        if (projList.length > 0 && !project) setProject(projList[0].name);
      }).finally(() => setLoadingOptions(false));
    }
    const timer = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, optionsLoaded, project]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, type, project, customProject, title, description, priority, severity, category, assignee, submitting]);

  if (!open) return null;

  const activeProject = project === "__custom__" || projects.length === 0 ? customProject.trim() : project;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      titleInputRef.current?.focus();
      return;
    }
    if (!activeProject) {
      setError("Please select or specify a project.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = type === "tasks"
        ? {
            title: trimmedTitle,
            project: activeProject,
            category,
            priority,
            status: "todo",
            description: description.trim() || trimmedTitle,
            assignee: assignee.trim(),
          }
        : {
            title: trimmedTitle,
            project: activeProject,
            priority,
            severity,
            status: "open",
            stepsToReproduce: description.trim(),
            suggestedDev: assignee.trim(),
          };

      const res = await fetch(`/api/items/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg = json?.error || "Failed to create item.";
        setError(errMsg);
        toast(errMsg, "error");
        return;
      }

      toast(type === "tasks" ? "Task created successfully" : "Bug logged successfully", "success");
      setTitle("");
      setDescription("");
      setError(null);
      onClose();
      startTransition(() => router.refresh());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="global-create-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h2 id="global-create-modal-title" className="text-sm font-bold text-slate-900">New Item</h2>
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg ml-2">
              <button
                type="button"
                onClick={() => setType("tasks")}
                className={cn("flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all", type === "tasks" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900")}
              >
                <CheckSquareOffset size={14} weight="bold" />
                <span>Task</span>
              </button>
              <button
                type="button"
                onClick={() => setType("bugs")}
                className={cn("flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all", type === "bugs" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900")}
              >
                <Bug size={14} weight="bold" />
                <span>Bug</span>
              </button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition" aria-label="Close dialog">
            <X size={18} weight="bold" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Project selector */}
          <div>
            <label htmlFor="create-item-project" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FolderSimple size={14} weight="bold" className="text-slate-500" />
              <span>Project</span>
              <span className="text-rose-500">*</span>
            </label>
            {loadingOptions ? (
              <div className="h-9 w-full bg-slate-100 rounded-lg animate-pulse" />
            ) : projects.length > 0 ? (
              <div className="space-y-1.5">
                <select id="create-item-project" value={project} onChange={(e) => setProject(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {projects.map((p) => (<option key={p.id} value={p.name}>{p.name} {p.key ? `(${p.key})` : ""}</option>))}
                  <option value="__custom__">+ Enter custom project name...</option>
                </select>
                {project === "__custom__" && (
                  <input type="text" value={customProject} onChange={(e) => setCustomProject(e.target.value)} placeholder="Enter project name..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <WarningCircle size={15} weight="bold" className="text-amber-600 shrink-0" />
                  <span>No existing projects found in this workspace. Enter a name to proceed.</span>
                </div>
                <input id="create-item-project" type="text" value={customProject} onChange={(e) => setCustomProject(e.target.value)} placeholder="e.g. Aksora Core" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="create-item-title" className="block text-xs font-bold text-slate-700 mb-1">
              {type === "tasks" ? "Task Title" : "Bug Title"} <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="create-item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "tasks" ? "e.g. Implement user export button" : "e.g. Checkout button unresponsive on mobile Safari"}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="create-item-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {type === "tasks" ? "Description" : "Steps to Reproduce / Summary"} <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="create-item-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "tasks" ? "Add context, acceptance criteria, or technical details..." : "1. Navigate to page\n2. Click button\n3. Observe error..."}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-y"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="create-item-priority" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Flag size={13} weight="bold" className="text-slate-500" />
                <span>Priority</span>
              </label>
              <select id="create-item-priority" value={priority} onChange={(e) => setPriority(e.target.value as "P0" | "P1" | "P2" | "P3")} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                {PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </div>

            {type === "tasks" ? (
              <div>
                <label htmlFor="create-item-category" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag size={13} weight="bold" className="text-slate-500" />
                  <span>Category</span>
                </label>
                <select id="create-item-category" value={category} onChange={(e) => setCategory(e.target.value as (typeof TASK_CATEGORIES)[number])} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {TASK_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="create-item-severity" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Flame size={13} weight="bold" className="text-rose-500" />
                  <span>Severity</span>
                </label>
                <select id="create-item-severity" value={severity} onChange={(e) => setSeverity(e.target.value as (typeof SEVERITIES)[number]["value"])} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition">
                  {SEVERITIES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="create-item-assignee" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User size={13} weight="bold" className="text-slate-500" />
                <span>Assignee</span>
              </label>
              <select id="create-item-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="">Unassigned</option>
                {assignees.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
              </select>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
              <span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-mono">Enter</kbd> to save
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-mono">Esc</kbd> to cancel
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50",
                  type === "tasks" ? "bg-blue-600 hover:bg-blue-700" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {submitting ? (
                  <>
                    <CircleNotch size={14} weight="bold" className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} weight="bold" />
                    <span>{type === "tasks" ? "Create Task" : "Log Bug"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
