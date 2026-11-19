"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowSquareOut,
  PencilSimple,
  Check,
  CircleNotch,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { MaturityBadge } from "@/components/test-management/maturity-badge";
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
            preCondition,
            testStep,
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
        preCondition,
        testStep,
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
          <TestCaseMetadataBar
            testCase={testCase}
            editing={editing}
            status={status}
            priority={priority}
            typeCase={typeCase}
            onStatusChange={handleQuickStatusChange}
            onPriorityChange={setPriority}
            onTypeCaseChange={setTypeCase}
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
