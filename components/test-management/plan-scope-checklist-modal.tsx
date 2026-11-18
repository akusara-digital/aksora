"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CaretDown,
  CaretRight,
  CheckSquare,
  Checks,
  FolderSimple,
  MagnifyingGlass,
  Square,
} from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type AvailableSuiteCase = {
  id: number | string;
  tcId: string;
  caseName: string;
  priority?: string;
  typeCase?: string;
};

export type AvailableSuite = {
  id: number | string;
  title: string;
  publicToken?: string;
  status?: string;
  testPlanId?: string;
  planTitle?: string;
  planProject?: string;
  cases?: AvailableSuiteCase[];
};

interface PlanScopeChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string | number;
  planTitle: string;
  availableSuites: AvailableSuite[];
  currentlyLinkedSuiteIds: Array<string | number>;
  onSuccess: () => void;
}

export function PlanScopeChecklistModal({
  isOpen,
  onClose,
  planId,
  planTitle,
  availableSuites,
  currentlyLinkedSuiteIds,
  onSuccess,
}: PlanScopeChecklistModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(currentlyLinkedSuiteIds.map(String));
  });
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync when opening
  const handleOpenReset = () => {
    setSelectedIds(new Set(currentlyLinkedSuiteIds.map(String)));
    setSearch("");
    setExpandedSuiteIds(new Set());
  };

  const filteredSuites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableSuites;
    return availableSuites.filter((suite) => {
      if (suite.title.toLowerCase().includes(q)) return true;
      if (suite.cases?.some((c) => c.caseName.toLowerCase().includes(q) || c.tcId.toLowerCase().includes(q))) {
        return true;
      }
      return false;
    });
  }, [availableSuites, search]);

  const totalCasesSelected = useMemo(() => {
    let count = 0;
    for (const suite of availableSuites) {
      if (selectedIds.has(String(suite.id))) {
        count += suite.cases?.length || 0;
      }
    }
    return count;
  }, [availableSuites, selectedIds]);

  const toggleSelectSuite = (suiteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const toggleExpandSuite = (suiteId: string) => {
    setExpandedSuiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(selectedIds);
    filteredSuites.forEach((s) => all.add(String(s.id)));
    setSelectedIds(all);
  };

  const deselectAll = () => {
    const next = new Set(selectedIds);
    filteredSuites.forEach((s) => next.delete(String(s.id)));
    setSelectedIds(next);
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/test-plans/${planId}/suites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiteIds: Array.from(selectedIds).map((id) => Number(id)),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed to update test plan scope.", "error");
        return;
      }

      toast("Test plan scope checklist updated.", "success");
      onSuccess();
      onClose();
    } catch {
      toast("Failed to update test plan scope.", "error");
    } finally {
      setSaving(false);
    }
  }

  const allFilteredSelected =
    filteredSuites.length > 0 && filteredSuites.every((s) => selectedIds.has(String(s.id)));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Test Plan Scope Checklist"
      description={`Select which test suites and their test cases are included in ${planTitle}`}
      icon={<Checks size={20} weight="bold" className="text-blue-600" />}
      maxWidth="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">{selectedIds.size}</span> suites selected ·{" "}
            <span className="font-bold text-blue-600">{totalCasesSelected}</span> test cases included
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving Scope..." : "Save Scope Checklist"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {availableSuites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <FolderSimple size={36} className="mx-auto mb-2 text-slate-400" />
            <h4 className="text-sm font-bold text-slate-800">No test suites found</h4>
            <p className="mx-auto mt-1 mb-4 max-w-sm text-xs text-slate-500">
              Create test suites and author test cases in your repository first, then add them to this plan.
            </p>
            <Link
              href="/test-cases"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              <Checks size={14} weight="bold" />
              Go to Test Cases Library
            </Link>
          </div>
        ) : (
          <>
            {/* Search and select all bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter suites or cases..."
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                {allFilteredSelected ? (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    Deselect All
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    Select All Filtered
                  </button>
                )}
              </div>
            </div>

            {/* Checklist of suites */}
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {filteredSuites.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No suites match &ldquo;{search}&rdquo;.
                </div>
              ) : (
                filteredSuites.map((suite) => {
                  const sId = String(suite.id);
                  const isChecked = selectedIds.has(sId);
                  const isExpanded = expandedSuiteIds.has(sId);
                  const casesCount = suite.cases?.length || 0;
                  const isCurPlan = String(suite.testPlanId) === String(planId);

                  return (
                    <div
                      key={sId}
                      className={cn(
                        "rounded-lg border transition",
                        isChecked
                          ? "border-blue-200 bg-blue-50/20"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 p-3">
                        <label className="flex flex-1 cursor-pointer items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectSuite(sId)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-bold text-slate-800">
                                {suite.title}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {casesCount} {casesCount === 1 ? "case" : "cases"}
                              </span>
                              {isCurPlan ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  In this plan
                                </span>
                              ) : suite.planTitle ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  In: {suite.planTitle}
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            {suite.planProject && (
                              <p className="mt-0.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {suite.planProject}
                              </p>
                            )}
                          </div>
                        </label>

                        {casesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandSuite(sId)}
                            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition"
                          >
                            <span>Preview</span>
                            {isExpanded ? (
                              <CaretDown size={12} weight="bold" />
                            ) : (
                              <CaretRight size={12} weight="bold" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable test case preview */}
                      {isExpanded && casesCount > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-xs">
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Included Cases ({casesCount})
                          </p>
                          <ul className="space-y-1">
                            {suite.cases?.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-center justify-between gap-2 text-[11px] text-slate-700"
                              >
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[10px] font-bold text-slate-400">
                                    {c.tcId}
                                  </span>
                                  <span className="truncate">{c.caseName}</span>
                                </span>
                                {c.priority && (
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {c.priority}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
