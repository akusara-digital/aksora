"use client";

import { Link as LinkIcon, X } from "@phosphor-icons/react";

interface BugCollapsibleDetailsProps {
  devOptions: Array<{ label: string; value: string }>;
  suggestedDev: string;
  setSuggestedDev: (val: string) => void;
  moduleName: string;
  setModuleName: (val: string) => void;
  evidence: string;
  setEvidence: (val: string) => void;
  preconditions: string;
  setPreconditions: (val: string) => void;
  relatedItems: string;
  setRelatedItems: (val: string) => void;
}

export function BugCollapsibleDetails({
  devOptions,
  suggestedDev,
  setSuggestedDev,
  moduleName,
  setModuleName,
  evidence,
  setEvidence,
  preconditions,
  setPreconditions,
  relatedItems,
  setRelatedItems,
}: BugCollapsibleDetailsProps) {
  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Assign Dev
          </label>
          {devOptions.length > 0 ? (
            <select
              value={suggestedDev}
              onChange={(e) => setSuggestedDev(e.target.value)}
              className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {devOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={suggestedDev}
              onChange={(e) => setSuggestedDev(e.target.value)}
              placeholder="e.g. dev@company.com"
              className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Feature / Module
          </label>
          <input
            type="text"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            placeholder="e.g. Checkout, Authentication"
            className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Evidence URL / Screenshot Link
          </label>
          {evidence.startsWith("data:image/") ? (
            <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-1 h-8">
              <img
                src={evidence}
                alt="Evidence preview"
                className="h-6 w-10 rounded object-cover border border-slate-100"
              />
              <span className="text-[11px] text-slate-600 font-medium truncate flex-1">
                Screenshot attached
              </span>
              <button
                type="button"
                onClick={() => setEvidence("")}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
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
                className="h-8 w-full rounded border border-slate-200 bg-white pl-7 pr-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Preconditions
          </label>
          <input
            type="text"
            value={preconditions}
            onChange={(e) => setPreconditions(e.target.value)}
            placeholder="e.g. User logged in with standard account"
            className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Linked Items
        </label>
        <input
          type="text"
          value={relatedItems}
          onChange={(e) => setRelatedItems(e.target.value)}
          placeholder="e.g. TC-042, Task #12"
          className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
