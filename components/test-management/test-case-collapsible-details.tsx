"use client";

import { Link as LinkIcon, X } from "@phosphor-icons/react";
import { CustomSelect } from "@/components/ui/custom-select";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

interface TestCaseCollapsibleDetailsProps {
  assigneeOptions?: Array<{ label: string; value: string }>;
  assignee: string;
  setAssignee: (val: string) => void;
  subModule: string;
  setSubModule: (val: string) => void;
  deviceType: string;
  setDeviceType: (val: string) => void;
  preCondition: string;
  setPreCondition: (val: string) => void;
  actualResult: string;
  setActualResult: (val: string) => void;
  evidence: string;
  setEvidence: (val: string) => void;
  tcId: string;
  setTcId: (val: string) => void;
}

const DEVICE_OPTIONS = [
  { value: "Desktop Web", label: "Desktop Web" },
  { value: "Mobile Web", label: "Mobile Web" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
];

export function TestCaseCollapsibleDetails({
  assigneeOptions = [],
  assignee,
  setAssignee,
  subModule,
  setSubModule,
  deviceType,
  setDeviceType,
  preCondition,
  setPreCondition,
  actualResult,
  setActualResult,
  evidence,
  setEvidence,
  tcId,
  setTcId,
}: TestCaseCollapsibleDetailsProps) {
  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      {/* Row 1: Case ID & PIC Tester */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Custom Case ID (Optional)
          </label>
          <input
            type="text"
            value={tcId}
            onChange={(e) => setTcId(e.target.value)}
            placeholder="e.g. TC-001"
            className="h-8 w-full rounded-none border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            PIC Tester (Assignee)
          </label>
          {assigneeOptions.length > 0 ? (
            <CustomSelect
              value={assignee}
              onChange={setAssignee}
              options={[{ value: "", label: "Unassigned" }, ...assigneeOptions]}
              placeholder="Unassigned"
              className="h-8 rounded-none py-1 text-xs"
            />
          ) : (
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. qa@company.com"
              className="h-8 w-full rounded-none border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Row 2: Device Type & Sub-Module */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Device Type
          </label>
          <CustomSelect
            value={deviceType}
            onChange={setDeviceType}
            options={DEVICE_OPTIONS}
            placeholder="Select Device"
            className="h-8 rounded-none py-1 text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Sub-Module / Category
          </label>
          <input
            type="text"
            value={subModule}
            onChange={(e) => setSubModule(e.target.value)}
            placeholder="e.g. Authentication / Sign-in"
            className="h-8 w-full rounded-none border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Row 3: Pre-condition */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Pre-Condition
        </label>
        <AutoResizeTextarea
          rows={2}
          value={preCondition}
          onChange={(e) => setPreCondition(e.target.value)}
          placeholder="e.g. Browser in unauthenticated incognito mode on landing page"
          className="w-full rounded-none border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500"
        />
      </div>

      {/* Row 4: Actual Result & Evidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Observed Actual Result (If already run)
          </label>
          <input
            type="text"
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
            placeholder="Optional notes from test execution"
            className="h-8 w-full rounded-none border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Evidence URL / Screenshot Link
          </label>
          {evidence.startsWith("data:image/") ? (
            <div className="flex items-center gap-2 rounded-none border border-slate-200 bg-white p-1 h-8">
              <img
                src={evidence}
                alt="Evidence preview"
                className="h-6 w-10 rounded-none object-cover border border-slate-100"
              />
              <span className="text-[11px] text-slate-600 font-medium truncate flex-1">
                Screenshot attached
              </span>
              <button
                type="button"
                onClick={() => setEvidence("")}
                className="rounded-none p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 cursor-pointer"
                title="Remove attached image"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <LinkIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="https://..."
                className="h-8 w-full rounded-none border border-slate-200 bg-white pl-7 pr-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
