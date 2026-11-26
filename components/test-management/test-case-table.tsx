"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn, formatDisplayText } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { TestCaseBulkBar } from "@/components/test-management/test-case-bulk-bar";
import { TestCaseDrawer } from "@/components/test-management/test-case-drawer";
import { SortableTestCaseRow } from "@/components/test-management/test-case-table-row";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
} from "@phosphor-icons/react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export type TestCase = {
  id: number;
  tcId: string;
  caseName: string;
  assignee?: string;
  typeCase: string;
  preCondition: string;
  testStep: string;
  expectedResult: string;
  actualResult: string;
  status: string;
  priority: string;
  evidence?: string;
  maturity?: string;
  category?: string;
  subModule?: string;
  deviceType?: string;
  suiteTitle: string | null;
  suiteToken: string | null;
  suiteStatus: string | null;
  suiteAssignee?: string | null;
  planTitle: string | null;
  planProject: string | null;
  testSuiteId: string | number;
};

export type SuiteGroup = {
  key: string;
  suiteId?: string | number;
  suiteTitle: string;
  suiteToken: string | null;
  suiteStatus: string | null;
  suiteAssignee: string | null;
  planTitle: string | null;
  planProject: string | null;
  cases: TestCase[];
  filteredCases?: TestCase[];
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
};

export const STATUS_PILL: Record<string, string> = {
  Passed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Failed: "text-rose-600 bg-rose-50 border-rose-200",
  Blocked: "text-amber-600 bg-amber-50 border-amber-200",
  Pending: "text-gray-500 bg-gray-50 border-gray-200",
};

export const STATUS_ICON: Record<string, React.ReactNode> = {
  Passed: <CheckCircle size={12} weight="fill" className="text-emerald-500" />,
  Failed: <XCircle size={12} weight="fill" className="text-rose-500" />,
  Blocked: <Warning size={12} weight="fill" className="text-amber-500" />,
  Pending: <Clock size={12} weight="fill" className="text-gray-400" />,
};

export function getCaseSortValue(value: string) {
  const match = String(value ?? "").match(/(\d+)/);
  return match ? Number.parseInt(match[1] ?? "0", 10) : Number.MAX_SAFE_INTEGER;
}

