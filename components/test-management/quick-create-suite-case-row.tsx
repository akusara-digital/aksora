"use client";

import { Trash, CaretDown, CaretUp } from "@phosphor-icons/react";
import type { InitialCaseItem } from "./quick-create-suite-ai-section";

interface QuickCreateSuiteCaseRowProps {
  item: InitialCaseItem;
  index: number;
  canRemove: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: keyof InitialCaseItem, val: string) => void;
  onRemove: () => void;
}

export function QuickCreateSuiteCaseRow({
  item,
  index,
  canRemove,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: QuickCreateSuiteCaseRowProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 shadow-2xs transition">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 font-mono w-6 text-center shrink-0">
          #{index + 1}
        </span>

        <input
          type="text"
          placeholder="e.g. Verify login with valid credentials"
          value={item.caseName}
          onChange={(e) => onUpdate("caseName", e.target.value)}
          className="h-8 flex-1 w-full text-xs rounded border border-slate-200 px-2.5 text-slate-900 outline-none focus:border-blue-500"
        />

        <select
          value={item.typeCase}
          onChange={(e) => onUpdate("typeCase", e.target.value as "Positive" | "Negative")}
          className="h-8 w-24 text-xs rounded border border-slate-200 px-1.5 text-slate-700 outline-none"
        >
          <option value="Positive">Positive</option>
          <option value="Negative">Negative</option>
        </select>

        <select
          value={item.priority || "Medium"}
          onChange={(e) => onUpdate("priority", e.target.value)}
          className="h-8 w-24 text-xs rounded border border-slate-200 px-1.5 text-slate-700 outline-none"
        >
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <input
          type="text"
          placeholder="Expected result (optional)"
          value={item.expectedResult}
          onChange={(e) => onUpdate("expectedResult", e.target.value)}
          className="h-8 flex-1 w-full text-xs rounded border border-slate-200 px-2.5 text-slate-900 outline-none focus:border-blue-500"
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title={isExpanded ? "Hide Steps" : "Show Steps & Precondition"}
          >
            {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="Remove case"
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px]">
          <div>
            <label className="mb-0.5 block font-semibold text-slate-600">Pre-Condition</label>
            <input
              type="text"
              value={item.preCondition || ""}
              onChange={(e) => onUpdate("preCondition", e.target.value)}
              placeholder="e.g. User is logged in with test credentials"
              className="h-7 w-full rounded border border-slate-200 px-2 text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block font-semibold text-slate-600">Test Steps</label>
            <textarea
              rows={2}
              value={item.testStep || ""}
              onChange={(e) => onUpdate("testStep", e.target.value)}
              placeholder="1. Navigate to...\n2. Click..."
              className="w-full rounded border border-slate-200 p-1.5 text-slate-800 outline-none focus:border-blue-500 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
