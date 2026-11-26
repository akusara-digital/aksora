"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  CheckSquareOffset,
  Bug,
  Checks,
  Queue,
  ClipboardText,
  FolderSimple,
  ClockCountdown,
  CaretLeft,
  CaretRight,
  CircleNotch,
  WarningCircle,
  User,
  Flag,
  Tag,
  Flame,
  Key,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/components/layout/account-dropdown";
import { saveFormDraft, getFormDraft, clearFormDraft } from "@/lib/form-draft-cache";

export interface GlobalCreateModalProps {
  open: boolean;
  onClose: () => void;
  user?: AppUser | null;
}

export type CreateItemType =
  | "tasks"
  | "bugs"
  | "test-cases"
  | "test-suites"
  | "test-plans"
  | "projects"
  | "work-logs";

interface CreateTypeOption {
  id: CreateItemType;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "regular"; className?: string }>;
  activeBg: string;
  submitLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
}

const CREATE_TYPE_OPTIONS: CreateTypeOption[] = [
  {
    id: "tasks",
    label: "Task",
    icon: CheckSquareOffset,
    activeBg: "bg-blue-600 text-white shadow-xs",
    submitLabel: "Create Task",
    titleLabel: "Task Title",
    titlePlaceholder: "e.g. Implement user export button",
    descLabel: "Description",
    descPlaceholder: "Add context, acceptance criteria, or technical details...",
  },
  {
    id: "bugs",
    label: "Bug",
    icon: Bug,
    activeBg: "bg-rose-600 text-white shadow-xs",
    submitLabel: "Log Bug",
    titleLabel: "Bug Title",
    titlePlaceholder: "e.g. Checkout button unresponsive on mobile Safari",
    descLabel: "Steps to Reproduce / Summary",
    descPlaceholder: "1. Navigate to checkout\n2. Click 'Pay Now'\n3. Observe blank screen or error...",
  },
  {
    id: "test-cases",
    label: "Test Case",
    icon: Checks,
    activeBg: "bg-emerald-600 text-white shadow-xs",
    submitLabel: "Create Test Case",
    titleLabel: "Test Scenario / Case Name",
    titlePlaceholder: "e.g. Verify checkout completes with valid credit card",
    descLabel: "Pre-condition & Step Summary",
    descPlaceholder: "Pre-condition: User has items in cart and is logged in.\nSteps: Proceed to payment...",
  },
  {
    id: "test-suites",
    label: "Test Suite",
    icon: Queue,
    activeBg: "bg-purple-600 text-white shadow-xs",
    submitLabel: "Create Test Suite",
    titleLabel: "Suite Name",
    titlePlaceholder: "e.g. Checkout & Payment Flow",
    descLabel: "Goal & Scope Notes",
    descPlaceholder: "High-priority end-to-end regression tests covering the entire payment gateway...",
  },
  {
    id: "test-plans",
    label: "Test Plan",
    icon: ClipboardText,
    activeBg: "bg-sky-600 text-white shadow-xs",
    submitLabel: "Create Test Plan",
    titleLabel: "Plan Name",
    titlePlaceholder: "e.g. Sprint 14 Regression & E2E Plan",
    descLabel: "Testing Scope",
    descPlaceholder: "Detail the features, endpoints, and workflows covered in this plan...",
  },
  {
    id: "projects",
    label: "Project",
    icon: FolderSimple,
    activeBg: "bg-indigo-600 text-white shadow-xs",
    submitLabel: "Create Project",
    titleLabel: "Project Name",
    titlePlaceholder: "e.g. ECOSHOP WEB",
    descLabel: "Project Overview",
    descPlaceholder: "E-commerce web portal for consumer retail and order fulfillment...",
  },
  {
    id: "work-logs",
    label: "Daily Work",
    icon: ClockCountdown,
    activeBg: "bg-amber-600 text-white shadow-xs",
    submitLabel: "Log Work",
    titleLabel: "Work Summary",
    titlePlaceholder: "e.g. Code review PR #142 and investigate payment timeouts",
    descLabel: "Details & Accomplishments",
    descPlaceholder: "Reviewed checkout refactor, validated test coverage, and fixed edge cases...",
  },
];

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

const TEST_CASE_TYPES = ["Functional", "Smoke", "Regression", "E2E", "API", "Security", "Performance"] as const;

