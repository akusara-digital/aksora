"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  X,
  CircleNotch,
  Lightning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { isAiConfigured, getActiveAiCredentials, getActiveAiConfig } from "@/lib/ai-keys";
import { AI_PROVIDER_LABELS, type SupportedProvider } from "@/lib/ai-types";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { toast } from "@/components/ui/toast";
import { humanizeErrorMessage } from "@/lib/error-utils";
import { compressImageToWebp } from "@/lib/image-compress";
import { validateProjectSelection } from "@/lib/project-utils";
import { ProjectRequiredBanner } from "@/components/projects/project-required-banner";
import { AiDraftRestoredBanner } from "@/components/shared/ai-draft-restored-banner";
import {
  saveAiSession,
  getAiSession,
  clearAiSession,
  runAiBackgroundProcess,
  isAiDomainProcessing,
} from "@/lib/ai-session-cache";
import type { IssueAgentTicketDraft } from "@/lib/ai-issue-agent";

export interface AiIssueAgentContentProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  selectedProject?: string;
  onSwitchToManual: (draft: IssueAgentTicketDraft) => void;
  onDirectSubmit?: (entry: Record<string, unknown>, createAnother?: boolean) => Promise<void> | void;
  onCancel: () => void;
  pending?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function AiIssueAgentContent({
  projectOptions = [],
  defaultProject = "",
  selectedProject = "",
  onSwitchToManual,
  onDirectSubmit,
  onCancel,
  pending = false,
  onBusyChange,
}: AiIssueAgentContentProps) {
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<IssueAgentTicketDraft | null>(null);
  const [activeEngine, setActiveEngine] = useState<{ provider: string; model: string }>({
    provider: "",
    model: "",
  });

  // Prompt & Options
  const [inputNotes, setInputNotes] = useState("");
  const [preset, setPreset] = useState<"standard" | "compact" | "technical">("technical");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveProject = selectedProject || defaultProject;
  const projectValidation = validateProjectSelection(effectiveProject, projectOptions);
  const activeProject = effectiveProject;

  // Sync busy state
  useEffect(() => {
    if (onBusyChange) {
      onBusyChange(loading);
    }
  }, [loading, onBusyChange]);

  // Read active AI config and restored session memory on mount
  useEffect(() => {
    setActiveEngine(getActiveAiConfig());

    const session = getAiSession<IssueAgentTicketDraft>("bug");
    if (session) {
      if (session.inputPrompt) setInputNotes(session.inputPrompt);
      if (session.imageBase64) {
        setImagePreview(session.imageBase64);
        setImageBase64(session.imageBase64);
      }
      if (session.preset && (session.preset === "standard" || session.preset === "compact" || session.preset === "technical")) {
        setPreset(session.preset);
      }
      if (session.status === "processing" || isAiDomainProcessing("bug")) {
        setLoading(true);
      } else if (session.status === "completed" && session.resultDraft) {
        setRestoredDraft(session.resultDraft);
      }
    }

    const handleCompleted = (e: Event) => {
      const custom = e as CustomEvent<{ domain: string; result: IssueAgentTicketDraft }>;
      if (custom.detail?.domain === "bug" && custom.detail.result) {
        setLoading(false);
        setRestoredDraft(custom.detail.result);
        toast("AI finished structuring in background! Ready to review.", "success");
      }
    };
    window.addEventListener("aksora:ai-session-completed", handleCompleted);
    return () => window.removeEventListener("aksora:ai-session-completed", handleCompleted);
  }, []);

  const handleNotesChange = (val: string) => {
    setInputNotes(val);
    saveAiSession("bug", { inputPrompt: val, project: activeProject, preset });
  };

  const handleAttachImage = async (file: File) => {
    try {
      const compressed = await compressImageToWebp(file, { maxDimension: 1440, quality: 0.8 });
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.dataUrl);
      saveAiSession("bug", { imageBase64: compressed.dataUrl });
      toast("Screenshot attached", "success");
    } catch {
      toast("Failed to process screenshot", "error");
    }
  };

  const handleDiscardDraft = () => {
    clearAiSession("bug");
    setRestoredDraft(null);
    setInputNotes("");
    setImagePreview(null);
    setImageBase64(null);
    toast("Draft cleared", "info");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          void handleAttachImage(file);
          break;
        }
      }
    }
  };

  const handleProcess = async () => {
    if (!projectValidation.valid) {
      toast(projectValidation.message, "error");
      return;
    }

    if (!inputNotes.trim() && !imageBase64) {
      toast("Please describe the defect or attach a screenshot.", "error");
      textareaRef.current?.focus();
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setLoading(true);

    try {
      const credentials = getActiveAiCredentials();
      const ticket = await runAiBackgroundProcess<IssueAgentTicketDraft>({
        domain: "bug",
        action: "issue_agent",
        payload: {
          prompt: inputNotes.trim(),
          project: activeProject,
          preset,
          imageBase64: imageBase64 || undefined,
          mimeType: "image/webp",
        },
        aiCredentials: credentials,
        transformResponse: (data) => {
          const rawTicket: IssueAgentTicketDraft = data?.ticket || {
            title: inputNotes.trim().slice(0, 80),
            project: activeProject,
            severity: "medium",
            priority: "P2",
            bugType: "Functional",
            stepsToReproduce: inputNotes.trim(),
            expectedResult: "Operation completes without error",
            actualResult: inputNotes.trim(),
          };

          const detectedUrl = inputNotes.match(/https?:\/\/[^\s)]+/i)?.[0] || "";
          const finalEvidence = imageBase64 || rawTicket.evidence || detectedUrl || "";
          return {
            ...rawTicket,
            evidence: finalEvidence,
          };
        },
      });

      toast("Draft structured. Review and tweak before saving.", "success");
      onSwitchToManual(ticket);
    } catch (err) {
      toast(humanizeErrorMessage(err, "Failed to structure issue"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard shortcut (Ctrl+Enter / Cmd+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading && !pending) {
          void handleProcess();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="flex flex-col justify-between min-h-[480px] sm:min-h-[510px] p-4 sm:p-5 text-xs text-slate-800">
      <div className="flex flex-col gap-3">
        {/* Project Validation Banner */}
        <ProjectRequiredBanner
          hasProjects={Boolean(projectOptions && projectOptions.length > 0)}
          selectedProject={effectiveProject}
        />

        {/* AI Draft Restored Banner */}
        {restoredDraft && (
          <AiDraftRestoredBanner
            hasDraft={Boolean(restoredDraft)}
            draftTitle={restoredDraft.title}
            onReview={() => onSwitchToManual(restoredDraft)}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Central Input Card Container */}
        <div className="flex flex-col rounded-none border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition-all hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
          {/* Screenshot Attachment Preview */}
          {imagePreview && (
            <div className="relative mb-2.5 inline-block rounded-none border border-slate-200 bg-slate-50 p-1">
              <img
                src={imagePreview}
                alt="Screenshot attachment"
                className="h-20 w-auto rounded-none object-contain border border-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setImageBase64(null);
                }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow-xs hover:bg-rose-600 transition cursor-pointer"
                title="Remove screenshot"
              >
                <X size={10} weight="bold" />
              </button>
            </div>
          )}

          {/* Big Textarea */}
          <textarea
            ref={textareaRef}
            value={inputNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onPaste={handlePaste}
            rows={10}
            placeholder="Describe the defect, paste stack trace / console log, or press Ctrl+V to drop a screenshot..."
            className="w-full min-h-[220px] rounded-none text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
            disabled={loading || pending}
          />

          {/* Inner Action Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAttachImage(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
              >
                <ImageIcon size={13} weight="bold" className="text-slate-500" />
                <span>Attach Screenshot</span>
              </button>
            </div>

            {/* Right: Active AI Engine & Workspace Memory from settings */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                Memory Active
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    activeEngine.provider ? "bg-emerald-500" : "bg-amber-400"
                  )}
                />
                <span>
                  AI Engine:{" "}
                  {activeEngine.provider ? (
                    <Link
                      href="/settings/ai"
                      onClick={() => onCancel?.()}
                      className="font-semibold text-slate-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 transition"
                      title="Configure AI model in Settings"
                    >
                      {`${AI_PROVIDER_LABELS[activeEngine.provider as SupportedProvider]?.label || activeEngine.provider}${
                        activeEngine.model ? ` (${activeEngine.model})` : ""
                      }`}
                    </Link>
                  ) : (
                    <Link
                      href="/settings/ai"
                      onClick={() => onCancel?.()}
                      className="font-semibold text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center gap-1 transition"
                      title="Configure AI model in Settings"
                    >
                      Not configured (Settings)
                    </Link>
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-200 pt-3.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || pending}
          className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void handleProcess()}
          disabled={loading || pending}
          title={!projectValidation.valid ? projectValidation.message : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50",
            !projectValidation.valid
              ? "bg-slate-400 hover:bg-slate-500"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {loading ? (
            <CircleNotch size={13} className="animate-spin text-white" />
          ) : (
            <Lightning size={13} weight="bold" />
          )}
          <span>Structure & Review</span>
        </button>
      </div>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="AI Issue Agent"
      />
    </div>
  );
}
