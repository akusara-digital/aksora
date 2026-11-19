"use client";

import { useState } from "react";
import {
  CaretDown,
  CaretRight,
  CircleNotch,
  Tag,
  User,
} from "@phosphor-icons/react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BugCollapsibleDetails } from "./bug-collapsible-details";

interface StreamlinedBugFormProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  devOptions?: Array<{ label: string; value: string }>;
  initialData?: Record<string, unknown> | null;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (entry: Record<string, unknown>) => void;
}

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", dot: "bg-slate-400", active: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "medium", label: "Medium", dot: "bg-amber-400", active: "bg-amber-50 text-amber-700 border-amber-300" },
  { value: "high", label: "High", dot: "bg-orange-500", active: "bg-orange-50 text-orange-700 border-orange-300" },
  { value: "critical", label: "Critical", dot: "bg-rose-500", active: "bg-rose-50 text-rose-700 border-rose-300" },
];

const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"];
const BUG_TYPE_OPTIONS = ["Functional", "UI/UX", "Performance", "API", "Security", "Validation", "Compatibility"];

export function StreamlinedBugForm({
  projectOptions = [],
  defaultProject = "",
  devOptions = [],
  initialData = null,
  pending = false,
  onCancel,
  onSubmit,
}: StreamlinedBugFormProps) {
  const [project, setProject] = useState(
    () => String(initialData?.project || defaultProject || projectOptions[0]?.value || ""),
  );
  const [title, setTitle] = useState(() => String(initialData?.title || ""));
  const [severity, setSeverity] = useState(() => String(initialData?.severity || "medium").toLowerCase());
  const [priority, setPriority] = useState(() => String(initialData?.priority || "P2").toUpperCase());
  const [bugType, setBugType] = useState(() => String(initialData?.bugType || "Functional"));
  const [stepsToReproduce, setStepsToReproduce] = useState(() => String(initialData?.stepsToReproduce || ""));
  const [expectedResult, setExpectedResult] = useState(() => String(initialData?.expectedResult || ""));
  const [actualResult, setActualResult] = useState(() => String(initialData?.actualResult || ""));

  // Optional collapsible details
  const [showOptional, setShowOptional] = useState(() => {
    return Boolean(
      initialData?.suggestedDev ||
      initialData?.module ||
      initialData?.preconditions ||
      initialData?.evidence ||
      initialData?.relatedItems,
    );
  });
  const [suggestedDev, setSuggestedDev] = useState(() => String(initialData?.suggestedDev || ""));
  const [moduleName, setModuleName] = useState(() => String(initialData?.module || ""));
  const [preconditions, setPreconditions] = useState(() => String(initialData?.preconditions || ""));
  const [evidence, setEvidence] = useState(() => String(initialData?.evidence || ""));
  const [relatedItems, setRelatedItems] = useState(() => String(initialData?.relatedItems || ""));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim()) {
      toast("Please select or enter a Project Name.", "error");
      return;
    }
    if (!title.trim()) {
      toast("Please enter a Bug Title.", "error");
      return;
    }

    const payload: Record<string, unknown> = {
      project: project.trim(),
      title: title.trim(),
      severity,
      priority,
      bugType,
      stepsToReproduce: stepsToReproduce.trim(),
      expectedResult: expectedResult.trim(),
      actualResult: actualResult.trim(),
      status: String(initialData?.status || "open"),
    };

    if (suggestedDev.trim()) payload.suggestedDev = suggestedDev.trim();
    if (moduleName.trim()) payload.module = moduleName.trim();
    if (preconditions.trim()) payload.preconditions = preconditions.trim();
    if (evidence.trim()) payload.evidence = evidence.trim();
    if (relatedItems.trim()) payload.relatedItems = relatedItems.trim();

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 sm:p-6 text-xs text-slate-800">
      {/* Row 1: Project & Title */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Project <span className="text-rose-500">*</span>
            </label>
            {projectOptions.length > 0 ? (
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                required
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
              >
                <option value="" disabled>Select Project...</option>
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Core Web App"
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
              />
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Bug Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Checkout button unresponsive on mobile Safari"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        {/* Row 2: Severity, Priority, & Bug Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          {/* Severity */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Severity
            </span>
            <div className="grid grid-cols-4 gap-1">
              {SEVERITY_OPTIONS.map((opt) => {
                const isSelected = severity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded border py-1 text-[11px] font-semibold transition cursor-pointer",
                      isSelected
                        ? opt.active
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", opt.dot)} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Priority
            </span>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded border py-1 text-center text-[11px] font-bold transition cursor-pointer",
                      isSelected
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bug Type */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Bug Type
            </span>
            <select
              value={bugType}
              onChange={(e) => setBugType(e.target.value)}
              className="h-[27px] w-full rounded border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              {BUG_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Steps to Reproduce */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
            Steps to Reproduce
          </label>
          <AutoResizeTextarea
            value={stepsToReproduce}
            onChange={(e) => setStepsToReproduce(e.target.value)}
            rows={3}
            placeholder="1. Open checkout page&#10;2. Select payment method&#10;3. Click confirm and observe error"
            className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
          />
        </div>

        {/* Row 4: Expected & Actual Result (Side by Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Expected Result
            </label>
            <AutoResizeTextarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              rows={2}
              placeholder="e.g. Order placed successfully with confirmation screen"
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Actual Result
            </label>
            <AutoResizeTextarea
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              rows={2}
              placeholder="e.g. Page crashes with 500 error toast"
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        {/* Collapsible Section: Additional Details */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Tag size={14} className="text-slate-400" />
              <span>Additional details (Assignee, Module, Evidence)</span>
            </span>
            {showOptional ? <CaretDown size={14} /> : <CaretRight size={14} />}
          </button>

          {showOptional && (
            <div className="border-t border-slate-100 p-3.5 bg-slate-50/40">
              <BugCollapsibleDetails
                devOptions={devOptions}
                suggestedDev={suggestedDev}
                setSuggestedDev={setSuggestedDev}
                moduleName={moduleName}
                setModuleName={setModuleName}
                evidence={evidence}
                setEvidence={setEvidence}
                preconditions={preconditions}
                setPreconditions={setPreconditions}
                relatedItems={relatedItems}
                setRelatedItems={setRelatedItems}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
        >
          {pending && <CircleNotch size={14} className="animate-spin text-white" />}
          <span>{initialData ? "Save Changes" : "Create Bug"}</span>
        </button>
      </div>
    </form>
  );
}
