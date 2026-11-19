"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  Sparkle,
  PaperPlaneTilt,
  Image as ImageIcon,
  X,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  Sliders,
  SpinnerGap,
  PencilSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { toast } from "@/components/ui/toast";
import { compressImageToWebp } from "@/lib/image-compress";
import type { IssueAgentTicketDraft, IssueAgentChatMessage } from "@/lib/ai-issue-agent";

export interface AiIssueAgentContentProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  onSwitchToManual: (draft: IssueAgentTicketDraft) => void;
  onDirectSubmit: (entry: Record<string, unknown>) => Promise<void> | void;
  onCancel: () => void;
  pending?: boolean;
}

const SAMPLE_PROMPTS = [
  "Payment button unresponsive after selecting QRIS on checkout",
  "HTTP 500 error on saving project settings with console trace",
  "Broken layout and overlapping text on mobile checkout drawer",
  "Session logged out automatically after refreshing profile",
];

export function AiIssueAgentContent({
  projectOptions = [],
  defaultProject = "",
  onSwitchToManual,
  onDirectSubmit,
  onCancel,
  pending = false,
}: AiIssueAgentContentProps) {
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Settings & Presets
  const [selectedProject, setSelectedProject] = useState(
    defaultProject || projectOptions[0]?.value || "General"
  );
  const [preset, setPreset] = useState<"standard" | "compact" | "technical">("standard");

  // Chat & notes input
  const [inputNotes, setInputNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Conversation history
  const [messages, setMessages] = useState<IssueAgentChatMessage[]>([]);
  const [activeDraft, setActiveDraft] = useState<IssueAgentTicketDraft | null>(null);

  // Inline editing of draft
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editableDraft, setEditableDraft] = useState<IssueAgentTicketDraft | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleAttachImage = async (file: File) => {
    try {
      const compressed = await compressImageToWebp(file, { maxDimension: 1440, quality: 0.8 });
      setImagePreview(compressed.dataUrl);
      setImageBase64(compressed.dataUrl);
      toast("Screenshot attached to bug draft", "success");
    } catch {
      toast("Failed to compress screenshot", "error");
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

  const handleSubmit = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt ?? inputNotes).trim();
    if (!textToSend && !imageBase64) {
      toast("Please enter a bug description, error log, or attach a screenshot", "warning");
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    const newHistory: IssueAgentChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: textToSend,
        imageBase64: imageBase64 || undefined,
      },
    ];

    setMessages(newHistory);
    setInputNotes("");
    setImagePreview(null);
    setImageBase64(null);
    setLoading(true);

    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue_agent",
          payload: {
            messages: newHistory,
            project: selectedProject,
            preset,
            activeDraft: editableDraft || activeDraft || undefined,
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate bug report");

      const result = json.data;
      if (result) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.assistantReply || "I have prepared the structured bug report.",
          },
        ]);

        if (result.ticket) {
          const updatedDraft: IssueAgentTicketDraft = {
            ...result.ticket,
            project: selectedProject,
          };
          setActiveDraft(updatedDraft);
          setEditableDraft(updatedDraft);
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI generation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const currentDraft = editableDraft || activeDraft;

  const handleCreateBug = () => {
    if (!currentDraft || typeof currentDraft.title !== "string" || !currentDraft.title.trim()) {
      toast("Please generate or enter a bug title first", "warning");
      return;
    }

    const titleToSave = currentDraft.title.trim();
    const draftToSave = currentDraft;

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        project: draftToSave.project || selectedProject || "General",
        module: draftToSave.module || "General",
        bugType: draftToSave.bugType || "Functional",
        title: titleToSave,
        preconditions: draftToSave.preconditions || "None",
        stepsToReproduce: draftToSave.stepsToReproduce || "None",
        expectedResult: draftToSave.expectedResult || "None",
        actualResult: draftToSave.actualResult || "None",
        severity: draftToSave.severity || "medium",
        priority: draftToSave.priority || "P2",
        status: "open",
        evidence: draftToSave.evidence || "",
      };
      await onDirectSubmit(payload);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 text-xs text-gray-800">
      {/* Top Config Row: Project & Preset */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Project:</span>
            {projectOptions.length > 0 ? (
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  if (editableDraft) setEditableDraft({ ...editableDraft, project: e.target.value });
                }}
                className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500"
              >
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                placeholder="Project Name"
                className="h-8 w-36 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500"
              />
            )}
          </label>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* Preset buttons */}
          <div className="flex items-center gap-1.5">
            <Sliders size={13} weight="bold" className="text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Preset:</span>
            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
              {(
                [
                  { id: "standard", label: "Standard" },
                  { id: "compact", label: "Compact (No steps)" },
                  { id: "technical", label: "Technical" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-semibold transition",
                    preset === p.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-[11px] text-gray-500 italic">Rules synced with SnapTest Issue Agent</span>
      </div>

      {/* Conversation & Draft Area */}
      <div className="space-y-3.5">
        {messages.length === 0 && !currentDraft && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-2.5">
              <Sparkle size={20} weight="bold" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">AI Issue Agent</h4>
            <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
              Describe what went wrong in your own words, paste an error log, or drop a screenshot.
              AI will triage, format reproduction steps, and assemble a developer-ready bug report.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSubmit(prompt)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 text-left"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat turns */}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg p-3 text-xs leading-relaxed",
              m.role === "user"
                ? "ml-8 border border-gray-200 bg-gray-50 text-gray-900 self-end"
                : "mr-8 border border-blue-100 bg-blue-50/50 text-blue-950"
            )}
          >
            <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-gray-500">
              {m.role === "user" ? (
                <span>You</span>
              ) : (
                <span className="flex items-center gap-1 text-blue-700">
                  <Sparkle size={12} weight="bold" /> AI Assistant
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.imageBase64 && (
              <div className="mt-1.5 max-w-xs overflow-hidden rounded border border-gray-200">
                <img src={m.imageBase64} alt="Attached screenshot" className="max-h-32 object-contain" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-xs font-semibold text-blue-700">
            <SpinnerGap size={16} weight="bold" className="animate-spin" />
            <span>Analyzing defect, standardizing steps, and assembling bug report...</span>
          </div>
        )}

        {/* Structured Bug Card Preview */}
        {currentDraft && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                  {currentDraft.bugType || "Functional"}
                </span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-bold border",
                    currentDraft.severity === "critical"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : currentDraft.severity === "high"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                >
                  {currentDraft.severity?.toUpperCase() || "MEDIUM"}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-700 border border-gray-200">
                  {currentDraft.priority || "P2"}
                </span>
                {currentDraft.module && (
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
                    {currentDraft.module}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditingDraft(!isEditingDraft)}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-blue-600"
              >
                <PencilSimple size={12} weight="bold" />
                {isEditingDraft ? "Done Editing" : "Edit Details"}
              </button>
            </div>

            {isEditingDraft ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={editableDraft?.title || ""}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), title: e.target.value }))}
                    className="h-8 w-full rounded border border-gray-200 px-2.5 text-xs font-semibold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Module</label>
                  <input
                    type="text"
                    value={editableDraft?.module || ""}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), module: e.target.value }))}
                    className="h-8 w-full rounded border border-gray-200 px-2.5 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Severity</label>
                  <select
                    value={editableDraft?.severity || "medium"}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), severity: e.target.value }))}
                    className="h-8 w-full rounded border border-gray-200 px-2.5 text-xs text-gray-900"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Steps to Reproduce</label>
                  <textarea
                    rows={3}
                    value={editableDraft?.stepsToReproduce || ""}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), stepsToReproduce: e.target.value }))}
                    className="w-full rounded border border-gray-200 p-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Expected Result</label>
                  <textarea
                    rows={2}
                    value={editableDraft?.expectedResult || ""}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), expectedResult: e.target.value }))}
                    className="w-full rounded border border-gray-200 p-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Actual Result</label>
                  <textarea
                    rows={2}
                    value={editableDraft?.actualResult || ""}
                    onChange={(e) => setEditableDraft((prev) => ({ ...(prev || {}), actualResult: e.target.value }))}
                    className="w-full rounded border border-gray-200 p-2 text-xs text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">{currentDraft.title}</h3>

                {currentDraft.preconditions && currentDraft.preconditions !== "None" && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-700">Preconditions: </span>
                    {currentDraft.preconditions}
                  </p>
                )}

                {currentDraft.stepsToReproduce && (
                  <div>
                    <span className="font-semibold text-gray-700 block mb-0.5">Steps to Reproduce:</span>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-100">
                      {currentDraft.stepsToReproduce}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
                    <span className="font-semibold text-emerald-800 block mb-0.5">Expected Result:</span>
                    <p className="text-emerald-950">{currentDraft.expectedResult}</p>
                  </div>
                  <div className="rounded border border-rose-100 bg-rose-50/40 p-2">
                    <span className="font-semibold text-rose-800 block mb-0.5">Actual Result:</span>
                    <p className="text-rose-950">{currentDraft.actualResult}</p>
                  </div>
                </div>

                {currentDraft.evidence && (
                  <p className="text-[11px] text-gray-500 truncate pt-1">
                    <span className="font-semibold">Evidence: </span>
                    {currentDraft.evidence}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={chatScrollRef} />
      </div>

      {/* Input box */}
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
        {imagePreview && (
          <div className="relative inline-block border border-gray-200 rounded overflow-hidden">
            <img src={imagePreview} alt="Screenshot preview" className="max-h-24 object-contain" />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                setImageBase64(null);
              }}
              className="absolute top-1 right-1 rounded-full bg-gray-900/70 p-1 text-white hover:bg-gray-900"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        )}

        <div className="flex items-start gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputNotes}
            onChange={(e) => setInputNotes(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={
              currentDraft
                ? "Give feedback to refine (e.g., 'Remove steps', 'Make title shorter', 'Set severity to Critical')..."
                : "Describe the bug, paste error log, or press Ctrl+V to attach screenshot..."
            }
            className="w-full resize-none border-0 p-1 text-xs text-gray-900 outline-none placeholder:text-gray-400"
          />

          <div className="flex items-center gap-1.5 pt-1">
            <label
              title="Upload Screenshot"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <ImageIcon size={15} weight="bold" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAttachImage(file);
                  e.target.value = "";
                }}
              />
            </label>

            <button
              type="button"
              disabled={loading || (!inputNotes.trim() && !imageBase64)}
              onClick={() => handleSubmit()}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? (
                <SpinnerGap size={14} weight="bold" className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={14} weight="bold" />
              )}
              <span>{currentDraft ? "Refine" : "Send"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {currentDraft && (
            <button
              type="button"
              onClick={() => onSwitchToManual(currentDraft)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:bg-gray-50 hover:text-blue-600"
            >
              <span>Review in Manual Form</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          )}

          <button
            type="button"
            disabled={!currentDraft || pending}
            onClick={handleCreateBug}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? (
              <SpinnerGap size={14} weight="bold" className="animate-spin" />
            ) : (
              <CheckCircle size={15} weight="bold" />
            )}
            <span>Create Bug</span>
          </button>
        </div>
      </div>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
      />
    </div>
  );
}