export function compareTestCases(a: TestCase, b: TestCase) {
  const aValue = getCaseSortValue(a.tcId);
  const bValue = getCaseSortValue(b.tcId);
  if (aValue !== bValue) return aValue - bValue;
  return String(a.tcId ?? "").localeCompare(String(b.tcId ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

export function compareSuiteGroups(a: SuiteGroup, b: SuiteGroup) {
  const aCase = a.cases[0];
  const bCase = b.cases[0];
  if (!aCase && !bCase) return a.suiteTitle.localeCompare(b.suiteTitle);
  if (!aCase) return 1;
  if (!bCase) return -1;
  return compareTestCases(aCase, bCase) || a.suiteTitle.localeCompare(b.suiteTitle);
}

/* QA Spreadsheet Test Case Table */
export function TestCaseTable({
  displayCases,
  suiteAssignee,
  onCreateTestPlan,
}: {
  displayCases: TestCase[];
  suiteAssignee: string | null;
  onCreateTestPlan?: (selectedCases: TestCase[]) => void;
}) {
  const [localCases, setLocalCases] = useState(displayCases);
  const [activeCase, setActiveCase] = useState<TestCase | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [drawerCase, setDrawerCase] = useState<TestCase | null>(null);

  useEffect(() => {
    setLocalCases(displayCases);
  }, [displayCases]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const sortableIds = useMemo(() => localCases.map((c) => `tc-${c.id}`), [localCases]);

  const allSelected = localCases.length > 0 && selectedIds.size === localCases.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localCases.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickStatusChange = async (id: number, status: string) => {
    setLocalCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c)),
    );
    try {
      const res = await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast(`Status updated to ${status}`, "success");
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const handleBulkStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setLocalCases((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, status } : c)),
      );
      toast(`Updated status to "${status}" for ${ids.length} cases`, "success");
      setSelectedIds(new Set());
    } catch {
      toast("Bulk status update failed", "error");
    }
  };

  const handleBulkPriority = async (priority: string) => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/items/test-cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, field: "priority", value: priority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      setLocalCases((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, priority } : c)),
      );
      toast(`Updated priority to "${priority}" for ${ids.length} cases`, "success");
      setSelectedIds(new Set());
    } catch {
      toast("Bulk priority update failed", "error");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(`/api/items/test-cases?ids=${ids.join(",")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete cases");
      setLocalCases((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      toast(`Deleted ${ids.length} test cases`, "success");
      setSelectedIds(new Set());
    } catch {
      toast("Bulk delete failed", "error");
    }
  };

  const handleCaseUpdated = (updatedCase: TestCase) => {
    setLocalCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)),
    );
    if (drawerCase?.id === updatedCase.id) setDrawerCase(updatedCase);
  };

  function handleDragStart(event: DragStartEvent) {
    const id = Number(String(event.active.id).replace("tc-", ""));
    const idx = localCases.findIndex((c) => c.id === id);
    if (idx >= 0) {
      setActiveCase(localCases[idx]);
      setActiveIndex(idx);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCase(null);
    setActiveIndex(-1);
    if (!over || active.id === over.id) return;

    const oldId = Number(String(active.id).replace("tc-", ""));
    const newId = Number(String(over.id).replace("tc-", ""));
    const oldIndex = localCases.findIndex((c) => c.id === oldId);
    const newIndex = localCases.findIndex((c) => c.id === newId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    setLocalCases((prev) => {
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });

    fetch("/api/items/test-cases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: oldId, sortOrder: newIndex + 1 }),
    }).catch(() => {});
  }

  return (
    <>
      <div className="w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
        <DndContext id="tc-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <table className="w-full min-w-[1700px] border-collapse border border-slate-200 text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-300 bg-[#D9E1F2] text-slate-800">
                <th className="w-12 px-2 py-2.5 text-center align-middle border-r border-slate-300 sticky left-0 z-20 bg-[#D9E1F2]">
                  <input
                    type="checkbox"
                    aria-label="Select all test cases"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  ID SCENARIO
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  MODULE NAME
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  DEVICE TYPE
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  SUB MODULE
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 min-w-[260px]">
                  TEST SCENARIO
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  CASE TYPE
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 min-w-[180px]">
                  PRE-CONDITION
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 min-w-[320px]">
                  STEP SCENARIO
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 min-w-[220px]">
                  EXPECTED RESULT
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 min-w-[220px]">
                  ACTUAL RESULT
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  STATUS
                </th>
                <th className="px-3 py-2.5 text-left font-bold tracking-wider uppercase border-r border-slate-300 whitespace-nowrap">
                  PIC TESTER
                </th>
                <th className="px-3 py-2.5 text-center font-bold tracking-wider uppercase whitespace-nowrap">
                  Evidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {localCases.map((testCase, index) => (
                  <SortableTestCaseRow
                    key={testCase.id}
                    testCase={testCase}
                    index={index}
                    suiteAssignee={suiteAssignee}
                    isSelected={selectedIds.has(testCase.id)}
                    onToggleSelect={toggleSelectOne}
                    onOpenDetail={(tc) => setDrawerCase(tc)}
                    onQuickStatusChange={handleQuickStatusChange}
                  />
                ))}
              </SortableContext>
              {localCases.length > 0 && localCases.length < 5 &&
                Array.from({ length: 5 - localCases.length }).map((_, i) => (
                  <tr key={`empty-row-${i}`} className="border-b border-slate-100 h-11 select-none bg-slate-50/20">
                    <td className="border-r border-slate-200 w-12" />
                    <td className="border-r border-slate-200 px-3 py-3 text-slate-300 font-mono text-xs">-</td>
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td className="border-r border-slate-200" />
                    <td />
                  </tr>
                ))}
            </tbody>
          </table>
          <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
            {activeCase ? (
              <table className="min-w-[1700px] border-collapse bg-white shadow-xl ring-2 ring-blue-500/50 text-xs">
                <tbody>
                  <SortableTestCaseRow
                    testCase={activeCase}
                    index={activeIndex}
                    suiteAssignee={suiteAssignee}
                    isDragOverlay
                  />
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Floating bulk action bar */}
      <TestCaseBulkBar
        selectedCount={selectedIds.size}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        onCreateTestPlan={
          onCreateTestPlan
            ? () => {
                const selected = localCases.filter((c) => selectedIds.has(c.id));
                onCreateTestPlan(selected);
              }
            : undefined
        }
      />

      {/* Side Drawer for Test Case Detail & Edit */}
      <TestCaseDrawer
        testCase={drawerCase}
        onClose={() => setDrawerCase(null)}
        onCaseUpdated={handleCaseUpdated}
      />
    </>
  );
}

export { TestCaseMobileCards } from "@/components/test-management/test-case-mobile-cards";
