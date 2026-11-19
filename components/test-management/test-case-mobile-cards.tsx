"use client";

import React from "react";
import { cn, formatDisplayText } from "@/lib/utils";
import { STATUS_PILL, STATUS_ICON, type TestCase } from "@/components/test-management/test-case-table";

interface TestCaseMobileCardsProps {
  displayCases: TestCase[];
  suiteAssignee: string | null;
  onOpenDetail?: (testCase: TestCase) => void;
}

export function TestCaseMobileCards({
  displayCases,
  suiteAssignee,
  onOpenDetail,
}: TestCaseMobileCardsProps) {
  return (
    <div className="grid gap-3 px-4 py-4 md:hidden">
      {displayCases.map((testCase) => (
        <div
          key={testCase.id}
          onClick={() => onOpenDetail?.(testCase)}
          className="border border-slate-200 bg-white p-4 shadow-xs rounded-lg hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {testCase.tcId || `TC-${testCase.id}`}
              </span>
              <h3 className="mt-1 truncate text-sm font-bold text-slate-900">{testCase.caseName}</h3>
              <p className="mt-1 text-xs text-slate-500">{testCase.assignee || suiteAssignee || "Unassigned"}</p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-xs font-bold",
                STATUS_PILL[testCase.status] ?? STATUS_PILL.Pending,
              )}
            >
              {STATUS_ICON[testCase.status] ?? STATUS_ICON.Pending}
              {formatDisplayText(testCase.status || "Pending")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
