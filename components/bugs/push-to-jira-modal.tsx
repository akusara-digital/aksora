"use client";

import { useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";

export interface PushToJiraModalProps {
  isOpen: boolean;
  onClose: () => void;
  devOptions?: Array<{ label: string; value: string }>;
  defaultAssignee?: string;
  defaultModule?: string;
  defaultProject?: string;
  submitting?: boolean;
  hideSaveWithoutPush?: boolean;
  onConfirmPush: (config: {
    assignee: string;
    environment: string;
    scope: string;
  }) => void;
  onSaveWithoutPush?: () => void;
}

const ENVIRONMENT_OPTIONS = [
  { label: "🏷️ Development", value: "Development" },
  { label: "🏷️ Staging", value: "Staging" },
  { label: "🏷️ Production", value: "Production" },
  { label: "🏷️ QA / Testing", value: "QA" },
  { label: "🏷️ UAT", value: "UAT" },
];

export function PushToJiraModal({
  isOpen,
  onClose,
  devOptions = [],
  defaultAssignee = "",
  defaultModule = "",
  defaultProject = "",
  submitting = false,
  hideSaveWithoutPush = false,
  onConfirmPush,
  onSaveWithoutPush,
}: PushToJiraModalProps) {
  const [assignee, setAssignee] = useState(() => defaultAssignee || "");
  const [environment, setEnvironment] = useState("Development");
  const [scope, setScope] = useState(() => defaultModule || "");

  if (!isOpen) return null;

  const handlePushClick = () => {
    onConfirmPush({
      assignee,
      environment,
      scope,
    });
  };

  const scopeOptions = [
    { label: "None (Leave empty)", value: "" },
    ...(defaultModule ? [{ label: defaultModule, value: defaultModule }] : []),
    ...(defaultProject && defaultProject !== defaultModule ? [{ label: defaultProject, value: defaultProject }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-jira-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg select-none">
            !
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="push-jira-title" className="text-base font-bold text-slate-900 leading-tight">
              Push to Jira Confirmation
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Confirm assignee, environment, and scope label before uploading to Jira.
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-3 mt-4">
          {/* Card 1: Assignee */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Select Assignee (optional):
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            >
              <option value="">Leave Unassigned</option>
              {devOptions.map((dev) => (
                <option key={dev.value} value={dev.value}>
                  {dev.label || dev.value}
                </option>
              ))}
            </select>
          </div>

          {/* Card 2: Environment Label */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Select Environment Label:
            </label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            >
              {ENVIRONMENT_OPTIONS.map((env) => (
                <option key={env.value} value={env.value}>
                  {env.label}
                </option>
              ))}
            </select>
          </div>

          {/* Card 3: Scope / Domain Label */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3.5">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Select Scope / Domain Label (optional):
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            >
              {scopeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 mt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-sm border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              Cancel
            </button>
            {!hideSaveWithoutPush && onSaveWithoutPush && (
              <button
                type="button"
                onClick={onSaveWithoutPush}
                disabled={submitting}
                className="rounded-sm border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Save bug in Aksora without uploading to Jira"
              >
                Save in Aksora
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handlePushClick}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-[#4F46E5] hover:bg-[#4338CA] px-4 sm:px-5 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <CircleNotch size={14} className="animate-spin text-white" />
                <span>Pushing...</span>
              </>
            ) : !assignee ? (
              <span>Push without Assignee</span>
            ) : (
              <span>Push to Jira</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
