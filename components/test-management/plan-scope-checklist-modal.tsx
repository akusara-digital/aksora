"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CaretDown,
  CaretRight,
  CheckSquare,
  Checks,
  FolderSimple,
  MagnifyingGlass,
  MinusSquare,
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
  status?: string;
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
  currentlyLinkedCaseIds?: Array<string | number>;
  onSuccess: () => void;
}

export function PlanScopeChecklistModal({
  isOpen,
  onClose,
  planId,
  planTitle,
  availableSuites,
  currentlyLinkedSuiteIds,
  currentlyLinkedCaseIds,
  onSuccess,
}: PlanScopeChecklistModalProps) {
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<Set<string>>(() => {
    return new Set(currentlyLinkedSuiteIds.map(String));
  });

  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(() => {
    if (currentlyLinkedCaseIds && currentlyLinkedCaseIds.length > 0) {
      return new Set(currentlyLinkedCaseIds.map(String));
    }
    const initialCases = new Set<string>();
    const suiteSet = new Set(currentlyLinkedSuiteIds.map(String));
    for (const suite of availableSuites) {
      if (suiteSet.has(String(suite.id))) {
        suite.cases?.forEach((c) => initialCases.add(String(c.id)));
      }
    }
    return initialCases;
  });

  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(() => {
    return new Set(currentlyLinkedSuiteIds.map(String));
  });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const suiteSet = new Set(currentlyLinkedSuiteIds.map(String));
      setSelectedSuiteIds(suiteSet);

      if (currentlyLinkedCaseIds && currentlyLinkedCaseIds.length > 0) {
        setSelectedCaseIds(new Set(currentlyLinkedCaseIds.map(String)));
      } else {
        const initialCases = new Set<string>();
        for (const suite of availableSuites) {
          if (suiteSet.has(String(suite.id))) {
            suite.cases?.forEach((c) => initialCases.add(String(c.id)));
          }
        }
        setSelectedCaseIds(initialCases);
      }

      setExpandedSuiteIds(new Set(currentlyLinkedSuiteIds.map(String)));
      setSearch("");
    }
  }, [isOpen, currentlyLinkedSuiteIds, currentlyLinkedCaseIds, availableSuites]);

  const filteredSuites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableSuites;
    return availableSuites.filter((suite) => {
      if (suite.title.toLowerCase().includes(q)) return true;
      if (
        suite.cases?.some(
          (c) =>
            c.caseName.toLowerCase().includes(q) ||
            c.tcId.toLowerCase().includes(q) ||
            c.typeCase?.toLowerCase().includes(q) ||
            c.priority?.toLowerCase().includes(q),
        )
      ) {
        return true;
      }
      return false;
    });
  }, [availableSuites, search]);

  const toggleSuiteSelection = (suite: AvailableSuite) => {
    const sId = String(suite.id);
    const suiteCases = suite.cases || [];
    const caseIdsInSuite = suiteCases.map((c) => String(c.id));
    const allSelected =
      caseIdsInSuite.length > 0 &&
      caseIdsInSuite.every((cid) => selectedCaseIds.has(cid));

    setSelectedSuiteIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });

    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        caseIdsInSuite.forEach((cid) => next.delete(cid));
      } else {
        caseIdsInSuite.forEach((cid) => next.add(cid));
      }
      return next;
    });
  };

  const toggleCaseSelection = (suite: AvailableSuite, caseId: string | number) => {
    const cId = String(caseId);
    const sId = String(suite.id);
    const suiteCases = suite.cases || [];

    const nextCases = new Set(selectedCaseIds);
    if (nextCases.has(cId)) {
      nextCases.delete(cId);
    } else {
      nextCases.add(cId);
    }
    setSelectedCaseIds(nextCases);

    const hasAnyInSuite = suiteCases.some((c) => nextCases.has(String(c.id)));
    setSelectedSuiteIds((prev) => {
      const nextSuites = new Set(prev);
      if (hasAnyInSuite) {
        nextSuites.add(sId);
      } else {
        nextSuites.delete(sId);
      }
      return nextSuites;
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

  const selectAllFiltered = () => {
    const nextSuites = new Set(selectedSuiteIds);
    const nextCases = new Set(selectedCaseIds);
    filteredSuites.forEach((s) => {
      nextSuites.add(String(s.id));
      s.cases?.forEach((c) => nextCases.add(String(c.id)));
    });
    setSelectedSuiteIds(nextSuites);
    setSelectedCaseIds(nextCases);
  };

  const deselectAllFiltered = () => {
    const nextSuites = new Set(selectedSuiteIds);
    const nextCases = new Set(selectedCaseIds);
    filteredSuites.forEach((s) => {
      nextSuites.delete(String(s.id));
      s.cases?.forEach((c) => nextCases.delete(String(c.id)));
    });
    setSelectedSuiteIds(nextSuites);
    setSelectedCaseIds(nextCases);
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/test-plans/${planId}/suites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiteIds: Array.from(selectedSuiteIds).map((id) => Number(id)),
          caseIds: Array.from(selectedCaseIds).map((id) => Number(id)),
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
    filteredSuites.length > 0 &&
    filteredSuites.every((s) => {
      const cases = s.cases || [];
      if (cases.length === 0) return selectedSuiteIds.has(String(s.id));
      return cases.every((c) => selectedCaseIds.has(String(c.id)));
    });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Test Plan Scope Checklist"
      description={`Select the test suites and individual test cases to execute in ${planTitle}`}
      icon={<Checks size={20} weight="bold" className="text-blue-600" />}
      maxWidth="2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">{selectedSuiteIds.size}</span> suites ·{" "}
            <span className="font-bold text-blue-600">{selectedCaseIds.size}</span> test cases selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
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
            {/* Search and bulk actions bar */}
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
                  placeholder="Filter suites or test cases..."
                  className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                {allFilteredSelected ? (
                  <button
                    type="button"
                    onClick={deselectAllFiltered}
                    className="font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                  >
                    Deselect All Filtered
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                  >
                    Select All Filtered
                  </button>
                )}
              </div>
            </div>

            {/* Checklist of suites and cases */}
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {filteredSuites.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No suites or cases match &ldquo;{search}&rdquo;.
                </div>
              ) : (
                filteredSuites.map((suite) => {
                  const sId = String(suite.id);
                  const isExpanded = expandedSuiteIds.has(sId);
                  const suiteCases = suite.cases || [];
                  const casesCount = suiteCases.length;
                  const selectedCasesInSuite = suiteCases.filter((c) =>
                    selectedCaseIds.has(String(c.id)),
                  );
                  const isAllSelected =
                    casesCount > 0
                      ? selectedCasesInSuite.length === casesCount
                      : selectedSuiteIds.has(sId);
                  const isPartiallySelected =
                    casesCount > 0 &&
                    selectedCasesInSuite.length > 0 &&
                    selectedCasesInSuite.length < casesCount;
                  const isCurPlan = String(suite.testPlanId) === String(planId);

                  return (
                    <div
                      key={sId}
                      className={cn(
                        "rounded-lg border transition",
                        isAllSelected || isPartiallySelected
                          ? "border-blue-200 bg-blue-50/15"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      {/* Suite Header Row */}
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="flex flex-1 items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSuiteSelection(suite)}
                            className="cursor-pointer text-slate-400 hover:text-blue-600 transition"
                            aria-label={`Toggle suite ${suite.title}`}
                          >
                            {isAllSelected ? (
                              <CheckSquare size={18} weight="fill" className="text-blue-600" />
                            ) : isPartiallySelected ? (
                              <MinusSquare size={18} weight="fill" className="text-blue-500" />
                            ) : (
                              <Square size={18} className="text-slate-300 hover:text-slate-500" />
                            )}
                          </button>

                          <div
                            className="min-w-0 flex-1 cursor-pointer select-none"
                            onClick={() => toggleExpandSuite(sId)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-bold text-slate-800">
                                {suite.title}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  selectedCasesInSuite.length > 0
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-600",
                                )}
                              >
                                {selectedCasesInSuite.length} of {casesCount} cases selected
                              </span>
                              {isCurPlan ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  In this plan
                                </span>
                              ) : suite.planTitle ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  In: {suite.planTitle}
                                </span>
                              ) : null}
                            </div>
                            {suite.planProject && (
                              <p className="mt-0.5 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {suite.planProject}
                              </p>
                            )}
                          </div>
                        </div>

                        {casesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpandSuite(sId)}
                            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <span>{isExpanded ? "Collapse" : "Cases"}</span>
                            {isExpanded ? (
                              <CaretDown size={12} weight="bold" />
                            ) : (
                              <CaretRight size={12} weight="bold" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable test cases checklist */}
                      {isExpanded && casesCount > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                          <div className="space-y-1">
                            {suiteCases.map((c) => {
                              const cId = String(c.id);
                              const isChecked = selectedCaseIds.has(cId);

                              return (
                                <label
                                  key={c.id}
                                  className={cn(
                                    "flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 transition",
                                    isChecked
                                      ? "bg-blue-50/80 text-slate-900 font-medium"
                                      : "hover:bg-slate-100 text-slate-600",
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleCaseSelection(suite, c.id)}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                                      {c.tcId}
                                    </span>
                                    <span className="truncate text-xs">{c.caseName}</span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {c.typeCase && (
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                        {c.typeCase}
                                      </span>
                                    )}
                                    {c.priority && (
                                      <span
                                        className={cn(
                                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                                          c.priority === "Critical" || c.priority === "High"
                                            ? "bg-rose-50 text-rose-600"
                                            : c.priority === "Medium"
                                              ? "bg-amber-50 text-amber-600"
                                              : "bg-slate-100 text-slate-500",
                                        )}
                                      >
                                        {c.priority}
                                      </span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
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
