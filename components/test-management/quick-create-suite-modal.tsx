"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CaretDown,
  CaretUp,
  CircleNotch,
  Code,
  Sparkle,
  Lightning,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { cn } from "@/lib/utils";
import { validateProjectSelection } from "@/lib/project-utils";
import { ProjectRequiredBanner } from "@/components/projects/project-required-banner";
import { AiDraftRestoredBanner } from "@/components/shared/ai-draft-restored-banner";
import {
  saveAiSession,
  getAiSession,
  clearAiSession,
} from "@/lib/ai-session-cache";
import { saveFormDraft, getFormDraft, clearFormDraft } from "@/lib/form-draft-cache";
import { SuiteModalHeader } from "./suite-modal-header";
import { QuickCreateSuiteCaseRow } from "./quick-create-suite-case-row";
import type { InitialCaseItem } from "./quick-create-suite-ai-section";

export type PlanOption = {
  id: number;
  title: string;
  project: string;
};

export type QuickCreateSuiteModalProps = {
  isOpen: boolean;
  plans: PlanOption[];
  defaultProject?: string;
  projectOptions?: string[] | Array<{ label: string; value: string }>;
  onClose: () => void;
  onCreated?: (suiteId: string) => void;
};

const SUITE_STATUS_OPTIONS = [
  { value: "active", label: "Active", dot: "bg-emerald-500", active: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30" },
  { value: "draft", label: "Draft", dot: "bg-amber-400", active: "bg-amber-50 text-amber-800 border-amber-300" },
];

const AI_SUITE_EXAMPLES = [
  { label: "Auth & 2FA Flow", prompt: "User authentication, 2FA OTP verification, password recovery, and session timeouts" },
  { label: "Checkout Flow", prompt: "E-commerce checkout, coupon discount code, payment gateway webhook, and order confirmation" },
  { label: "Profile & Settings", prompt: "User profile update, avatar upload validation, email change confirmation, and password reset" },
];

export function QuickCreateSuiteModal({
  isOpen,
  plans = [],
  defaultProject = "",
  projectOptions = [],
  onClose,
  onCreated,
}: QuickCreateSuiteModalProps) {
  const router = useRouter();

  // Mode: "ai" | "manual"
  const [mode, setMode] = useState<"ai" | "manual">("ai");

  // Project handling
  const normalizedProjects = (Array.isArray(projectOptions) && projectOptions.length > 0)
    ? (typeof projectOptions[0] === "string"
        ? (projectOptions as string[]).map((p) => ({ label: p, value: p }))
        : (projectOptions as Array<{ label: string; value: string }>))
    : Array.from(new Set(plans.map((p) => p.project).filter(Boolean))).map((p) => ({
        label: p,
        value: p,
      }));

  const [selectedProject, setSelectedProject] = useState(
    () => defaultProject || normalizedProjects[0]?.value || "",
  );

  useEffect(() => {
    if (defaultProject) {
      setSelectedProject(defaultProject);
    }
  }, [defaultProject]);

  // Form fields
  const [title, setTitle] = useState("");
  const availablePlans = selectedProject
    ? plans.filter((p) => p.project.toLowerCase() === selectedProject.toLowerCase())
    : plans;

  const [testPlanId, setTestPlanId] = useState(() =>
    availablePlans.length === 1 ? String(availablePlans[0].id) : "",
  );

  const [status, setStatus] = useState<"active" | "draft">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  // Initial cases for manual mode
  const [showInitialCases, setShowInitialCases] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [initialCases, setInitialCases] = useState<InitialCaseItem[]>([
    {
      id: "case-1",
      caseName: "",
      typeCase: "Positive",
      priority: "Medium",
      expectedResult: "",
    },
  ]);

  // AI Prompt & State
  const [aiPrompt, setAiPrompt] = useState("");
  const [coverageLevel, setCoverageLevel] = useState<"smoke" | "standard" | "comprehensive">("standard");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [hasDraftSession, setHasDraftSession] = useState(false);
  const [showAiUnconfigured, setShowAiUnconfigured] = useState(false);

  const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Case row helpers
  const addInitialCaseRow = () => {
    if (initialCases.length >= 10) {
      toast("Maximum 10 initial cases at once. You can add more later in the table.", "info");
      return;
    }
    setInitialCases((prev) => [
      ...prev,
      {
        id: `case-${Date.now()}-${prev.length}`,
        caseName: "",
        typeCase: "Positive",
        priority: "Medium",
        expectedResult: "",
      },
    ]);
  };

  const removeInitialCaseRow = (id: string) => {
    setInitialCases((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const updateInitialCase = (id: string, field: keyof InitialCaseItem, val: string) => {
    setInitialCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    );
  };

  const validCasesCount = initialCases.filter((c) => c.caseName.trim().length > 0).length;

  // AI Generation Core Helper
  const fetchAiGeneratedCases = async (promptText: string) => {
    if (!isAiConfigured()) {
      setShowAiUnconfigured(true);
      return null;
    }

    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      toast("Please enter what you want to test in the prompt field.", "error");
      return null;
    }

    const countMap = { smoke: 3, standard: 5, comprehensive: 8 };
    const requestedCount = countMap[coverageLevel];
    const credentials = getActiveAiCredentials();

    // Derive suite title from prompt or title input
    const derivedTitle = title.trim() || trimmedPrompt.split("\n")[0].slice(0, 70);

    const res = await fetch("/api/ai/suite-to-test-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suite: {
          title: derivedTitle,
          notes: trimmedPrompt,
          project: selectedProject,
          focusArea: trimmedPrompt,
          count: requestedCount,
        },
        ai: credentials,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Failed to generate test cases.");
    }

    const generated = (json?.data?.testCases || []) as Array<{
      caseName: string;
      typeCase: "Positive" | "Negative";
      priority?: "Critical" | "High" | "Medium" | "Low";
      expectedResult: string;
      preCondition?: string;
      testStep?: string;
    }>;

    return {
      title: derivedTitle,
      cases: generated.map((c, i): InitialCaseItem => ({
        id: `ai-case-${Date.now()}-${i}`,
        caseName: c.caseName,
        typeCase: c.typeCase === "Negative" ? "Negative" : "Positive",
        priority: c.priority || "Medium",
        expectedResult: c.expectedResult || "Passes acceptance criteria",
        preCondition: c.preCondition || "Application deployed in QA / Staging environment",
        testStep: c.testStep || "1. Perform action\n2. Verify outcome",
      })),
    };
  };

  // AI Mode Action: Structure & Review (fills manual form and switches mode)
  const handleAiStructureAndReview = async () => {
    const projectVal = validateProjectSelection(selectedProject, normalizedProjects);
    if (!projectVal.valid) {
      toast(projectVal.message, "error");
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await fetchAiGeneratedCases(aiPrompt);
      if (!result) return;

      if (!title.trim()) setTitle(result.title);
      if (!notes.trim()) setNotes(aiPrompt.trim());
      if (result.cases.length > 0) {
        setInitialCases(result.cases);
        setShowInitialCases(true);
      }

      setMode("manual");
      toast(`AI structured ${result.cases.length} test cases! Review and refine below.`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to structure test suite with AI.", "error");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // AI Mode Action: Direct Auto-Create Suite
  const handleAiAutoCreate = async () => {
    const projectVal = validateProjectSelection(selectedProject, normalizedProjects);
    if (!projectVal.valid) {
      toast(projectVal.message, "error");
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await fetchAiGeneratedCases(aiPrompt);
      if (!result) return;

      const suiteTitleToUse = title.trim() || result.title;
      await createSuiteAndCases(suiteTitleToUse, notes.trim() || aiPrompt.trim(), result.cases);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to auto-create test suite.", "error");
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Manual Mode Submit
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const projectVal = validateProjectSelection(selectedProject, normalizedProjects);
    if (!projectVal.valid) {
      toast(projectVal.message, "error");
      return;
    }
    if (!title.trim()) {
      toast("Suite name is required.", "error");
      return;
    }
    const validCases = initialCases.filter((c) => c.caseName.trim().length > 0);
    await createSuiteAndCases(title.trim(), notes.trim(), validCases);
  };

  // Shared Suite & Cases Creation Logic
  const createSuiteAndCases = async (
    suiteTitle: string,
    suiteNotes: string,
    casesToCreate: InitialCaseItem[],
  ) => {
    setSaving(true);
    try {
      // 1. Create Suite
      const res = await fetch("/api/items/test-suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suiteTitle,
          testPlanId: testPlanId || "",
          project: selectedProject,
          status,
          notes: suiteNotes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed to create test suite.", "error");
        return;
      }

      const newId = data?.data?.id != null ? String(data.data.id) : "";

      // 2. Create initial cases if present
      let createdCasesCount = 0;
      if (newId && casesToCreate.length > 0) {
        for (let i = 0; i < casesToCreate.length; i++) {
          const item = casesToCreate[i];
          const tcId = `TC-${String(i + 1).padStart(3, "0")}`;
          try {
            const caseRes = await fetch("/api/items/test-cases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                testSuiteId: newId,
                tcId,
                caseName: item.caseName.trim(),
                typeCase: item.typeCase || "Positive",
                priority: item.priority || "Medium",
                status: "Pending",
                testStep: item.testStep || "1. Follow test specifications and verification checklist",
                expectedResult: item.expectedResult.trim() || "Passes acceptance criteria",
                preCondition: item.preCondition || "Application deployed in QA / Staging environment",
              }),
            });
            if (caseRes.ok) createdCasesCount++;
          } catch {
            // ignore partial failures
          }
        }
      }

      if (createdCasesCount > 0) {
        toast(`Test suite "${suiteTitle}" created with ${createdCasesCount} test case(s).`, "success");
      } else {
        toast(`Test suite "${suiteTitle}" created.`, "success");
      }

      clearFormDraft("test_suite_manual");

      if (newId) onCreated?.(newId);

      if (createAnother) {
        setTitle("");
        setNotes("");
        setAiPrompt("");
        setInitialCases([
          {
            id: `case-${Date.now()}`,
            caseName: "",
            typeCase: "Positive",
            priority: "Medium",
            expectedResult: "",
          },
        ]);
        toast("Ready for next test suite.", "info");
      } else {
        onClose();
      }

      router.refresh();
    } catch {
      toast("Failed to create test suite.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasteSpec = () => {
    const specTemplate = "\n[Acceptance Criteria]:\n- User can ";
    setAiPrompt((prev) => (prev ? `${prev}${specTemplate}` : "User story / Acceptance criteria:\n- "));
    setTimeout(() => {
      aiTextareaRef.current?.focus();
    }, 50);
  };

  // Restore draft session from browser cache on mount
  useEffect(() => {
    if (!isOpen) return;
    const session = getAiSession<{ title: string; cases: InitialCaseItem[] }>("test_suite");
    if (session) {
      if (session.inputPrompt && !aiPrompt) setAiPrompt(session.inputPrompt);
      if (session.resultDraft) {
        setHasDraftSession(true);
        if (!title && session.resultDraft.title) setTitle(session.resultDraft.title);
        if (session.resultDraft.cases && session.resultDraft.cases.length > 0) {
          setInitialCases(session.resultDraft.cases);
          setShowInitialCases(true);
        }
      } else if (session.inputPrompt && session.inputPrompt.trim().length > 0) {
        setHasDraftSession(true);
      }
    }

    const manualDraft = getFormDraft<{
      title?: string;
      notes?: string;
      status?: "active" | "draft";
      testPlanId?: string;
      initialCases?: InitialCaseItem[];
      selectedProject?: string;
    }>("test_suite_manual");
    if (manualDraft) {
      if (manualDraft.title && !title) setTitle(manualDraft.title);
      if (manualDraft.notes && !notes) setNotes(manualDraft.notes);
      if (manualDraft.status) setStatus(manualDraft.status);
      if (manualDraft.testPlanId) setTestPlanId(manualDraft.testPlanId);
      if (manualDraft.initialCases && manualDraft.initialCases.length > 0) {
        setInitialCases(manualDraft.initialCases);
        setShowInitialCases(true);
      }
      if (manualDraft.selectedProject && !selectedProject) setSelectedProject(manualDraft.selectedProject);
    }
  }, [isOpen]);

  // Auto-save manual draft
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "manual" && (title.trim() || notes.trim() || initialCases.some((c) => c.caseName.trim()))) {
      saveFormDraft("test_suite_manual", {
        title,
        notes,
        status,
        testPlanId,
        initialCases,
        selectedProject,
      });
    }
  }, [isOpen, mode, title, notes, status, testPlanId, initialCases, selectedProject]);

  // Handle Ctrl+Enter / Cmd+Enter & ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (saving || isAiProcessing) return;
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!saving && !isAiProcessing) {
          if (mode === "ai") {
            void handleAiAutoCreate();
          } else {
            void handleManualSubmit();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, isAiProcessing, mode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
        onClick={() => {
          if (saving || isAiProcessing) return;
          onClose();
        }}
      />

      {/* Modal Dialog Panel */}
      <div
        ref={modalPanelRef}
        className="relative flex max-h-[92vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <SuiteModalHeader
          title="New Test Suite"
          project={selectedProject}
          onProjectChange={setSelectedProject}
          projectOptions={normalizedProjects}
          mode={mode}
          onModeChange={setMode}
          onClose={onClose}
        />

        {/* Project Validation Banner */}
        <div className="px-4 pt-3 sm:px-5">
          <ProjectRequiredBanner
            hasProjects={normalizedProjects.length > 0}
            selectedProject={selectedProject}
          />
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto">
          {mode === "ai" ? (
            /* ================= AUTO (AI) MODE ================= */
            <div className="flex flex-col justify-between min-h-[480px] sm:min-h-[510px] p-4 sm:p-5 text-xs text-slate-800">
              <div className="space-y-3.5">
                {hasDraftSession && (
                  <AiDraftRestoredBanner
                    domain="test_suite"
                    onDiscard={() => {
                      clearAiSession("test_suite");
                      setHasDraftSession(false);
                      setAiPrompt("");
                      setTitle("");
                      setNotes("");
                      setInitialCases([
                        {
                          id: `case-${Date.now()}`,
                          caseName: "",
                          typeCase: "Positive",
                          priority: "Medium",
                          expectedResult: "",
                        },
                      ]);
                      toast("Draft discarded", "info");
                    }}
                  />
                )}
                {/* AI Input Container */}
                <div className="rounded-none border border-blue-500/30 bg-white p-3.5 sm:p-4 shadow-xs ring-2 ring-blue-500/10 focus-within:border-blue-500 transition">
                  <textarea
                    ref={aiTextareaRef}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to test, paste acceptance criteria, user story, or API schema..."
                    className="w-full min-h-[140px] sm:min-h-[160px] rounded-none border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Actions & Coverage bar inside input box */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={handlePasteSpec}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Code size={13} weight="bold" />
                      Paste Spec / AC
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">Coverage:</span>
                      {(["smoke", "standard", "comprehensive"] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setCoverageLevel(level)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                            coverageLevel === level
                              ? "bg-blue-50 text-blue-700 border border-blue-200/80 font-bold"
                              : "text-slate-600 hover:bg-slate-100 border border-transparent",
                          )}
                        >
                          {level === "smoke"
                            ? "Smoke (3)"
                            : level === "standard"
                            ? "Standard (5)"
                            : "Comprehensive (8)"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Example Prompts */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 px-1">
                  <span className="font-medium text-slate-400">Try example:</span>
                  {AI_SUITE_EXAMPLES.map((ex, i) => (
                    <span key={ex.label} className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiPrompt(ex.prompt);
                          setTitle(ex.label);
                        }}
                        className="text-xs text-slate-600 hover:text-blue-600 hover:underline cursor-pointer"
                      >
                        {ex.label}
                      </button>
                      {i < AI_SUITE_EXAMPLES.length - 1 && (
                        <span className="text-slate-300">·</span>
                      )}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 px-1">
                  AI will analyze your description, draft the test suite, and generate structured verification cases.
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-6">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span>Create another</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isAiProcessing || saving}
                    onClick={handleAiStructureAndReview}
                    className="h-9 cursor-pointer rounded-lg border border-blue-200 bg-blue-50/70 px-4 text-xs font-bold text-blue-700 transition hover:bg-blue-100/70 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isAiProcessing ? (
                      <CircleNotch size={14} className="animate-spin" />
                    ) : (
                      <Sparkle size={14} weight="bold" />
                    )}
                    Structure & Review
                  </button>

                  <button
                    type="button"
                    disabled={isAiProcessing || saving}
                    onClick={handleAiAutoCreate}
                    className="h-9 cursor-pointer rounded-lg bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                  >
                    {isAiProcessing || saving ? (
                      <CircleNotch size={14} className="animate-spin" />
                    ) : (
                      <Lightning size={14} weight="bold" />
                    )}
                    Auto-Create Suite
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= MANUAL MODE ================= */
            <form
              onSubmit={handleManualSubmit}
              className="flex flex-col justify-between min-h-[480px] sm:min-h-[510px] p-4 sm:p-5 text-xs text-slate-800"
            >
              <div className="space-y-3.5">
                {/* Row 1: SUITE NAME */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Suite Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Authentication & Login Flow"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                {/* Row 2: STATUS & LINKED TEST PLAN */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Status (5 cols) */}
                  <div className="sm:col-span-5">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Status
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SUITE_STATUS_OPTIONS.map((opt) => {
                        const isSelected = status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(opt.value as "active" | "draft")}
                            className={cn(
                              "flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-semibold transition cursor-pointer",
                              isSelected
                                ? opt.active
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", opt.dot)} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Test Plan (7 cols) */}
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Linked Test Plan (Optional)
                    </label>
                    <select
                      value={testPlanId}
                      onChange={(e) => setTestPlanId(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                    >
                      <option value="">No plan linked</option>
                      {(availablePlans.length > 0 ? availablePlans : plans).map((plan) => (
                        <option key={plan.id} value={String(plan.id)}>
                          {plan.project ? `${plan.project} — ${plan.title}` : plan.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: GOAL / NOTES */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Goal / Objective (Optional)
                  </label>
                  <AutoResizeTextarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Scope, test coverage targets, or objective of this test suite..."
                    className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                {/* Row 4: FAST-TRACK INITIAL TEST CASES (COLLAPSIBLE) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5">
                  <button
                    type="button"
                    onClick={() => setShowInitialCases((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Initial Test Cases (Optional)
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                        Fast-Track
                      </span>
                      {validCasesCount > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {validCasesCount} case{validCasesCount > 1 ? "s" : ""} ready
                        </span>
                      )}
                    </div>
                    {showInitialCases ? (
                      <CaretUp size={14} className="text-slate-500" />
                    ) : (
                      <CaretDown size={14} className="text-slate-500" />
                    )}
                  </button>

                  {showInitialCases && (
                    <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-200/70">
                      {initialCases.map((tc, idx) => (
                        <QuickCreateSuiteCaseRow
                          key={tc.id}
                          item={tc}
                          index={idx}
                          canRemove={initialCases.length > 1}
                          isExpanded={expandedRowId === tc.id}
                          onToggleExpand={() =>
                            setExpandedRowId((prev) => (prev === tc.id ? null : tc.id))
                          }
                          onUpdate={(field, val) => updateInitialCase(tc.id, field, val)}
                          onRemove={() => removeInitialCaseRow(tc.id)}
                        />
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={addInitialCaseRow}
                          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <Plus size={13} weight="bold" />
                          Add another test case
                        </button>

                        {initialCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setInitialCases([
                                {
                                  id: `case-${Date.now()}`,
                                  caseName: "",
                                  typeCase: "Positive",
                                  priority: "Medium",
                                  expectedResult: "",
                                },
                              ])
                            }
                            className="text-[11px] text-slate-500 hover:text-rose-600 transition cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-6">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span>Create another</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="h-9 cursor-pointer rounded-lg bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                  >
                    {saving && <CircleNotch size={14} className="animate-spin" />}
                    {saving ? "Creating..." : "Create Suite"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <AiUnconfiguredModal
        isOpen={showAiUnconfigured}
        onClose={() => setShowAiUnconfigured(false)}
        featureName="AI Test Case Generator"
      />
    </div>
  );
}
