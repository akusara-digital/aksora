"use client";

import { useState, useEffect } from "react";
import {
  CaretDown,
  CaretRight,
  CircleNotch,
  ListNumbers,
  Plus,
} from "@phosphor-icons/react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { toast } from "@/components/ui/toast";
import { formatStepScenario, handleStepKeyDown } from "@/lib/test-step-utils";
import { cn } from "@/lib/utils";
import { validateProjectSelection } from "@/lib/project-utils";
import { ProjectRequiredBanner } from "@/components/projects/project-required-banner";
import { TestCaseCollapsibleDetails } from "./test-case-collapsible-details";
import { saveFormDraft, getFormDraft, clearFormDraft } from "@/lib/form-draft-cache";

export interface TestCaseSubmitEntry {
  tcId?: string;
  caseName: string;
  typeCase: "Positive" | "Negative";
  priority: "Critical" | "High" | "Medium" | "Low";
  preCondition?: string;
  testStep: string;
  expectedResult: string;
  actualResult?: string;
  subModule?: string;
  deviceType?: string;
  assignee?: string;
  evidence?: string;
  project?: string;
  testSuiteId?: string | number;
  status?: string;
}

export interface StreamlinedTestCaseFormProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  selectedProject?: string;
  suiteOptions?: Array<{ label: string; value: string; project?: string }>;
  selectedSuiteId?: string;
  onSuiteChange?: (suiteId: string) => void;
  devOptions?: Array<{ label: string; value: string }>;
  initialData?: Record<string, unknown> | null;
  suggestedTcId?: string;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (entry: Record<string, unknown>, createAnother?: boolean) => Promise<void> | void;
}

