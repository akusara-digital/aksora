"use client";

import { useState, useEffect } from "react";
import {
  CaretDown,
  CaretRight,
  CircleNotch,
  Tag,
  Plus,
} from "@phosphor-icons/react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { toast } from "@/components/ui/toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import { BugCollapsibleDetails } from "./bug-collapsible-details";
import { PushToJiraModal } from "./push-to-jira-modal";

export interface BugSubmitOptions {
  pushToJira?: boolean;
  jiraConfig?: {
    trackerId?: number;
    assignee?: string;
    environment?: string;
    scope?: string;
  };
}

interface StreamlinedBugFormProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  selectedProject?: string;
  devOptions?: Array<{ label: string; value: string }>;
  initialData?: Record<string, unknown> | null;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (entry: Record<string, unknown>, options?: BugSubmitOptions | boolean) => void;
}

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", dot: "bg-slate-400", active: "bg-slate-100 text-slate-800 border-slate-300" },
  { value: "medium", label: "Med", dot: "bg-amber-400", active: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "high", label: "High", dot: "bg-orange-500", active: "bg-orange-50 text-orange-800 border-orange-300" },
  { value: "critical", label: "Crit", dot: "bg-rose-500", active: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/30" },
];

const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"];
const BUG_TYPE_OPTIONS = ["Functional", "UI/UX", "Performance", "API", "Security", "Validation", "Compatibility"];

