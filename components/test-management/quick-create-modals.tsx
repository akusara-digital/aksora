"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ListNumbers,
  CircleNotch,
  CaretDown,
  CaretUp,
  SquaresFour,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { formatStepScenario, handleStepKeyDown } from "@/lib/test-step-utils";
import { cn } from "@/lib/utils";

export {
  QuickCreateSuiteModal,
  type PlanOption,
  type QuickCreateSuiteModalProps,
} from "./quick-create-suite-modal";

type QuickCreateCaseModalProps = {
  isOpen: boolean;
  suiteId: string;
  suiteTitle: string;
  suggestedTcId: string;
  onClose: () => void;
};

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

export function QuickCreateCaseModal({
  isOpen,
  suiteId,
  suiteTitle,
  suggestedTcId,
  onClose,
}: QuickCreateCaseModalProps) {
  const router = useRouter();
  const [tcId, setTcId] = useState(suggestedTcId);
  const [caseName, setCaseName] = useState("");
  const [deviceType, setDeviceType] = useState("Desktop Web");
  const [subModule, setSubModule] = useState("");
  const [typeCase, setTypeCase] = useState<"Positive" | "Negative">("Positive");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [preCondition, setPreCondition] = useState("");
  const [testStep, setTestStep] = useState("1. ");
  const [expectedResult, setExpectedResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync suggestedTcId if changed
  useEffect(() => {
    if (suggestedTcId) setTcId(suggestedTcId);
  }, [suggestedTcId]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!saving) void handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!caseName.trim() || !testStep.trim() || !expectedResult.trim()) {
      toast("Case name, steps, and expected result are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const formattedStep = formatStepScenario(testStep.trim()) || testStep.trim();
      const res = await fetch("/api/items/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSuiteId: suiteId,
          tcId: tcId.trim() || suggestedTcId,
          caseName: caseName.trim(),
          deviceType,
          subModule: subModule.trim(),
          typeCase,
          priority,
          preCondition: preCondition.trim(),
          testStep: formattedStep,
          expectedResult: expectedResult.trim(),
          status: "Pending",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed to create test case.", "error");
        return;
      }

      toast(`Test case "${caseName.trim()}" added.`, "success");

      if (createAnother) {
        setCaseName("");
        setTestStep("1. ");
        setExpectedResult("");
        setPreCondition("");
        // increment tcId if formatted as TC-xxx
        const numMatch = tcId.match(/(\d+)$/);
        if (numMatch) {
          const nextNum = parseInt(numMatch[1], 10) + 1;
          setTcId(tcId.replace(/\d+$/, String(nextNum).padStart(numMatch[1].length, "0")));
        }
        toast("Ready for next test case.", "info");
      } else {
        onClose();
      }
      router.refresh();
    } catch {
      toast("Failed to create test case.", "error");
    } finally {
      setSaving(false);
    }
  }

  const handleFormatSteps = () => {
    if (!testStep.trim()) return;
    setTestStep(formatStepScenario(testStep));
    toast("Steps formatted with sequential numbers (1, 2, 3...)", "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
        onClick={onClose}
      />

      {/* Modal Dialog Panel */}
      <div
        ref={modalRef}
        className="relative flex max-h-[92vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">New Test Case</h3>
            {suiteTitle && (
              <>
                <span className="text-slate-300 font-medium select-none">/</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
                  <SquaresFour size={14} weight="bold" className="text-slate-500 shrink-0" />
                  <span className="max-w-[200px] truncate">{suiteTitle}</span>
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-between overflow-y-auto p-4 sm:p-5 text-xs text-slate-800"
        >
          <div className="space-y-3.5">
            {/* Case Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Test Case Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                placeholder="e.g. Verify user can sign in with valid email and password"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            {/* Type & Priority Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Type (5 cols) */}
              <div className="sm:col-span-5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Type
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

            {/* Device & Sub-module */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Device Type
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer"
                >
                  <option value="Desktop Web">Desktop Web</option>
                  <option value="Mobile Web">Mobile Web</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Sub-Module (Optional)
                </label>
                <input
                  type="text"
                  value={subModule}
                  onChange={(e) => setSubModule(e.target.value)}
                  placeholder="e.g. Authentication / Sign-in"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>

            {/* Test Steps */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Step Scenario <span className="text-rose-500">*</span>
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
                required
                value={testStep}
                onChange={(e) => setTestStep(e.target.value)}
                onKeyDown={(e) => handleStepKeyDown(e, testStep, setTestStep)}
                placeholder={"1. Open browser in incognito mode.\n2. Navigate to login page.\n3. Enter valid email and password..."}
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            {/* Expected Result */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Expected Result <span className="text-rose-500">*</span>
              </label>
              <AutoResizeTextarea
                rows={2}
                required
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="User is redirected to /dashboard and welcome banner is displayed"
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            {/* Advanced (Precondition, Case ID) Collapsible */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="flex w-full cursor-pointer items-center justify-between text-left"
              >
                <span className="text-xs font-bold text-slate-700">
                  Additional Details (Precondition, Case ID)
                </span>
                {showAdvanced ? (
                  <CaretUp size={14} className="text-slate-500" />
                ) : (
                  <CaretDown size={14} className="text-slate-500" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 pt-2.5 border-t border-slate-200/70">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Case ID
                    </label>
                    <input
                      type="text"
                      value={tcId}
                      onChange={(e) => setTcId(e.target.value)}
                      placeholder="TC-001"
                      className="h-8 w-full max-w-[200px] rounded border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Pre-Condition
                    </label>
                    <input
                      type="text"
                      value={preCondition}
                      onChange={(e) => setPreCondition(e.target.value)}
                      placeholder="e.g. User account is verified and deployed on staging environment"
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
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
                {saving ? "Adding..." : "Add Test Case"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