const CASE_TYPE_OPTIONS = [
  { value: "Positive", label: "Positive", dot: "bg-emerald-500", active: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30" },
  { value: "Negative", label: "Negative", dot: "bg-rose-500", active: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/30" },
];

const CASE_PRIORITY_OPTIONS = [
  { value: "Critical", label: "Crit", active: "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/30" },
  { value: "High", label: "High", active: "bg-orange-50 text-orange-800 border-orange-300" },
  { value: "Medium", label: "Med", active: "bg-amber-50 text-amber-800 border-amber-300" },
  { value: "Low", label: "Low", active: "bg-slate-100 text-slate-800 border-slate-300" },
];

export function StreamlinedTestCaseForm({
  projectOptions = [],
  defaultProject = "",
  selectedProject = "",
  suiteOptions = [],
  selectedSuiteId = "",
  onSuiteChange,
  devOptions = [],
  initialData = null,
  suggestedTcId = "TC-001",
  pending = false,
  onCancel,
  onSubmit,
}: StreamlinedTestCaseFormProps) {
  const [project, setProject] = useState(
    () => selectedProject || String(initialData?.project || defaultProject || projectOptions[0]?.value || ""),
  );

  useEffect(() => {
    if (selectedProject) setProject(selectedProject);
  }, [selectedProject]);

  const [suiteId, setSuiteId] = useState(
    () => selectedSuiteId || String(initialData?.testSuiteId || suiteOptions[0]?.value || ""),
  );

  useEffect(() => {
    if (selectedSuiteId) setSuiteId(selectedSuiteId);
  }, [selectedSuiteId]);

  const [caseName, setCaseName] = useState(() => String(initialData?.caseName || initialData?.title || ""));
  const [tcId, setTcId] = useState(() => String(initialData?.tcId || suggestedTcId));

  const initialType = String(initialData?.typeCase || "Positive");
  const [typeCase, setTypeCase] = useState<"Positive" | "Negative">(
    initialType.toLowerCase().includes("neg") ? "Negative" : "Positive",
  );

  const initialPriority = String(initialData?.priority || "Medium");
  const normalizedPriority: "Critical" | "High" | "Medium" | "Low" =
    initialPriority.toLowerCase().includes("crit") || initialPriority === "P0"
      ? "Critical"
      : initialPriority.toLowerCase().includes("high") || initialPriority === "P1"
      ? "High"
      : initialPriority.toLowerCase().includes("low") || initialPriority === "P3"
      ? "Low"
      : "Medium";
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">(normalizedPriority);

  const [testStep, setTestStep] = useState(() => String(initialData?.testStep || initialData?.stepsToReproduce || "1. "));
  const [expectedResult, setExpectedResult] = useState(() => String(initialData?.expectedResult || ""));
  const [actualResult, setActualResult] = useState(() => String(initialData?.actualResult || ""));
  const [preCondition, setPreCondition] = useState(() => String(initialData?.preCondition || ""));
  const [subModule, setSubModule] = useState(() => String(initialData?.subModule || initialData?.module || ""));
  const [deviceType, setDeviceType] = useState(() => String(initialData?.deviceType || "Desktop Web"));
  const [assignee, setAssignee] = useState(() => String(initialData?.assignee || ""));
  const [evidence, setEvidence] = useState(() => String(initialData?.evidence || ""));

  const [createAnother, setCreateAnother] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showOptional, setShowOptional] = useState(() => {
    return Boolean(
      initialData?.preCondition ||
      initialData?.actualResult ||
      initialData?.subModule ||
      initialData?.deviceType ||
      initialData?.assignee ||
      initialData?.evidence ||
      (initialData?.tcId && initialData.tcId !== suggestedTcId),
    );
  });

  // Restore draft when creating a new test case
  useEffect(() => {
    if (initialData?.id) return;
    const draft = getFormDraft<{
      caseName?: string;
      project?: string;
      suiteId?: string;
      typeCase?: "Positive" | "Negative";
      priority?: "Critical" | "High" | "Medium" | "Low";
      testStep?: string;
      expectedResult?: string;
      actualResult?: string;
      preCondition?: string;
      subModule?: string;
      deviceType?: string;
      assignee?: string;
    }>("test_case_manual");
    if (draft) {
      if (draft.caseName) setCaseName(draft.caseName);
      if (draft.project) setProject(draft.project);
      if (draft.suiteId) setSuiteId(draft.suiteId);
      if (draft.typeCase) setTypeCase(draft.typeCase);
      if (draft.priority) setPriority(draft.priority);
      if (draft.testStep) setTestStep(draft.testStep);
      if (draft.expectedResult) setExpectedResult(draft.expectedResult);
      if (draft.actualResult) setActualResult(draft.actualResult);
      if (draft.preCondition) setPreCondition(draft.preCondition);
      if (draft.subModule) setSubModule(draft.subModule);
      if (draft.deviceType) setDeviceType(draft.deviceType);
      if (draft.assignee) setAssignee(draft.assignee);
      if (draft.preCondition || draft.actualResult || draft.subModule || draft.assignee) {
        setShowOptional(true);
      }
    }
  }, [initialData?.id]);

  // Auto-save draft on input
  useEffect(() => {
    if (initialData?.id) return;
    const timer = setTimeout(() => {
      saveFormDraft("test_case_manual", {
        caseName,
        project,
        suiteId,
        typeCase,
        priority,
        testStep,
        expectedResult,
        actualResult,
        preCondition,
        subModule,
        deviceType,
        assignee,
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [
    caseName,
    project,
    suiteId,
    typeCase,
    priority,
    testStep,
    expectedResult,
    actualResult,
    preCondition,
    subModule,
    deviceType,
    assignee,
    initialData?.id,
  ]);

  const handleFormatSteps = () => {
    if (!testStep.trim()) return;
    setTestStep(formatStepScenario(testStep));
    toast("Steps formatted with sequential numbers (1, 2, 3...)", "info");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const projectValidation = validateProjectSelection(project, projectOptions);
    if (!projectValidation.valid) {
      toast(projectValidation.message, "error");
      return;
    }

    if (!caseName.trim()) {
      toast("Test case name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const formattedStep = formatStepScenario(testStep.trim()) || testStep.trim();
      const payload: Record<string, unknown> = {
        ...(initialData || {}),
        tcId: tcId.trim() || suggestedTcId,
        caseName: caseName.trim(),
        typeCase,
        priority,
        testStep: formattedStep,
        expectedResult: expectedResult.trim(),
        actualResult: actualResult.trim(),
        preCondition: preCondition.trim(),
        subModule: subModule.trim(),
        deviceType,
        assignee: assignee.trim(),
        evidence: evidence.trim(),
        project: project || undefined,
        testSuiteId: suiteId || (suiteOptions[0]?.value ?? ""),
        status: String(initialData?.status || "Pending"),
      };

      await onSubmit(payload, createAnother);
      clearFormDraft("test_case_manual");

      if (createAnother) {
        setCaseName("");
        setTestStep("1. ");
        setExpectedResult("");
        setActualResult("");
        setPreCondition("");
        const numMatch = tcId.match(/(\d+)$/);
        if (numMatch) {
          const nextNum = parseInt(numMatch[1], 10) + 1;
          setTcId(tcId.replace(/\d+$/, String(nextNum).padStart(numMatch[1].length, "0")));
        }
        toast("Ready for next test case.", "info");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save test case.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col justify-between overflow-y-auto p-4 sm:p-5 text-xs text-slate-800">
      <div className="space-y-3.5">
        {/* Project Validation Banner */}
        <ProjectRequiredBanner
          hasProjects={projectOptions.length > 0}
          selectedProject={project}
        />

        {/* Test Case Name */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
            Test Case Name / Scenario <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            placeholder="e.g. Verify user can sign in with valid email and password"
            className="h-9 w-full rounded-none border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        {/* Type & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Type (5 cols) */}
          <div className="sm:col-span-5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Case Type
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {CASE_TYPE_OPTIONS.map((opt) => {
                const isSelected = typeCase === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTypeCase(opt.value as "Positive" | "Negative")}
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

          {/* Priority (7 cols) */}
          <div className="sm:col-span-7">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Priority
            </span>
            <div className="grid grid-cols-4 gap-1">
              {CASE_PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as "Critical" | "High" | "Medium" | "Low")}
                    className={cn(
                      "rounded-md border py-1.5 text-center text-xs font-semibold transition cursor-pointer",
                      isSelected
                        ? p.active
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Test Steps */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Step Scenario
            </label>
            <button
              type="button"
              onClick={handleFormatSteps}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              title="Auto-format each line into numbered steps: 1. 2. 3."
            >
              <ListNumbers size={13} weight="bold" />
              Format 1. 2. 3.
            </button>
          </div>
          <AutoResizeTextarea
            rows={3}
            value={testStep}
            onChange={(e) => setTestStep(e.target.value)}
            onKeyDown={(e) => handleStepKeyDown(e, testStep, setTestStep)}
            placeholder={"1. Open browser in incognito mode.\n2. Navigate to login page.\n3. Enter valid email and password..."}
            className="w-full rounded-none border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        {/* Expected Result */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
            Expected Result
          </label>
          <AutoResizeTextarea
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
            placeholder="User is redirected to /dashboard and welcome banner is displayed"
            className="w-full rounded-none border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

        {/* Collapsible Details */}
        <div className="rounded-none border border-slate-200 bg-slate-50/50 p-3">
          <button
            type="button"
            onClick={() => setShowOptional((prev) => !prev)}
            className="flex w-full items-center justify-between text-left cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              {showOptional ? <CaretDown size={14} /> : <CaretRight size={14} />}
              Additional Details (Precondition, Device, Assignee)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {showOptional ? "Collapse" : "Expand"}
            </span>
          </button>

          {showOptional && (
            <TestCaseCollapsibleDetails
              assigneeOptions={devOptions}
              assignee={assignee}
              setAssignee={setAssignee}
              subModule={subModule}
              setSubModule={setSubModule}
              deviceType={deviceType}
              setDeviceType={setDeviceType}
              preCondition={preCondition}
              setPreCondition={setPreCondition}
              actualResult={actualResult}
              setActualResult={setActualResult}
              evidence={evidence}
              setEvidence={setEvidence}
              tcId={tcId}
              setTcId={setTcId}
            />
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <div className="flex items-center gap-3">
          {!initialData?.id ? (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600">Create another</span>
            </label>
          ) : (
            <div />
          )}
          {!initialData?.id && caseName.trim() && (
            <button
              type="button"
              onClick={() => {
                setCaseName("");
                setTestStep("1. ");
                setExpectedResult("");
                setActualResult("");
                setPreCondition("");
                setSubModule("");
                setAssignee("");
                clearFormDraft("test_case_manual");
                toast("Draft cleared", "info");
              }}
              className="text-xs text-slate-400 hover:text-rose-600 transition underline cursor-pointer"
            >
              Clear draft
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving || pending}
            className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            {saving || pending ? (
              <CircleNotch size={13} className="animate-spin text-white" />
            ) : (
              <Plus size={13} weight="bold" />
            )}
            <span>{initialData?.id ? "Update Test Case" : "Save Test Case"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
