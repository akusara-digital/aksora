"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Sparkle,
  Plus,
  Calendar,
  CaretDown,
  CaretUp,
  FolderSimple,
  CircleNotch,
  SquaresFour,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ProjectDropdownContent } from "@/components/projects/project-dropdown-content";
import { getActiveAiConfig } from "@/lib/ai-keys";
import { validateProjectSelection } from "@/lib/project-utils";
import { ProjectRequiredBanner } from "@/components/projects/project-required-banner";

export interface QuickTestPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProject?: string;
  projectOptions?: Array<{ label: string; value: string }> | string[];
  initialData?: Record<string, unknown> | null;
  onCreated?: (planId: string | number) => void;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function QuickTestPlanModal({
  isOpen,
  onClose,
  defaultProject = "",
  projectOptions = [],
  initialData = null,
  onCreated,
}: QuickTestPlanModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">(initialData ? "manual" : "ai");

  // Form states
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(defaultProject);
  const [sprint, setSprint] = useState("");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState("");

  // AI mode states
  const [aiPrompt, setAiPrompt] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, setPending] = useState(false);
  const [showCollapsible, setShowCollapsible] = useState(false);
  const [activeEngine, setActiveEngine] = useState<{ provider: string; model: string }>({
    provider: "",
    model: "",
  });

  // Project selector dropdown states
  const [loadedProjects, setLoadedProjects] = useState<Array<{ label: string; value: string }>>([]);
  const [headerProjectDropdownOpen, setHeaderProjectDropdownOpen] = useState(false);
  const [formProjectDropdownOpen, setFormProjectDropdownOpen] = useState(false);
  const headerProjectDropdownRef = useRef<HTMLDivElement>(null);
  const formProjectDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch full project list from /api/projects so options are always up-to-date with /projects
  useEffect(() => {
    if (!isOpen) return;
    setActiveEngine(getActiveAiConfig());

    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          const opts = json.data.map((p: { name: string; key?: string }) => ({
            value: p.name,
            label: p.key ? `[${p.key}] ${p.name}` : p.name,
          }));
          setLoadedProjects(opts);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Click outside listener for project dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        headerProjectDropdownRef.current &&
        !headerProjectDropdownRef.current.contains(e.target as Node)
      ) {
        setHeaderProjectDropdownOpen(false);
      }
      if (
        formProjectDropdownRef.current &&
        !formProjectDropdownRef.current.contains(e.target as Node)
      ) {
        setFormProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedProjects = useMemo(() => {
    const map = new Map<string, string>();
    projectOptions.forEach((p) => {
      if (typeof p === "string") {
        if (p.trim()) map.set(p.trim(), p.trim());
      } else if (p && p.value) {
        map.set(p.value, p.label || p.value);
      }
    });
    loadedProjects.forEach((p) => {
      map.set(p.value, p.label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [projectOptions, loadedProjects]);

  const currentProjectOption = normalizedProjects.find(
    (o) => o.value === project || o.label === project
  );
  const hasNoProjects = normalizedProjects.length === 0;
  const isMissingProject = !project || project === "Select Project" || project === "Choose project";
  const displayProjectLabel = currentProjectOption
    ? currentProjectOption.label
    : hasNoProjects
    ? "Create Project First *"
    : "Select Project *";

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setMode("manual");
      setTitle(String(initialData.title || ""));
      setProject(String(initialData.project || defaultProject || ""));
      setSprint(String(initialData.sprint || ""));
      setStatus(String(initialData.status || "active").toLowerCase());
      setStartDate(String(initialData.startDate || ""));
      setEndDate(String(initialData.endDate || ""));
      setScope(String(initialData.scope || ""));
      setNotes(String(initialData.notes || ""));
      setAssignee(String(initialData.assignee || ""));
      setShowCollapsible(Boolean(initialData.scope || initialData.notes));
    } else {
      setMode("ai");
      setTitle("");
      setProject(defaultProject || (projectOptions[0] ? (typeof projectOptions[0] === "string" ? projectOptions[0] : projectOptions[0].value) : ""));
      setSprint("");
      setStatus("active");
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
      setScope("");
      setNotes("");
      setAssignee("");
      setAiPrompt("");
      setShowCollapsible(false);
    }
  }, [isOpen, initialData, defaultProject, projectOptions]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialData?.id);

  const handleStructureWithAi = async () => {
    const projectVal = validateProjectSelection(project, normalizedProjects);
    if (!projectVal.valid) {
      toast(projectVal.message, "error");
      return;
    }

    if (!aiPrompt.trim()) {
      toast("Please enter a description or paste testing requirements.", "info");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_issue_text",
          payload: { text: aiPrompt, project: project || "General" },
        }),
      });
      const json = await res.json().catch(() => ({}));
      const payload = json.data || {};

      setTitle(payload.title || aiPrompt.slice(0, 50) + " Plan");
      if (payload.project && !project) setProject(payload.project);
      if (payload.scope) setScope(payload.scope);
      else setScope(aiPrompt);

      toast("AI structured the test plan requirements. Review below.", "success");
      setMode("manual");
      setShowCollapsible(true);
    } catch {
      setTitle(aiPrompt.slice(0, 50) + " Plan");
      setScope(aiPrompt);
      setMode("manual");
      setShowCollapsible(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const projectVal = validateProjectSelection(project, normalizedProjects);
    if (!projectVal.valid) {
      toast(projectVal.message, "error");
      return;
    }

    const planTitle = title.trim() || aiPrompt.trim().slice(0, 50) || "Untitled Test Plan";
    const planProject = project.trim();

    setPending(true);
    try {
      const method = isEditing ? "PATCH" : "POST";
      const payload: Record<string, unknown> = {
        title: planTitle,
        project: planProject,
        sprint: sprint.trim() || "Sprint 1",
        status: status.toLowerCase(),
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        scope: scope.trim() || aiPrompt.trim(),
        notes: notes.trim(),
        assignee: assignee.trim(),
      };

      if (isEditing) {
        payload.id = initialData?.id;
      }

      const res = await fetch("/api/items/test-plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to save test plan.");
      }

      toast(isEditing ? "Test plan updated successfully." : "Test plan created successfully.", "success");
      if (onCreated && json.data?.id) {
        onCreated(json.data.id);
      }

      router.refresh();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save test plan.", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/40 backdrop-blur-xs">
      <div className="relative flex min-h-[580px] max-h-[92vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-gray-900 shrink-0">
              {isEditing ? "Edit Test Plan" : "New Test Plan"}
            </span>
            <span className="text-slate-300 font-medium select-none">/</span>

            {/* Header Project Selector Popover */}
            <div ref={headerProjectDropdownRef} className="relative inline-block text-left min-w-0">
              <button
                type="button"
                onClick={() => setHeaderProjectDropdownOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition cursor-pointer shadow-2xs max-w-full",
                  hasNoProjects
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-300/40"
                    : isMissingProject
                    ? "border-blue-300 bg-blue-50/70 text-blue-900 hover:bg-blue-100/70 ring-1 ring-blue-300/30"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80"
                )}
                title="Select project from /projects"
              >
                <SquaresFour
                  size={14}
                  weight="bold"
                  className={hasNoProjects ? "text-amber-600 shrink-0" : isMissingProject ? "text-blue-600 shrink-0" : "text-slate-500 shrink-0"}
                />
                <span className="max-w-[150px] sm:max-w-[220px] truncate">{displayProjectLabel}</span>
                <CaretDown size={12} weight="bold" className={hasNoProjects ? "text-amber-500 shrink-0" : "text-slate-400 shrink-0"} />
              </button>

              {headerProjectDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  <ProjectDropdownContent
                    options={normalizedProjects}
                    selectedValue={project}
                    onSelect={(val) => {
                      setProject(val);
                      setHeaderProjectDropdownOpen(false);
                    }}
                    onClose={() => setHeaderProjectDropdownOpen(false)}
                    title="Select Project"
                    emptyTitle="No projects found"
                    emptySubtitle="Please create a project first on the Projects page."
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer",
                    mode === "ai"
                      ? "bg-white text-blue-600 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  <Sparkle size={13} weight="bold" className={mode === "ai" ? "text-blue-600" : "text-slate-400"} />
                  <span>Auto (AI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 transition cursor-pointer",
                    mode === "manual"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  <span>Manual</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Project Required Banner */}
          <ProjectRequiredBanner
            hasProjects={normalizedProjects.length > 0}
            selectedProject={project}
          />

          {mode === "ai" && !isEditing ? (
            <div className="flex flex-col h-full justify-between space-y-4 min-h-[420px]">
              <div className="space-y-3.5">
                {/* Central AI Prompt Card Container */}
                <div className="flex flex-col rounded-none border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Describe what you want to plan and test
                  </label>
                  <textarea
                    rows={11}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Paste your PRD, feature specifications, sprint goals, or target release acceptance criteria..."
                    className="w-full min-h-[260px] sm:min-h-[290px] rounded-none text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
                  />

                  {/* Inner Action Bar */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Target Project:</span>
                      <strong className="text-slate-800 font-semibold truncate max-w-[160px]">
                        {displayProjectLabel}
                      </strong>
                    </div>

                    {/* AI Engine Status Link */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        Memory Active
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full",
                            activeEngine.provider ? "bg-emerald-500" : "bg-amber-400"
                          )}
                        />
                        <span>
                          AI Engine:{" "}
                          {activeEngine.provider ? (
                            <Link
                              href="/settings/ai"
                              onClick={onClose}
                              className="font-semibold text-slate-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 transition"
                              title="Configure AI model in Settings"
                            >
                              {activeEngine.model || activeEngine.provider}
                            </Link>
                          ) : (
                            <Link
                              href="/settings/ai"
                              onClick={onClose}
                              className="font-semibold text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center gap-1 transition"
                              title="Configure AI model in Settings"
                            >
                              Not configured (Settings)
                            </Link>
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project & Sprint Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <div ref={formProjectDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setFormProjectDropdownOpen((v) => !v)}
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 text-left text-xs transition cursor-pointer outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                        project ? "text-gray-900 font-semibold" : "text-gray-400 font-normal",
                        "border-gray-200"
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <FolderSimple size={14} weight="bold" className="text-gray-400 shrink-0" />
                        <span className="truncate">{displayProjectLabel}</span>
                      </span>
                      <CaretDown size={12} weight="bold" className="text-gray-400 shrink-0" />
                    </button>

                    <input type="hidden" name="project" value={project} required />

                    {formProjectDropdownOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100">
                        <ProjectDropdownContent
                          options={normalizedProjects}
                          selectedValue={project}
                          onSelect={(val) => {
                            setProject(val);
                            setFormProjectDropdownOpen(false);
                          }}
                          onClose={() => setFormProjectDropdownOpen(false)}
                          title="Select Project"
                          emptyTitle="No projects found"
                          emptySubtitle="Please create a project first on the Projects page."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sprint / Milestone
                  </label>
                  <input
                    type="text"
                    value={sprint}
                    onChange={(e) => setSprint(e.target.value)}
                    placeholder="e.g. Sprint 14 or Release v2.4"
                    className="w-full h-9 rounded-md border border-gray-200 px-3 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Plan Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Test Plan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sprint 14 Regression & E2E Plan"
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                        status === opt.value
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-2xs"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-gray-200 px-3 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-gray-200 px-3 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Collapsible Details */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCollapsible((v) => !v)}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 bg-gray-50/70 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <span>Scope, Strategy & Notes</span>
                  {showCollapsible ? <CaretUp size={13} weight="bold" /> : <CaretDown size={13} weight="bold" />}
                </button>

                {showCollapsible && (
                  <div className="p-3.5 space-y-3 bg-white border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Testing Scope (Inclusions)
                      </label>
                      <textarea
                        rows={3}
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        placeholder="Detail the features, endpoints, and workflows covered in this plan..."
                        className="w-full rounded-md border border-gray-200 p-2.5 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Notes / Exclusions
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Known out-of-scope items, prerequisites, or dependencies..."
                        className="w-full rounded-md border border-gray-200 p-2.5 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Assignee / Lead Tester
                      </label>
                      <input
                        type="text"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        placeholder="e.g. Wahyu (QA Lead)"
                        className="w-full h-8 rounded-md border border-gray-200 px-3 text-xs text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === "ai" && !isEditing ? (
              <>
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleStructureWithAi}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
                >
                  {analyzing ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : <Sparkle size={13} weight="bold" />}
                  <span>Structure & Review</span>
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleSubmit()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {pending ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : <Plus size={13} weight="bold" />}
                  <span>Auto-Create Plan</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSubmit()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {pending ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : <Plus size={13} weight="bold" />}
                <span>{isEditing ? "Save Changes" : "Create Test Plan"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
