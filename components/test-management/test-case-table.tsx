"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn, formatDisplayText } from "@/lib/utils";
import { MaturityBadge } from "@/components/test-management/maturity-badge";
import { toast } from "@/components/ui/toast";
import { TestCaseBulkBar } from "@/components/test-management/test-case-bulk-bar";
import { TestCaseDrawer } from "@/components/test-management/test-case-drawer";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  DotsSixVertical,
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

export const TYPE_COLOR: Record<string, string> = {
  Positive: "text-teal-600",
  Negative: "text-rose-600",
};

export const PRIORITY_COLOR: Record<string, string> = {
  Critical: "text-red-600",
  High: "text-red-500",
  Medium: "text-orange-500",
  Low: "text-gray-500",
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

/* ─── Sortable Test Case Row ─── */
export function SortableTestCaseRow({
  testCase,
  index,
  suiteAssignee,
  isSelected = false,
  onToggleSelect,
  onOpenDetail,
  isDragOverlay = false,
}: {
  testCase: TestCase;
  index: number;
  suiteAssignee: string | null;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onOpenDetail?: (testCase: TestCase) => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tc-${testCase.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group/row transition-shadow duration-200 hover:bg-gray-50/70",
        isSelected && "bg-blue-50/40 hover:bg-blue-50/60",
        isDragging && "opacity-30 bg-gray-100",
        isDragOverlay && "shadow-md bg-white opacity-100 ring-2 ring-sky-400/50",
      )}
    >
      <td className="px-2 py-3.5 align-middle w-[68px]">
        <div className="flex items-center gap-1.5">
          <span {...listeners} className="inline-flex cursor-grab active:cursor-grabbing touch-none text-gray-300 hover:text-gray-500 transition">
            <DotsSixVertical size={14} weight="bold" />
          </span>
          {onToggleSelect && (
            <input
              type="checkbox"
              aria-label={`Select test case ${testCase.caseName}`}
              checked={isSelected}
              onChange={() => onToggleSelect(testCase.id)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          )}
        </div>
      </td>
      <td className="px-3 py-3.5 align-top">
        <span className="font-mono text-xs font-bold text-gray-400">{index + 1}</span>
      </td>
      <td className="max-w-[360px] px-3 py-3.5 align-top">
        <div className="space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDetail?.(testCase)}
              className="truncate text-left font-semibold text-gray-900 hover:text-blue-600 transition cursor-pointer"
            >
              {testCase.caseName}
            </button>
            <MaturityBadge maturity={testCase.maturity} className="shrink-0" />
          </div>
          {testCase.actualResult && (
            <p className="mt-0 truncate text-xs text-gray-400">{testCase.actualResult}</p>
          )}
        </div>
      </td>
      <td className="hidden px-3 py-3.5 align-top md:table-cell">
        <span className="text-xs font-semibold text-gray-600">
          {testCase.assignee || suiteAssignee || "Unassigned"}
        </span>
      </td>
      <td className="hidden px-3 py-3.5 align-top md:table-cell">
        <span className={cn("text-xs font-semibold", TYPE_COLOR[testCase.typeCase] ?? "text-gray-500")}>{formatDisplayText(testCase.typeCase)}</span>
      </td>
      <td className="hidden px-3 py-3.5 align-top lg:table-cell">
        <span className={cn("text-xs font-semibold", PRIORITY_COLOR[testCase.priority] ?? "text-gray-500")}>{formatDisplayText(testCase.priority)}</span>
      </td>
      <td className="px-3 py-3.5 align-top">
        <span className={cn("inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-bold", STATUS_PILL[testCase.status] ?? STATUS_PILL.Pending)}>
          {STATUS_ICON[testCase.status] ?? STATUS_ICON.Pending}
          {formatDisplayText(testCase.status || "Pending")}
        </span>
      </td>
    </tr>
  );
}

/* ─── Sortable Test Case Table ─── */
export function TestCaseTable({
  displayCases,
  suiteAssignee,
}: {
  displayCases: TestCase[];
  suiteAssignee: string | null;
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
      <DndContext id="tc-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-200">
              <th className="w-[68px] px-2 py-3 text-center align-middle">
                <input
                  type="checkbox"
                  aria-label="Select all test cases"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="w-[52px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">#</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Test Case Name</th>
              <th className="hidden w-[160px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 md:table-cell">Assignee</th>
              <th className="hidden w-[120px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 md:table-cell">Type</th>
              <th className="hidden w-[90px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 lg:table-cell">Priority</th>
              <th className="w-[110px] px-3 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
        <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {activeCase ? (
            <table className="w-full text-sm">
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

      {/* Floating bulk action bar */}
      <TestCaseBulkBar
        selectedCount={selectedIds.size}
        onBulkStatus={handleBulkStatus}
        onBulkPriority={handleBulkPriority}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
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

/* ─── Mobile Cards View ─── */
export function TestCaseMobileCards({
  displayCases,
  suiteAssignee,
  onOpenDetail,
}: {
  displayCases: TestCase[];
  suiteAssignee: string | null;
  onOpenDetail?: (testCase: TestCase) => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-4 md:hidden">
      {displayCases.map((testCase) => (
        <div
          key={testCase.id}
          onClick={() => onOpenDetail?.(testCase)}
          className="border border-gray-200 bg-white p-4 shadow-sm rounded-lg hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="mt-1 truncate text-sm font-bold text-gray-900">{testCase.caseName}</h3>
              <p className="mt-1 text-xs text-gray-500">{testCase.assignee || suiteAssignee || "Unassigned"}</p>
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-xs font-bold", STATUS_PILL[testCase.status] ?? STATUS_PILL.Pending)}>
              {STATUS_ICON[testCase.status] ?? STATUS_ICON.Pending}
              {formatDisplayText(testCase.status || "Pending")}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
            <span className={TYPE_COLOR[testCase.typeCase] ?? "text-gray-500"}>{formatDisplayText(testCase.typeCase)}</span>
            <span className={PRIORITY_COLOR[testCase.priority] ?? "text-gray-500"}>{formatDisplayText(testCase.priority)}</span>
          </div>
          {testCase.actualResult && (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">{testCase.actualResult}</p>
          )}
        </div>
      ))}
    </div>
  );
}
