"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkle, Check, Trash, Plus, CircleNotch, FolderPlus } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import type { TableRow } from "@/components/module/module-workspace-table-row";

interface AiTaskToCasesButtonProps {
  task: TableRow;
  className?: string;
}

interface SuiteOption {
  id: string | number;
  title: string;
}

interface GeneratedCase {
  id: string;
  caseName: string;
  typeCase: "Positive" | "Negative";
  priority: string;
  preCondition: string;
  testStep: string;
  expectedResult: string;
}

export function AiTaskToCasesButton({ task, className }: AiTaskToCasesButtonProps) {
  const router = useRouter();
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, startSaving] = useTransition();

  const [suites, setSuites] = useState<SuiteOption[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [cases, setCases] = useState<GeneratedCase[]>([]);

  useEffect(() => {
    if (showModal && suites.length === 0) {
      fetch("/api/test-cases/scenarios")
        .then((r) => r.json())
        .then((data: SuiteOption[]) => {
          if (Array.isArray(data)) {
            setSuites(data);
            if (data[0]?.id) setSelectedSuiteId(String(data[0].id));
          }
        })
        .catch(() => {});
    }
  }, [showModal, suites.length]);

  const handleGenerate = async () => {
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    const title = String(task.title || "").trim();
    if (!title) {
      toast("Task title is required to generate test cases", "warning");
      return;
    }

    setLoading(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/task-to-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            title,
            feature: String(task.feature || ""),
            description: String(task.description || ""),
            acceptanceCriteria: String(task.acceptanceCriteria || ""),
            project: String(task.project || ""),
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate test cases");
      }

      const generated = (json.data?.testCases || []) as GeneratedCase[];
      if (generated.length === 0) {
        toast("No test cases generated. Please add more details to task.", "warning");
        return;
      }

      setCases(
        generated.map((c, i) => ({
          ...c,
          id: `gen-${Date.now()}-${i}`,
          typeCase: c.typeCase === "Negative" ? "Negative" : "Positive",
        })),
      );
      setShowModal(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeCase = (id: string) => {
    setCases((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const updateCase = (id: string, field: keyof GeneratedCase, val: string) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
  };

  const handleSaveToSuite = () => {
    if (!selectedSuiteId) {
      toast("Please select a target test suite first", "warning");
      return;
    }

    startSaving(async () => {
      try {
        let savedCount = 0;
        for (let i = 0; i < cases.length; i++) {
          const item = cases[i];
          const tcId = `TC-${String(i + 1).padStart(3, "0")}`;
          const res = await fetch("/api/items/test-cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testSuiteId: selectedSuiteId,
              tcId,
              caseName: item.caseName,
              typeCase: item.typeCase,
              priority: item.priority || "Medium",
              status: "Pending",
              preCondition: item.preCondition,
              testStep: item.testStep,
              expectedResult: item.expectedResult,
            }),
          });
          if (res.ok) savedCount++;
        }

        const selectedSuite = suites.find((s) => String(s.id) === String(selectedSuiteId));
        toast(`Successfully created ${savedCount} test case(s) in "${selectedSuite?.title || "Suite"}"`, "success");
        setShowModal(false);
        router.refresh();
      } catch {
        toast("Failed to save test cases to suite", "error");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className={
          className ||
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50"
        }
        title="Generate test cases automatically from acceptance criteria"
      >
        {loading ? (
          <CircleNotch size={14} className="animate-spin text-purple-600" />
        ) : (
          <Sparkle size={14} weight="fill" className="text-purple-600" />
        )}
        {loading ? "Generating..." : "Generate Test Cases"}
      </button>

      {showUnconfigured && (
        <AiUnconfiguredModal
          isOpen={showUnconfigured}
          onClose={() => setShowUnconfigured(false)}
        />
      )}

      {showModal && (
        <ModalShell
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isBusy={saving}
          title="Generated Test Cases"
          description={`AI analyzed requirements for "${task.title}". Review and save to a suite.`}
          icon={<Sparkle size={18} weight="fill" className="text-purple-600" />}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Target Test Suite <span className="text-rose-500">*</span>
              </label>
              {suites.length === 0 ? (
                <p className="text-xs text-amber-600">
                  No test suites found. Please create a test suite in Test Cases first.
                </p>
              ) : (
                <select
                  value={selectedSuiteId}
                  onChange={(e) => setSelectedSuiteId(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {suites.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {cases.map((c, idx) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-500">Case #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={c.typeCase}
                        onChange={(e) =>
                          updateCase(c.id, "typeCase", e.target.value as "Positive" | "Negative")
                        }
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700"
                      >
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                      </select>
                      <select
                        value={c.priority}
                        onChange={(e) => updateCase(c.id, "priority", e.target.value)}
                        className="h-7 rounded border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      {cases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCase(c.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove case"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={c.caseName}
                    onChange={(e) => updateCase(c.id, "caseName", e.target.value)}
                    placeholder="Case Name"
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-900 outline-none focus:border-blue-500"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Test Steps</span>
                      <textarea
                        rows={2}
                        value={c.testStep}
                        onChange={(e) => updateCase(c.id, "testStep", e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Result</span>
                      <textarea
                        rows={2}
                        value={c.expectedResult}
                        onChange={(e) => updateCase(c.id, "expectedResult", e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveToSuite}
                disabled={saving || suites.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Check size={14} weight="bold" />
                )}
                {saving ? "Saving..." : `Save ${cases.length} Cases to Suite`}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
