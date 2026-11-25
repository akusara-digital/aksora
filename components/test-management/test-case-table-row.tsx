"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MaturityBadge } from "@/components/test-management/maturity-badge";
import {
  DotsSixVertical,
  CaretDown,
  ArrowSquareOut,
  Play,
} from "@phosphor-icons/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TestCase } from "@/components/test-management/test-case-table";

export const STATUS_PILL_STYLES: Record<string, string> = {
  Passed: "bg-emerald-50 text-emerald-800 border-emerald-300",
  Failed: "bg-rose-50 text-rose-800 border-rose-300",
  Blocked: "bg-amber-50 text-amber-800 border-amber-300",
  Pending: "bg-slate-100 text-slate-700 border-slate-300",
  "Not Yet Started": "bg-slate-100 text-slate-700 border-slate-300",
};

export const DEVICE_BADGE_STYLE =
  "inline-flex items-center gap-1 rounded-full bg-[#8B0000] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs whitespace-nowrap";

export const POSITIVE_BADGE_STYLE =
  "inline-flex items-center gap-1 rounded-full bg-[#15803D] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs whitespace-nowrap";

export const NEGATIVE_BADGE_STYLE =
  "inline-flex items-center gap-1 rounded-full bg-[#991B1B] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs whitespace-nowrap";

export const SUB_MODULE_STYLE =
  "inline-block rounded bg-[#FFF2E8] border border-[#FCE0CC] px-2.5 py-1 text-xs font-semibold text-[#9A3412] leading-tight";

interface SortableTestCaseRowProps {
  testCase: TestCase;
  index: number;
  suiteAssignee: string | null;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onOpenDetail?: (testCase: TestCase) => void;
  onQuickStatusChange?: (id: number, status: string) => void;
  isDragOverlay?: boolean;
}