export function StreamlinedBugForm({
  projectOptions = [],
  defaultProject = "",
  selectedProject = "",
  devOptions = [],
  initialData = null,
  pending = false,
  onCancel,
  onSubmit,
}: StreamlinedBugFormProps) {
  const [project, setProject] = useState(
    () => selectedProject || String(initialData?.project || defaultProject || projectOptions[0]?.value || ""),
  );

  // Sync if selectedProject prop changes from modal header
  useEffect(() => {
    if (selectedProject) {
      setProject(selectedProject);
    }
  }, [selectedProject]);

  const [title, setTitle] = useState(() => String(initialData?.title || ""));
  const [severity, setSeverity] = useState(() => String(initialData?.severity || "medium").toLowerCase());
  const [priority, setPriority] = useState(() => String(initialData?.priority || "P3").toUpperCase());
  const [bugType, setBugType] = useState(() => String(initialData?.bugType || "Functional"));
  const [stepsToReproduce, setStepsToReproduce] = useState(() => String(initialData?.stepsToReproduce || ""));
  const [expectedResult, setExpectedResult] = useState(() => String(initialData?.expectedResult || ""));
  const [actualResult, setActualResult] = useState(() => String(initialData?.actualResult || ""));

  // Jira Integration state
  const [jiraTracker, setJiraTracker] = useState<{ id: number; name: string; kind: string } | null>(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  // Optional collapsible details
  const [showOptional, setShowOptional] = useState(() => {
    return Boolean(
      initialData?.suggestedDev ||
      initialData?.module ||
      initialData?.preconditions ||
      initialData?.evidence ||
      initialData?.relatedItems,
    );
  });
  const [suggestedDev, setSuggestedDev] = useState(() => String(initialData?.suggestedDev || ""));
  const [moduleName, setModuleName] = useState(() => String(initialData?.module || ""));
  const [preconditions, setPreconditions] = useState(() => String(initialData?.preconditions || ""));
  const [evidence, setEvidence] = useState(() => String(initialData?.evidence || ""));
  const [relatedItems, setRelatedItems] = useState(() => String(initialData?.relatedItems || ""));

  useEffect(() => {
    let active = true;
    fetch("/api/issue-trackers")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        const trackers = (json.data as Array<{ id: number; name: string; kind: string; enabled: boolean }>) || [];
        const jira = trackers.find((t) => t.kind === "jira" && t.enabled);
        setJiraTracker(jira ? { id: jira.id, name: jira.name, kind: jira.kind } : null);
      })
      .catch(() => {
        if (active) setJiraTracker(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync initialData changes (e.g. when switched from AI draft)
  useEffect(() => {
    if (initialData) {
      if (initialData.title !== undefined) setTitle(String(initialData.title || ""));
      if (initialData.project) setProject(String(initialData.project));
      if (initialData.severity) setSeverity(String(initialData.severity).toLowerCase());
      if (initialData.priority) setPriority(String(initialData.priority).toUpperCase());
      if (initialData.bugType) setBugType(String(initialData.bugType));
      if (initialData.stepsToReproduce !== undefined) setStepsToReproduce(String(initialData.stepsToReproduce || ""));
      if (initialData.expectedResult !== undefined) setExpectedResult(String(initialData.expectedResult || ""));
      if (initialData.actualResult !== undefined) setActualResult(String(initialData.actualResult || ""));
      if (initialData.suggestedDev !== undefined) setSuggestedDev(String(initialData.suggestedDev || ""));
      if (initialData.module !== undefined) setModuleName(String(initialData.module || ""));
      if (initialData.preconditions !== undefined) setPreconditions(String(initialData.preconditions || ""));
      if (initialData.evidence !== undefined) setEvidence(String(initialData.evidence || ""));
      if (initialData.relatedItems !== undefined) setRelatedItems(String(initialData.relatedItems || ""));

      if (
        initialData.evidence ||
        initialData.module ||
        initialData.preconditions ||
        initialData.suggestedDev ||
        initialData.relatedItems
      ) {
        setShowOptional(true);
      }
    }
  }, [initialData]);

  const triggerSubmit = () => {
    const effectiveProject = selectedProject || project;
    if (!effectiveProject.trim()) {
      toast("Please select or enter a Project Name.", "error");
      return;
    }
    if (!title.trim()) {
      toast("Please enter a Bug Title.", "error");
      return;
    }

    const payload: Record<string, unknown> = {
      project: effectiveProject.trim(),
      title: title.trim(),
      severity,
      priority,
      bugType,
      stepsToReproduce: stepsToReproduce.trim(),
      expectedResult: expectedResult.trim(),
      actualResult: actualResult.trim(),
      status: String(initialData?.status || "open"),
    };

    if (suggestedDev.trim()) payload.suggestedDev = suggestedDev.trim();
    if (moduleName.trim()) payload.module = moduleName.trim();
    if (preconditions.trim()) payload.preconditions = preconditions.trim();
    if (evidence.trim()) payload.evidence = evidence.trim();
    if (relatedItems.trim()) payload.relatedItems = relatedItems.trim();

    // If editing existing bug, or Jira is not connected: submit directly
    if (isEditing || !jiraTracker) {
      onSubmit(payload, { pushToJira: false });
      return;
    }

    // Open SnapTest-style Push to Jira confirmation popup
    setPendingPayload(payload);
    setShowJiraModal(true);
  };

  const handleConfirmPush = (jiraConfig: { assignee: string; environment: string; scope: string }) => {
    if (!pendingPayload) return;
    const finalPayload = { ...pendingPayload };
    if (jiraConfig.assignee && !finalPayload.suggestedDev) {
      finalPayload.suggestedDev = jiraConfig.assignee;
    }
    setShowJiraModal(false);
    onSubmit(finalPayload, {
      pushToJira: true,
      jiraConfig: {
        trackerId: jiraTracker?.id,
        ...jiraConfig,
      },
    });
  };

  const handleSaveWithoutPush = () => {
    if (!pendingPayload) return;
    setShowJiraModal(false);
    onSubmit(pendingPayload, { pushToJira: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSubmit();
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!pending) {
          triggerSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const isEditing = Boolean(initialData?.id);
  const showProjectInBody = !selectedProject && projectOptions.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col justify-between min-h-[480px] sm:min-h-[510px] p-4 sm:p-5 text-xs text-slate-800"
    >
      <div className="space-y-3.5">
        {/* Row 0 (Fallback only if project not selected in header) */}
        {showProjectInBody && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Project <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={project}
              onChange={setProject}
              options={projectOptions}
              placeholder="Select Project..."
              className="h-9 w-full rounded-md py-1.5"
            />
          </div>
        )}

        {/* Row 1: BUG TITLE */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
            Bug Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Checkout button unresponsive on mobile Safari"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        {/* Row 2: SEVERITY, PRIORITY, & BUG TYPE */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Severity (5 cols) */}
          <div className="sm:col-span-5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Severity
            </span>
            <div className="grid grid-cols-4 gap-1">
              {SEVERITY_OPTIONS.map((opt) => {
                const isSelected = severity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-[11px] font-semibold transition cursor-pointer",
                      isSelected
                        ? opt.active
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", opt.dot)} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority (4 cols) */}
          <div className="sm:col-span-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Priority
            </span>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-md border py-1.5 text-center text-[11px] font-bold transition cursor-pointer",
                      isSelected
                        ? "border-blue-400 bg-blue-50 text-blue-700 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bug Type (3 cols) */}
          <div className="sm:col-span-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Bug Type
            </span>
            <CustomSelect
              value={bugType}
              onChange={setBugType}
              options={BUG_TYPE_OPTIONS.map((type) => ({ value: type, label: type }))}
              className="h-8.5 rounded-md py-1 text-xs"
            />
          </div>
        </div>

        {/* Row 3: DESCRIPTION & ACCEPTANCE CRITERIA */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
            Description & Acceptance Criteria
          </label>
          <AutoResizeTextarea
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            rows={4}
            placeholder={
              "Description:\nBrief yang diisi pengguna hilang setelah generate...\n\nAcceptance Criteria:\n☐ Setelah pengguna mengisi brief lalu generate, isi brief tetap tersimpan..."
            }
            className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 leading-relaxed font-sans"
          />
        </div>

        {/* Row 4: EXPECTED & ACTUAL RESULT (Side by Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Expected Result
            </label>
            <AutoResizeTextarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              rows={2}
              placeholder="Order placed with confirmation screen"
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Actual Result
            </label>
            <AutoResizeTextarea
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              rows={2}
              placeholder="Page crashes with 500 error toast"
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 leading-relaxed"
            />
          </div>
        </div>

        {/* Row 5: Collapsible Section: Additional Details */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Tag size={14} weight="bold" className="text-slate-400" />
              <span>Additional details (Assignee, Module, Evidence)</span>
            </span>
            {showOptional ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </button>

          {showOptional && (
            <div className="border-t border-slate-100 p-3.5 bg-slate-50/50">
              <BugCollapsibleDetails
                devOptions={devOptions}
                suggestedDev={suggestedDev}
                setSuggestedDev={setSuggestedDev}
                moduleName={moduleName}
                setModuleName={setModuleName}
                evidence={evidence}
                setEvidence={setEvidence}
                preconditions={preconditions}
                setPreconditions={setPreconditions}
                relatedItems={relatedItems}
                setRelatedItems={setRelatedItems}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
        >
          {pending ? (
            <CircleNotch size={13} className="animate-spin text-white" />
          ) : isEditing ? (
            <span>Save Changes</span>
          ) : (
            <>
              <Plus size={13} weight="bold" />
              <span>Create Bug</span>
            </>
          )}
        </button>
      </div>

      <PushToJiraModal
        isOpen={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        devOptions={devOptions}
        defaultAssignee={suggestedDev}
        defaultModule={moduleName}
        defaultProject={selectedProject || project}
        submitting={pending}
        onConfirmPush={handleConfirmPush}
        onSaveWithoutPush={handleSaveWithoutPush}
      />
    </form>
  );
}
