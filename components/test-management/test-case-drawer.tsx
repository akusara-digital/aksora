"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowSquareOut,
  PencilSimple,
  Check,
  CircleNotch,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { MaturityBadge } from "@/components/test-management/maturity-badge";
import { formatStepScenario } from "@/lib/test-step-utils";
import {
  TestCaseMetadataBar,
  TestCaseDetailFields,
} from "@/components/test-management/test-case-drawer-fields";
import type { TestCase } from "@/components/test-management/test-case-table";

interface TestCaseDrawerProps {
  testCase: TestCase | null;
  onClose: () => void;
  onCaseUpdated: (updatedCase: TestCase) => void;
}

export function TestCaseDrawer({
  testCase,
  onClose,
  onCaseUpdated,
}: TestCaseDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [status, setStatus] = useState("Pending");
  const [priority, setPriority] = useState("Medium");
  const [typeCase, setTypeCase] = useState("Positive");
  const [deviceType, setDeviceType] = useState("Desktop Web");
  const [subModule, setSubModule] = useState("");
  const [preCondition, setPreCondition] = useState("");
  const [testStep, setTestStep] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (testCase) {
      setCaseName(testCase.caseName || "");
      setStatus(testCase.status || "Pending");
      setPriority(testCase.priority || "Medium");
      setTypeCase(testCase.typeCase || "Positive");
      setDeviceType(testCase.deviceType || "Desktop Web");
      setSubModule(testCase.subModule || testCase.category || "");
      setPreCondition(testCase.preCondition || "");
      setTestStep(testCase.testStep || "");
      setExpectedResult(testCase.expectedResult || "");
      setActualResult(testCase.actualResult || "");
      setEditing(false);
    }
  }, [testCase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (testCase) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [testCase, onClose]);

  if (!testCase) return null;

  const handleSave = async () => {
    if (!caseName.trim()) {
      toast("Case name is required", "error");
      return;
    }
    setSaving(true);
    const formattedSteps = formatStepScenario(testStep.trim()) || testStep.trim();
    try {
      const res = await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: testCase.id,
          entry: {
            caseName: caseName.trim(),
            status,
            priority,
            typeCase,
            deviceType,
            subModule: subModule.trim(),
            preCondition,
            testStep: formattedSteps,
            expectedResult,
            actualResult,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update test case");
      }

      const updated: TestCase = {
        ...testCase,
        caseName: caseName.trim(),
        status,
        priority,
        typeCase,
        deviceType,
        subModule: subModule.trim(),
        preCondition,
        testStep: formattedSteps,
        expectedResult,
        actualResult,
      };

      onCaseUpdated(updated);
      toast("Test case updated successfully", "success");
      setEditing(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: testCase.id,
          status: newStatus,
        }),
      });
      onCaseUpdated({ ...testCase, status: newStatus });
      toast(`Status updated to ${newStatus}`, "success");
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const suiteIdentifier = testCase.suiteToken || testCase.testSuiteId;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Test Case Detail: ${testCase.caseName}`}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl sm:max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {testCase.tcId || `TC-${testCase.id}`}
              </span>
              {testCase.suiteTitle && (
                <span className="text-xs text-slate-500 truncate">
                  in {testCase.suiteTitle}
                </span>
              )}
              {testCase.maturity && <MaturityBadge maturity={testCase.maturity} />}
            </div>

            {editing ? (
              <input
                type="text"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                className="mt-2 w-full text-base font-bold text-slate-900 border border-slate-300 rounded px-2.5 py-1 outline-none focus:border-blue-500 bg-white"
              />
            ) : (
              <h2 className="mt-1 text-base font-bold text-slate-900 leading-snug">
                {testCase.caseName}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {suiteIdentifier && (
              <Link
                href={`/test-cases/${suiteIdentifier}`}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition"
                title="Open full page view"
              >
                <ArrowSquareOut size={18} weight="bold" />
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close drawer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Single Case Quick Execution Bar */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                  Single Case Execution
                </span>
                <p className="mt-1 text-xs text-slate-600">Quickly record the execution verdict for this case:</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange("Passed")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer",
                    status === "Passed"
                      ? "bg-emerald-600 text-white"
                      : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
                  )}
                >
                  <CheckCircle size={13} weight="fill" /> Passed
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange("Failed")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer",
                    status === "Failed"
                      ? "bg-rose-600 text-white"
                      : "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
                  )}
                >
                  <XCircle size={13} weight="fill" /> Failed
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange("Blocked")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer",
                    status === "Blocked"
                      ? "bg-amber-600 text-white"
                      : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50",
                  )}
                >
                  <Warning size={13} weight="fill" /> Blocked
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange("Pending")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition shadow-2xs cursor-pointer",
                    status === "Pending"
                      ? "bg-slate-700 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Clock size={13} weight="fill" /> Reset
                </button>
              </div>
            </div>
          </div>

          <TestCaseMetadataBar
            testCase={testCase}
            editing={editing}
            status={status}
            priority={priority}
            typeCase={typeCase}
            deviceType={deviceType}
            subModule={subModule}
            onStatusChange={handleQuickStatusChange}
            onPriorityChange={setPriority}
            onTypeCaseChange={setTypeCase}
            onDeviceTypeChange={setDeviceType}
            onSubModuleChange={setSubModule}
          />

          <TestCaseDetailFields
            testCase={testCase}
            editing={editing}
            preCondition={preCondition}
            testStep={testStep}
            expectedResult={expectedResult}
            actualResult={actualResult}
            onPreConditionChange={setPreCondition}
            onTestStepChange={setTestStep}
            onExpectedResultChange={setExpectedResult}
            onActualResultChange={setActualResult}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <div>
            {editing ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Discard edits
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <PencilSimple size={14} weight="bold" />
                Edit details
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editing && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Check size={14} weight="bold" />
                )}
                Save changes
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