export function SortableTestCaseRow({
  testCase,
  index,
  suiteAssignee,
  isSelected = false,
  onToggleSelect,
  onOpenDetail,
  onQuickStatusChange,
  isDragOverlay = false,
}: SortableTestCaseRowProps) {
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

  const statusLabel =
    testCase.status === "Pending" ? "NOT YET STARTED" : testCase.status.toUpperCase();

  const device = testCase.deviceType || "Desktop Web";
  const subModule = testCase.subModule || testCase.category || "-";
  const moduleName = testCase.suiteTitle || "IDB - TOP SPENDER";
  const tester = testCase.assignee || suiteAssignee || "-";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group/row border-b border-slate-200 transition-colors hover:bg-slate-50/80 text-xs",
        isSelected && "bg-blue-50/50 hover:bg-blue-50/70",
        isDragging && "opacity-30 bg-slate-100",
        isDragOverlay && "shadow-lg bg-white ring-2 ring-blue-500/50 opacity-100",
      )}
    >
      {/* 0. Selector & Drag Handle */}
      <td className="px-2 py-3 align-top w-12 border-r border-slate-200 bg-inherit sticky left-0 z-1">
        <div className="flex items-center gap-1.5 pt-0.5">
          <span
            {...listeners}
            className="inline-flex cursor-grab active:cursor-grabbing touch-none text-slate-300 hover:text-slate-600 transition"
            title="Drag to reorder"
          >
            <DotsSixVertical size={14} weight="bold" />
          </span>
          {onToggleSelect && (
            <input
              type="checkbox"
              aria-label={`Select test case ${testCase.caseName}`}
              checked={isSelected}
              onChange={() => onToggleSelect(testCase.id)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          )}
        </div>
      </td>

      {/* 1. ID SCENARIO */}
      <td className="px-3 py-3 align-top font-mono font-bold text-slate-800 whitespace-nowrap border-r border-slate-200">
        {testCase.tcId || `TCD-${String(index + 1).padStart(2, "0")}`}
      </td>

      {/* 2. MODULE NAME */}
      <td className="px-3 py-3 align-top font-bold text-slate-800 border-r border-slate-200 uppercase min-w-[130px] max-w-[170px] break-words">
        {moduleName}
      </td>

      {/* 3. DEVICE TYPE */}
      <td className="px-3 py-3 align-top border-r border-slate-200 min-w-[120px] whitespace-nowrap">
        <span className={DEVICE_BADGE_STYLE}>
          {device}
          <CaretDown size={9} weight="bold" />
        </span>
      </td>

      {/* 4. SUB MODULE */}
      <td className="px-3 py-3 align-top border-r border-slate-200 min-w-[140px] max-w-[180px]">
        {subModule !== "-" ? (
          <span className={SUB_MODULE_STYLE}>{subModule}</span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* 5. TEST SCENARIO */}
      <td className="px-3 py-3 align-top border-r border-slate-200 min-w-[260px] max-w-[360px]">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onOpenDetail?.(testCase)}
            className="text-left font-semibold text-slate-900 hover:text-blue-600 transition cursor-pointer leading-snug"
          >
            {testCase.caseName}
          </button>
          {testCase.maturity && (
            <div>
              <MaturityBadge maturity={testCase.maturity} />
            </div>
          )}
        </div>
      </td>

      {/* 6. CASE TYPE */}
      <td className="px-3 py-3 align-top border-r border-slate-200 whitespace-nowrap min-w-[90px]">
        <span
          className={
            testCase.typeCase?.toLowerCase() === "negative"
              ? NEGATIVE_BADGE_STYLE
              : POSITIVE_BADGE_STYLE
          }
        >
          {testCase.typeCase || "Positive"}
          <CaretDown size={9} weight="bold" />
        </span>
      </td>

      {/* 7. PRE-CONDITION */}
      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-700 min-w-[180px] max-w-[240px] leading-relaxed break-words">
        {testCase.preCondition || "-"}
      </td>

      {/* 8. STEP SCENARIO */}
      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-800 min-w-[320px] max-w-[440px] leading-relaxed break-words font-sans">
        {testCase.testStep ? (
          <div className="whitespace-pre-line space-y-0.5 text-xs text-slate-800">
            {testCase.testStep}
          </div>
        ) : (
          <span className="text-slate-400 italic">No steps recorded</span>
        )}
      </td>

      {/* 9. EXPECTED RESULT */}
      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-700 min-w-[220px] max-w-[320px] leading-relaxed break-words">
        {testCase.expectedResult || "-"}
      </td>

      {/* 10. ACTUAL RESULT */}
      <td className="px-3 py-3 align-top border-r border-slate-200 text-slate-700 min-w-[220px] max-w-[320px] leading-relaxed break-words">
        {testCase.actualResult ? (
          <span className="text-slate-700">{testCase.actualResult}</span>
        ) : (
          <span className="text-slate-400 italic">-</span>
        )}
      </td>

      {/* 11. STATUS */}
      <td className="px-3 py-3 align-top border-r border-slate-200 whitespace-nowrap min-w-[130px]">
        {onQuickStatusChange ? (
          <div className="flex items-center gap-1.5">
            <select
              value={testCase.status || "Pending"}
              onChange={(e) => onQuickStatusChange(testCase.id, e.target.value)}
              className={cn(
                "h-7 rounded border px-2 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer transition",
                STATUS_PILL_STYLES[testCase.status] || STATUS_PILL_STYLES.Pending,
              )}
            >
              <option value="Pending">NOT YET STARTED</option>
              <option value="Passed">PASSED</option>
              <option value="Failed">FAILED</option>
              <option value="Blocked">BLOCKED</option>
            </select>
            {onOpenDetail && (
              <button
                type="button"
                onClick={() => onOpenDetail(testCase)}
                title="Single Case Quick Execution"
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
              >
                <Play size={11} weight="fill" />
              </button>
            )}
          </div>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
              STATUS_PILL_STYLES[testCase.status] || STATUS_PILL_STYLES.Pending,
            )}
          >
            {statusLabel}
          </span>
        )}
      </td>

      {/* 12. PIC TESTER */}
      <td className="px-3 py-3 align-top border-r border-slate-200 font-medium text-slate-800 whitespace-nowrap min-w-[130px]">
        {tester}
      </td>

      {/* 13. Evidence */}
      <td className="px-3 py-3 align-top text-center min-w-[80px]">
        {testCase.evidence ? (
          <a
            href={testCase.evidence}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
            title="Open evidence"
          >
            <ArrowSquareOut size={13} weight="bold" />
            Link
          </a>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
    </tr>
  );
}
