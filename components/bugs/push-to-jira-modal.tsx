"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CircleNotch, GearSix, ArrowSquareOut, WarningCircle } from "@phosphor-icons/react";

export interface PushToJiraModalProps {
  isOpen: boolean;
  onClose: () => void;
  devOptions?: Array<{ label: string; value: string }>;
  defaultAssignee?: string;
  defaultModule?: string;
  defaultProject?: string;
  submitting?: boolean;
  hideSaveWithoutPush?: boolean;
  trackerId?: number;
  onConfirmPush: (config: {
    assignee: string;
    assigneeName?: string;
    environment: string;
    scope: string;
  }) => void;
  onSaveWithoutPush?: () => void;
}

const ENVIRONMENT_OPTIONS = [
  { label: "🏷️ Development", value: "Development" },
  { label: "🏷️ UAT", value: "UAT" },
  { label: "🏷️ Production", value: "Production" },
];

const BASE_SCOPE_OPTIONS = [
  { label: "None (Leave empty)", value: "" },
  { label: "🖥️ Frontend", value: "Frontend" },
  { label: "⚙️ Backend", value: "Backend" },
  { label: "🤖 AI", value: "AI" },
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
  trackerId,
  onConfirmPush,
  onSaveWithoutPush,
}: PushToJiraModalProps) {
  const [assignee, setAssignee] = useState(() => defaultAssignee || "");
  const [environment, setEnvironment] = useState("Development");
  const [scope, setScope] = useState(() => defaultModule || "");
  const [jiraMembers, setJiraMembers] = useState<Array<{ label: string; value: string }>>([]);
  const [isJiraConnected, setIsJiraConnected] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string>("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingMembers(true);
    fetch(`/api/issue-trackers/jira/members${trackerId ? `?trackerId=${trackerId}` : ""}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.connected === false) {
          setIsJiraConnected(false);
          setConnectionError(json.error || "Jira integration is not connected in this workspace.");
        } else {
          setIsJiraConnected(true);
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setJiraMembers(json.data);
          }
        }
      })
      .catch((err) => {
        if (active) {
          setIsJiraConnected(false);
          setConnectionError(err instanceof Error ? err.message : "Failed to verify Jira connection.");
        }
      })
      .finally(() => {
        if (active) setLoadingMembers(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, trackerId]);

  if (!isOpen) return null;

  const effectiveDevOptions = jiraMembers.length > 0
    ? jiraMembers
    : devOptions.map((dev) => ({
        value: dev.value,
        label: dev.label.startsWith("👤") ? dev.label : `👤 ${dev.label || dev.value}`,
      }));

  const handlePushClick = () => {
    const selected = effectiveDevOptions.find((d) => d.value === assignee);
    const readableName = selected ? selected.label.replace(/^👤\s*/, "") : assignee;
    onConfirmPush({
      assignee,
      assigneeName: readableName,
      environment,
      scope,
    });
  };

  const scopeOptions = [
    ...BASE_SCOPE_OPTIONS,
    ...(defaultModule && !BASE_SCOPE_OPTIONS.some((o) => o.value === defaultModule)
      ? [{ label: defaultModule, value: defaultModule }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-jira-title"
      >
        {/* State 1: Jira Not Connected Alert / Setup Gate */}
        {isJiraConnected === false && !loadingMembers ? (
          <div>
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <WarningCircle size={24} weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="push-jira-title" className="text-base font-bold text-slate-900 leading-tight">
                  Jira Not Connected
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Your workspace has not been connected to the Jira API yet. Please configure your Jira Host URL, Email, and API Token first in Settings.
                </p>
              </div>
            </div>

            <div className="my-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <GearSix size={14} weight="bold" />
                <span>Integration Setup Required</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-normal">
                {connectionError || "No active Jira integration found in this workspace."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              {!hideSaveWithoutPush && onSaveWithoutPush && (
                <button
                  type="button"
                  onClick={onSaveWithoutPush}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition"
                >
                  Save in Aksora Only
                </button>
              )}
              <Link
                href="/settings/integrations"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm text-center"
              >
                <GearSix size={14} weight="bold" />
                <span>Configure Jira</span>
                <ArrowSquareOut size={13} weight="bold" />
              </Link>
            </div>
          </div>
        ) : (
          /* State 2: Normal Confirmation & Options */
          <div>
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 font-bold text-lg select-none">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Select Assignee (optional):
                  </label>
                  {loadingMembers && (
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <CircleNotch size={11} className="animate-spin text-blue-600" />
                      Loading Jira team...
                    </span>
                  )}
                </div>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  disabled={submitting || loadingMembers}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">Leave Unassigned</option>
                  {effectiveDevOptions.map((dev) => (
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
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  Cancel
                </button>
                {!hideSaveWithoutPush && onSaveWithoutPush && (
                  <button
                    type="button"
                    onClick={onSaveWithoutPush}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
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
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin text-white" />
                    <span>Pushing to Jira...</span>
                  </>
                ) : !assignee ? (
                  <span>Push without Assignee</span>
                ) : (
                  <span>Push to Jira</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
