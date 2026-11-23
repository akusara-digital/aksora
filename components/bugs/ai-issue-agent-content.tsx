"use client";

import { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  X,
  CircleNotch,
  Lightning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { toast } from "@/components/ui/toast";
import { compressImageToWebp } from "@/lib/image-compress";
import type { IssueAgentTicketDraft } from "@/lib/ai-issue-agent";

export interface AiIssueAgentContentProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  selectedProject?: string;
  onSwitchToManual: (draft: IssueAgentTicketDraft) => void;
  onDirectSubmit: (entry: Record<string, unknown>, createAnother?: boolean) => Promise<void> | void;
  onCancel: () => void;
  pending?: boolean;
}

export function AiIssueAgentContent({
  defaultProject = "",
  selectedProject = "",
  onSwitchToManual,
  onDirectSubmit,
  onCancel,
  pending = false,
}: AiIssueAgentContentProps) {
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<"auto" | "review" | null>(null);

  // Prompt & Options
  const [inputNotes, setInputNotes] = useState("");
  const [preset, setPreset] = useState<"standard" | "compact" | "technical">("technical");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeProject = selectedProject || defaultProject || "General";

  // Handle keyboard shortcut (Ctrl+Enter / Cmd+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading && !pending) {
          void handleProcess("auto");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleAttachImage = async (file: File) => {
    try {
      const compressed = await compressImageToWebp(file, { maxDimension: 1440, quality: 0.8 });
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.dataUrl);
      toast("Screenshot attached", "success");
    } catch {
      toast("Failed to process screenshot", "error");
    }
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


  const handleProcess = async (targetAction: "auto" | "review") => {
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
    setActionType(targetAction);

    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue_agent",
          payload: {
            prompt: inputNotes.trim(),
            project: activeProject,
            preset,
            imageBase64: imageBase64 || undefined,
            mimeType: "image/webp",
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to process issue with AI");
      }

      const ticket: IssueAgentTicketDraft = json.data?.ticket || {
        title: inputNotes.trim().slice(0, 80),
        project: activeProject,
        severity: "medium",
        priority: "P2",
        bugType: "Functional",
        stepsToReproduce: inputNotes.trim(),
        expectedResult: "Operation completes without error",
        actualResult: inputNotes.trim(),
      };

      const finalEvidence = imageBase64 || ticket.evidence || "";

      if (targetAction === "review") {
        toast("Draft structured. Review and tweak before saving.", "success");
        onSwitchToManual({
          ...ticket,
          evidence: finalEvidence,
        });
      } else {
        // Direct auto-create
        const payload: Record<string, unknown> = {
          title: ticket.title || inputNotes.trim().slice(0, 80),
          project: activeProject,
          severity: ticket.severity || "medium",
          priority: ticket.priority || "P2",
          bugType: ticket.bugType || "Functional",
          stepsToReproduce: ticket.stepsToReproduce || "",
          expectedResult: ticket.expectedResult || "",
          actualResult: ticket.actualResult || "",
          module: ticket.module || "",
          evidence: finalEvidence,
          preconditions: ticket.preconditions || "",
          status: "open",
        };

        await onDirectSubmit(payload, false);
        toast("Bug created successfully!", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to structure issue", "error");
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <div className="flex flex-col justify-between min-h-[480px] sm:min-h-[510px] p-4 sm:p-5 text-xs text-slate-800">
      <div className="flex flex-col gap-3">
        {/* Central Input Card Container */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15">
          {/* Screenshot Attachment Preview */}
          {imagePreview && (
            <div className="relative mb-2.5 inline-block rounded-md border border-slate-200 bg-slate-50 p-1">
              <img
                src={imagePreview}
                alt="Screenshot attachment"
                className="h-20 w-auto rounded object-contain border border-slate-200"
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
            onChange={(e) => setInputNotes(e.target.value)}
            onPaste={handlePaste}
            rows={10}
            placeholder="Describe the defect, paste stack trace / console log, or press Ctrl+V to drop a screenshot..."
            className="w-full min-h-[220px] text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
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
          onClick={() => void handleProcess("review")}
          disabled={loading || pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/70 px-4 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer disabled:opacity-50"
        >
          {loading && actionType === "review" && (
            <CircleNotch size={13} className="animate-spin text-blue-700" />
          )}
          Structure & Review
        </button>

        <button
          type="button"
          onClick={() => void handleProcess("auto")}
          disabled={loading || pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
        >
          {loading && actionType === "auto" ? (
            <CircleNotch size={13} className="animate-spin text-white" />
          ) : (
            <Lightning size={13} weight="bold" />
          )}
          <span>Auto-Create Bug</span>
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
