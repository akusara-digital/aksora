"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardText,
  FolderSimple,
  CheckSquare,
  Square,
  Tag,
  CircleNotch,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { TestCase } from "@/components/test-management/test-case-table";

interface CreatePlanFromCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: TestCase[];
  projectOptions?: string[];
  defaultProject?: string;
  onSuccess?: (planToken: string) => void;
}

export function CreatePlanFromCasesModal({
  isOpen,
  onClose,
  selectedCases,
  projectOptions = [],
  defaultProject = "",
  onSuccess,
}: CreatePlanFromCasesModalProps) {
  const router = useRouter();

  // Pre-fill project from selected cases if available
  const initialProject = useMemo(() => {
    if (defaultProject && defaultProject !== "All") return defaultProject;
    for (const c of selectedCases) {
      if (c.planProject) return c.planProject;
    }
    return projectOptions[0] || "";
  }, [selectedCases, defaultProject, projectOptions]);

  const [title, setTitle] = useState("");
  const [project, setProject] = useState(initialProject);
  const [sprint, setSprint] = useState("");
  const [creating, setCreating] = useState(false);
  const [checkedCaseIds, setCheckedCaseIds] = useState<Set<number>>(() => {
    return new Set(selectedCases.map((c) => c.id));
  });

  // Group selected cases by suite
  const suiteGroups = useMemo(() => {
    const map = new Map<string, { suiteTitle: string; suiteId: string | number; cases: TestCase[] }>();
    for (const c of selectedCases) {
      const suiteKey = String(c.testSuiteId || "unassigned");
      if (!map.has(suiteKey)) {
        map.set(suiteKey, {
          suiteTitle: c.suiteTitle || "Unassigned Suite",
          suiteId: c.testSuiteId,
          cases: [],
        });
      }
      map.get(suiteKey)!.cases.push(c);
    }
    return Array.from(map.values());
  }, [selectedCases]);

  const toggleCase = (id: number) => {
    setCheckedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSuite = (cases: TestCase[]) => {
    const allChecked = cases.every((c) => checkedCaseIds.has(c.id));
    setCheckedCaseIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        cases.forEach((c) => next.delete(c.id));
      } else {
        cases.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast("Please enter a Test Plan name.", "error");
      return;
    }
    if (!project.trim()) {
      toast("Please specify a project for this Test Plan.", "error");
      return;
    }
    if (checkedCaseIds.size === 0) {
      toast("Please keep at least one test case checked in the scope checklist.", "error");
      return;
    }

    setCreating(true);
    try {
      const finalCases = selectedCases.filter((c) => checkedCaseIds.has(c.id));
      const suiteIds = Array.from(
        new Set(finalCases.map((c) => Number(c.testSuiteId)).filter((id) => id > 0)),
      );
      const caseIds = finalCases.map((c) => c.id);

      const scopePayload = JSON.stringify({
        suiteIds,
        caseIds,
      });

      // 1. Create the Test Plan
      const planRes = await fetch("/api/items/test-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          project: project.trim(),
          sprint: sprint.trim() || undefined,
          status: "active",
          scope: scopePayload,
        }),
      });

      const planData = await planRes.json().catch(() => ({}));
      if (!planRes.ok) {
        toast(planData.error || "Failed to create Test Plan.", "error");
        return;
      }

      const createdPlan = planData?.data;
      const planId = createdPlan?.id;

      // 2. Link suites and exact case checklist to the newly created plan
      if (planId) {
        await fetch(`/api/test-plans/${planId}/suites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            suiteIds,
            caseIds,
          }),
        }).catch(() => {});
      }

      toast(`Test Plan "${title}" created with ${caseIds.length} test cases in scope.`, "success");
      onClose();

      const targetToken = createdPlan?.publicToken || planId;
      if (onSuccess && targetToken) {
        onSuccess(targetToken);
      } else if (targetToken) {
        router.push(`/test-plans/${targetToken}`);
      }
    } catch {
      toast("Failed to create Test Plan.", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create Test Plan from Checklist"
      description="Create a targeted test plan for a release or cycle with your selected test cases"
      icon={<ClipboardText size={20} weight="bold" className="text-blue-600" />}
      maxWidth="xl"
    >
      <form onSubmit={handleCreate} className="space-y-4 py-1">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Test Plan Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Release v2.4 Regression Plan"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Project Name <span className="text-rose-500">*</span>
              </label>
              {projectOptions.length > 0 ? (
                <div className="relative">
                  <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    list="create-plan-project-options"
                    placeholder="e.g. Core App"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <datalist id="create-plan-project-options">
                    {projectOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. Core App"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Sprint <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <CircleNotch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  placeholder="e.g. Sprint 14"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Cases Checklist preview */}
        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Execution Scope Checklist ({checkedCaseIds.size} of {selectedCases.length} Cases)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Toggle any case to exclude from this plan
            </span>
          </div>

          <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {suiteGroups.map((group) => {
              const allChecked = group.cases.every((c) => checkedCaseIds.has(c.id));
              const checkedCount = group.cases.filter((c) => checkedCaseIds.has(c.id)).length;

              return (
                <div key={group.suiteTitle} className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSuite(group.cases)}
                      className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 hover:text-blue-600 transition"
                    >
                      {allChecked ? (
                        <CheckSquare size={16} weight="fill" className="text-blue-600" />
                      ) : checkedCount > 0 ? (
                        <CheckSquare size={16} weight="bold" className="text-blue-400" />
                      ) : (
                        <Square size={16} className="text-slate-300" />
                      )}
                      <FolderSimple size={14} className="text-slate-500" />
                      <span>{group.suiteTitle}</span>
                    </button>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {checkedCount}/{group.cases.length} cases
                    </span>
                  </div>

                  <div className="ml-5 space-y-1">
                    {group.cases.map((c) => {
                      const isChecked = checkedCaseIds.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1 text-xs transition",
                            isChecked
                              ? "bg-white font-medium text-slate-900 shadow-xs"
                              : "text-slate-400 hover:bg-white/60",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCase(c.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                              {c.tcId}
                            </span>
                            <span className="truncate">{c.caseName}</span>
                          </div>
                          {c.priority && (
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] text-slate-500 shrink-0">
                              {c.priority}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
          >
            {creating ? "Creating Plan..." : "Create Test Plan & Assign Scope"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
