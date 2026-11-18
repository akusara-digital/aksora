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
import { cn, formatDisplayText } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { MaturityBadge } from "@/components/test-management/maturity-badge";
import type { TestCase } from "@/components/test-management/test-case-table";

interface TestCaseDrawerProps {
  testCase: TestCase | null;
  onClose: () => void;
  onCaseUpdated: (updatedCase: TestCase) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Passed: <CheckCircle size={14} weight="fill" className="text-emerald-500" />,
  Failed: <XCircle size={14} weight="fill" className="text-rose-500" />,
  Blocked: <Warning size={14} weight="fill" className="text-amber-500" />,
  Pending: <Clock size={14} weight="fill" className="text-slate-400" />,
};

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
                className="mt-2 w-full text-base font-bold text-slate-900 border border-slate-300 rounded px-2.5 py-1 outline-none focus:border-blue-500"
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
              className="p-1.5 text-slate-400 hover:text-slate-700 transition"
              aria-label="Close drawer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Metadata quick bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => handleQuickStatusChange(e.target.value)}
                className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Priority
              </span>
              {editing ? (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              ) : (
                <span className="inline-flex items-center h-8 text-xs font-semibold text-slate-700">
                  {testCase.priority || "Medium"}
                </span>
              )}
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Type
              </span>
              {editing ? (
                <select
                  value={typeCase}
                  onChange={(e) => setTypeCase(e.target.value)}
                  className="h-8 w-full text-xs font-semibold rounded border border-slate-200 bg-white px-2 text-slate-800 outline-none"
                >
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
              ) : (
                <span className="inline-flex items-center h-8 text-xs font-semibold text-teal-700">
                  {testCase.typeCase || "Positive"}
                </span>
              )}
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Assignee
              </span>
              <span className="inline-flex items-center h-8 text-xs font-medium text-slate-600 truncate">
                {testCase.assignee || "Unassigned"}
              </span>
            </div>
          </div>

          {/* Pre-conditions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pre-Condition
            </h3>
            {editing ? (
              <textarea
                rows={2}
                value={preCondition}
                onChange={(e) => setPreCondition(e.target.value)}
                className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500"
                placeholder="Prerequisites needed before executing..."
              />
            ) : (
              <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3 text-xs text-amber-900 leading-relaxed">
                {testCase.preCondition || "None specified."}
              </div>
            )}
          </div>

          {/* Test Steps */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Test Steps
            </h3>
            {editing ? (
              <textarea
                rows={4}
                value={testStep}
                onChange={(e) => setTestStep(e.target.value)}
                className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500 font-mono"
                placeholder="1. Step one\n2. Step two..."
              />
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                {testCase.testStep || "No steps provided."}
              </div>
            )}
          </div>

          {/* Expected Result */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Expected Result
            </h3>
            {editing ? (
              <textarea
                rows={3}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500"
                placeholder="Expected outcome..."
              />
            ) : (
              <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
                {testCase.expectedResult || "Expected outcome not documented."}
              </div>
            )}
          </div>

          {/* Actual Result (if any) */}
          {(testCase.actualResult || editing) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Actual Result
              </h3>
              {editing ? (
                <textarea
                  rows={2}
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  className="w-full text-xs rounded border border-slate-200 p-2.5 outline-none focus:border-blue-500"
                  placeholder="Actual outcome observed during execution..."
                />
              ) : (
                <div className="rounded-lg bg-rose-50/60 border border-rose-100 p-3 text-xs text-rose-900 leading-relaxed whitespace-pre-line">
                  {testCase.actualResult}
                </div>
              )}
            </div>
          )}
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