const WORK_LOG_CATEGORIES = [
  "Feature Dev",
  "Bug Fix",
  "Testing & QA",
  "Code Review",
  "Meeting",
  "Support",
] as const;

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

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

export function GlobalCreateModal({ open, onClose, user }: GlobalCreateModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [type, setType] = useState<CreateItemType>("tasks");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Form Fields
  const [project, setProject] = useState("");
  const [customProject, setCustomProject] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"P0" | "P1" | "P2" | "P3">("P2");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [category, setCategory] = useState<string>("Feature");
  const [assignee, setAssignee] = useState("");
  const [sprintText, setSprintText] = useState("");
  const [statusVal, setStatusVal] = useState("active");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Slider Navigation State
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  const scrollLeftAction = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: -140, behavior: "smooth" });
    setTimeout(updateScrollState, 250);
  };

  const scrollRightAction = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: 140, behavior: "smooth" });
    setTimeout(updateScrollState, 250);
  };

  // Restore draft when opened
  useEffect(() => {
    if (!open) return;
    const draft = getFormDraft<{
      type?: CreateItemType;
      title?: string;
      description?: string;
      project?: string;
      priority?: "P0" | "P1" | "P2" | "P3";
      severity?: "low" | "medium" | "high" | "critical";
      category?: string;
      assignee?: string;
      sprintText?: string;
      projectKey?: string;
    }>("global_create");
    if (draft) {
      if (draft.type) setType(draft.type);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.project) setProject(draft.project);
      if (draft.priority) setPriority(draft.priority);
      if (draft.severity) setSeverity(draft.severity);
      if (draft.category) setCategory(draft.category);
      if (draft.assignee) setAssignee(draft.assignee);
      if (draft.sprintText) setSprintText(draft.sprintText);
      if (draft.projectKey) setProjectKey(draft.projectKey);
    }
  }, [open]);

  // Auto-save draft on input
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      saveFormDraft("global_create", {
        type,
        title,
        description,
        project,
        priority,
        severity,
        category,
        assignee,
        sprintText,
        projectKey,
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [open, type, title, description, project, priority, severity, category, assignee, sprintText, projectKey]);

  useEffect(() => {
    if (!open) return;
    updateScrollState();
    const raf = requestAnimationFrame(updateScrollState);
    const timer = setTimeout(updateScrollState, 150);
    window.addEventListener("resize", updateScrollState);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [open, updateScrollState]);

  useEffect(() => {
    if (!open) return;
    const el = tabsContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
    const timer = setTimeout(updateScrollState, 200);
    return () => clearTimeout(timer);
  }, [type, open, updateScrollState]);

  // Load project & assignee options
  useEffect(() => {
    if (!open) return;
    if (!optionsLoaded) {
      setLoadingOptions(true);
      Promise.all([
        fetch("/api/projects")
          .then((r) => r.json())
          .then((d) => (Array.isArray(d?.data) ? (d.data as ProjectOption[]) : []))
          .catch(() => [] as ProjectOption[]),
        fetch("/api/options/assignees")
          .then((r) => r.json())
          .then((d) => (Array.isArray(d?.options) ? (d.options as AssigneeOption[]) : []))
          .catch(() => [] as AssigneeOption[]),
      ])
        .then(([projList, assigneeList]) => {
          setProjects(projList);
          setAssignees(assigneeList);
          setOptionsLoaded(true);
          if (projList.length > 0 && !project) setProject(projList[0].name);
        })
        .finally(() => setLoadingOptions(false));
    }
    const timer = setTimeout(() => titleInputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open, optionsLoaded, project]);

  // Auto-generate project key when creating a Project
  useEffect(() => {
    if (type === "projects" && !isKeyManuallyEdited) {
      setProjectKey(generateProjectKey(title));
    }
  }, [title, type, isKeyManuallyEdited]);

  const activeProject =
    project === "__custom__" || projects.length === 0 ? customProject.trim() : project;

  const currentOption = useMemo(() => {
    return CREATE_TYPE_OPTIONS.find((o) => o.id === type) || CREATE_TYPE_OPTIONS[0];
  }, [type]);

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      value: p.name,
      label: `${p.name}${p.key ? ` (${p.key})` : ""}`,
    }));
  }, [projects]);

  const priorityOptions = useMemo(() => {
    return PRIORITIES.map((p) => ({
      value: p.value,
      label: p.label,
      dot:
        p.value === "P0"
          ? "bg-rose-600"
          : p.value === "P1"
          ? "bg-orange-500"
          : p.value === "P2"
          ? "bg-blue-500"
          : "bg-slate-400",
    }));
  }, []);

  const severityOptions = useMemo(() => {
    return SEVERITIES.map((s) => ({
      value: s.value,
      label: s.label,
      dot:
        s.value === "critical"
          ? "bg-rose-600"
          : s.value === "high"
          ? "bg-orange-500"
          : s.value === "medium"
          ? "bg-amber-500"
          : "bg-emerald-500",
    }));
  }, []);

  const assigneeOptions = useMemo(() => {
    return [
      { value: "", label: "Unassigned" },
      ...assignees.map((a) => ({ value: a.value, label: a.label })),
    ];
  }, [assignees]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(`${currentOption.titleLabel} is required.`);
      titleInputRef.current?.focus();
      return;
    }

    if (type !== "projects" && !activeProject) {
      const msg =
        projects.length === 0
          ? "No project found. Please create a project first before continuing."
          : "Please select a project before continuing.";
      setError(msg);
      toast(msg, "error");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      let endpoint = `/api/items/${type}`;
      let payload: Record<string, unknown> = {};

      if (type === "tasks") {
        endpoint = "/api/items/tasks";
        payload = {
          title: trimmedTitle,
          project: activeProject,
          category,
          priority,
          status: "todo",
          description: description.trim() || trimmedTitle,
          assignee: assignee.trim(),
        };
      } else if (type === "bugs") {
        endpoint = "/api/items/bugs";
        payload = {
          title: trimmedTitle,
          project: activeProject,
          priority,
          severity,
          status: "open",
          stepsToReproduce: description.trim(),
          suggestedDev: assignee.trim(),
        };
      } else if (type === "test-cases") {
        endpoint = "/api/items/test-cases";
        payload = {
          caseName: trimmedTitle,
          title: trimmedTitle,
          project: activeProject,
          typeCase: category || "Functional",
          priority,
          status: "Draft",
          preCondition: description.trim(),
          assignee: assignee.trim(),
        };
      } else if (type === "test-suites") {
        endpoint = "/api/items/test-suites";
        payload = {
          title: trimmedTitle,
          project: activeProject,
          status: statusVal || "active",
          notes: description.trim(),
          assignee: assignee.trim(),
        };
      } else if (type === "test-plans") {
        endpoint = "/api/items/test-plans";
        payload = {
          title: trimmedTitle,
          project: activeProject,
          status: statusVal || "active",
          sprint: sprintText.trim() || undefined,
          scope: description.trim(),
          assignee: assignee.trim(),
        };
      } else if (type === "projects") {
        endpoint = "/api/projects";
        payload = {
          name: trimmedTitle,
          key: projectKey.trim().toUpperCase() || undefined,
          description: description.trim() || undefined,
        };
      } else if (type === "work-logs") {
        endpoint = "/api/items/work-logs";
        payload = {
          title: trimmedTitle,
          description: description.trim() || trimmedTitle,
          project: activeProject,
          category: category || "Feature Dev",
          status: statusVal || "done",
          durationMinutes: 60,
          assignee: assignee.trim() || user?.name || "",
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg = json?.error || `Failed to create ${currentOption.label}.`;
        setError(errMsg);
        toast(errMsg, "error");
        return;
      }

      toast(`${currentOption.label} created successfully`, "success");
      setTitle("");
      setDescription("");
      setSprintText("");
      setError(null);
      clearFormDraft("global_create");

      // If a project was created, append to projects state
      if (type === "projects" && json?.data) {
        const newProj = json.data as ProjectOption;
        setProjects((prev) => [newProj, ...prev]);
        setProject(newProj.name);
      }

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (submitting) return;
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-create-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
        onClick={() => {
          if (submitting) return;
          onClose();
        }}
      />
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 my-auto">
        {/* Header with Slider */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 id="global-create-modal-title" className="text-sm font-bold text-slate-900 shrink-0">
              New Item
            </h2>

            {/* Slider track with Left/Right CTA arrows */}
            <div className="relative flex items-center min-w-0 flex-1 max-w-[calc(100%-8px)]">
              {/* Left Arrow Button (hidden if at leftmost / canScrollLeft is false) */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={scrollLeftAction}
                  aria-label="Scroll left"
                  className="absolute -left-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <CaretLeft size={13} weight="bold" />
                </button>
              )}

              {/* Scrollable Track */}
              <div
                ref={tabsContainerRef}
                onScroll={updateScrollState}
                className="flex items-center gap-1 overflow-x-auto scrollbar-none px-2 py-0.5 rounded-lg bg-slate-200/70 scroll-smooth min-w-0 w-full"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {CREATE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = type === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-active={isActive ? "true" : undefined}
                      onClick={() => {
                        setType(opt.id);
                        setError(null);
                        // Reset defaults per type
                        if (opt.id === "test-cases") setCategory("Functional");
                        else if (opt.id === "tasks") setCategory("Feature");
                        else if (opt.id === "work-logs") setCategory("Feature Dev");
                        if (opt.id === "work-logs") setStatusVal("done");
                        else setStatusVal("active");
                      }}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none",
                        isActive
                          ? opt.activeBg
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      )}
                    >
                      <Icon size={14} weight="bold" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Arrow Button (hidden if at rightmost / canScrollRight is false) */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={scrollRightAction}
                  aria-label="Scroll right"
                  className="absolute -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  <CaretRight size={13} weight="bold" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition shrink-0 ml-1"
            aria-label="Close dialog"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4">
            <InlineAlert variant="error" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Project selector (hidden when creating a Project itself) */}
          {type !== "projects" && (
            <div>
              <label
                htmlFor="create-item-project"
                className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1"
              >
                <FolderSimple size={14} weight="bold" className="text-slate-500" />
                <span>Project</span>
                <span className="text-rose-500">*</span>
              </label>
              {loadingOptions ? (
                <div className="h-9 w-full bg-slate-100 rounded-xl animate-pulse" />
              ) : projects.length > 0 ? (
                <div className="space-y-1.5">
                  <CustomSelect
                    id="create-item-project"
                    value={project}
                    onChange={(val) => setProject(val)}
                    options={projectOptions}
                    placeholder="Select a project..."
                    allowCustom
                    customOptionLabel="+ Enter custom project name..."
                    customOptionValue="__custom__"
                    className="rounded-xl py-2"
                  />
                  {project === "__custom__" && (
                    <input
                      type="text"
                      value={customProject}
                      onChange={(e) => setCustomProject(e.target.value)}
                      placeholder="Enter custom project name..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      autoFocus
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <WarningCircle size={15} weight="bold" className="text-amber-600 shrink-0" />
                      <span className="font-semibold">No existing projects found in this workspace.</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-amber-800">
                      <span>Enter a new project name below or:</span>
                      <button
                        type="button"
                        onClick={() => setType("projects")}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Create a Project here →
                      </button>
                    </div>
                  </div>
                  <input
                    id="create-item-project"
                    type="text"
                    value={customProject}
                    onChange={(e) => setCustomProject(e.target.value)}
                    placeholder="e.g. Aksora Core"
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              )}
            </div>
          )}

          {/* Project Key (Only for Project creation) */}
          {type === "projects" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="create-item-title" className="block text-xs font-bold text-slate-700 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  id="create-item-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ECOSHOP WEB"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="create-project-key" className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Key size={13} weight="bold" className="text-slate-500" />
                  <span>Project Key</span>
                </label>
                <input
                  id="create-project-key"
                  type="text"
                  value={projectKey}
                  onChange={(e) => {
                    setIsKeyManuallyEdited(true);
                    setProjectKey(e.target.value.toUpperCase());
                  }}
                  placeholder="e.g. ECO"
                  maxLength={6}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Title for non-project types */}
          {type !== "projects" && (
            <div>
              <label htmlFor="create-item-title" className="block text-xs font-bold text-slate-700 mb-1">
                {currentOption.titleLabel} <span className="text-rose-500">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="create-item-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={currentOption.titlePlaceholder}
                className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="create-item-desc" className="block text-xs font-bold text-slate-700 mb-1">
              {currentOption.descLabel} <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="create-item-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={currentOption.descPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-y"
            />
          </div>

          {/* Metadata Grid depending on Type */}
          {type !== "projects" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Field 1: Priority or Status */}
              {type === "tasks" || type === "bugs" || type === "test-cases" ? (
                <div>
                  <label htmlFor="create-item-priority" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Flag size={13} weight="bold" className="text-slate-500" />
                    <span>Priority</span>
                  </label>
                  <CustomSelect
                    id="create-item-priority"
                    value={priority}
                    onChange={(val) => setPriority(val as "P0" | "P1" | "P2" | "P3")}
                    options={priorityOptions}
                    className="rounded-md py-1.5"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="create-item-status" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={13} weight="bold" className="text-slate-500" />
                    <span>Status</span>
                  </label>
                  <CustomSelect
                    id="create-item-status"
                    value={statusVal}
                    onChange={(val) => setStatusVal(val)}
                    options={
                      type === "work-logs"
                        ? [
                            { value: "done", label: "Completed" },
                            { value: "in_progress", label: "In Progress" },
                            { value: "blocked", label: "Blocked" },
                          ]
                        : type === "test-plans"
                        ? [
                            { value: "active", label: "Active" },
                            { value: "draft", label: "Draft" },
                            { value: "in-progress", label: "In Progress" },
                            { value: "completed", label: "Completed" },
                          ]
                        : [
                            { value: "active", label: "Active" },
                            { value: "draft", label: "Draft" },
                          ]
                    }
                    className="rounded-md py-1.5"
                  />
                </div>
              )}

              {/* Field 2: Category, Severity, or Sprint */}
              {type === "tasks" ? (
                <div>
                  <label htmlFor="create-item-category" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={13} weight="bold" className="text-slate-500" />
                    <span>Category</span>
                  </label>
                  <CustomSelect
                    id="create-item-category"
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={TASK_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                    className="rounded-md py-1.5"
                  />
                </div>
              ) : type === "bugs" ? (
                <div>
                  <label htmlFor="create-item-severity" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Flame size={13} weight="bold" className="text-rose-500" />
                    <span>Severity</span>
                  </label>
                  <CustomSelect
                    id="create-item-severity"
                    value={severity}
                    onChange={(val) => setSeverity(val as (typeof SEVERITIES)[number]["value"])}
                    options={severityOptions}
                    className="rounded-md py-1.5"
                  />
                </div>
              ) : type === "test-cases" ? (
                <div>
                  <label htmlFor="create-item-typecase" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={13} weight="bold" className="text-slate-500" />
                    <span>Case Type</span>
                  </label>
                  <CustomSelect
                    id="create-item-typecase"
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={TEST_CASE_TYPES.map((t) => ({ value: t, label: t }))}
                    className="rounded-md py-1.5"
                  />
                </div>
              ) : type === "test-plans" ? (
                <div>
                  <label htmlFor="create-item-sprint" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={13} weight="bold" className="text-slate-500" />
                    <span>Sprint / Milestone</span>
                  </label>
                  <input
                    id="create-item-sprint"
                    type="text"
                    value={sprintText}
                    onChange={(e) => setSprintText(e.target.value)}
                    placeholder="e.g. Sprint 14"
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              ) : type === "work-logs" ? (
                <div>
                  <label htmlFor="create-item-worklog-cat" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag size={13} weight="bold" className="text-slate-500" />
                    <span>Work Category</span>
                  </label>
                  <CustomSelect
                    id="create-item-worklog-cat"
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={WORK_LOG_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    className="rounded-md py-1.5"
                  />
                </div>
              ) : (
                <div />
              )}

              {/* Field 3: Assignee */}
              <div>
                <label htmlFor="create-item-assignee" className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User size={13} weight="bold" className="text-slate-500" />
                  <span>{type === "bugs" ? "Suggested Dev" : "Assignee"}</span>
                </label>
                <CustomSelect
                  id="create-item-assignee"
                  value={assignee}
                  onChange={(val) => setAssignee(val)}
                  options={assigneeOptions}
                  placeholder="Unassigned"
                  className="rounded-md py-1.5"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {title.trim() || description.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                  setSprintText("");
                  clearFormDraft("global_create");
                  toast("Draft cleared", "info");
                }}
                className="text-xs text-slate-400 hover:text-rose-600 transition underline cursor-pointer"
              >
                Clear draft
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3.5 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer",
                  currentOption.activeBg.split(" ")[0],
                  "hover:brightness-95"
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
                    <span>{currentOption.submitLabel}</span>
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
