"use client";

import { useState, useRef, useEffect } from "react";
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
import { compressImageToWebp } from "@/lib/image-compress";

export interface TestCaseDraft {
  caseName?: string;
  typeCase?: "Positive" | "Negative";
  priority?: "Critical" | "High" | "Medium" | "Low";
  preCondition?: string;
  testStep?: string;
  expectedResult?: string;
  actualResult?: string;
  subModule?: string;
  deviceType?: string;
  evidence?: string;
  project?: string;
  testSuiteId?: string;
}

export interface AiTestCaseAgentContentProps {
  projectOptions?: Array<{ label: string; value: string }>;
  defaultProject?: string;
  selectedProject?: string;
  selectedSuiteId?: string;
  onSwitchToManual: (draft: TestCaseDraft) => void;
  onDirectSubmit?: (entry: Record<string, unknown>, createAnother?: boolean) => Promise<void> | void;
  onCancel: () => void;
  pending?: boolean;
}

const STORAGE_AI_TC_MEMORY = "aksora_test_case_ai_prompt_memory";

const AI_TEST_EXAMPLES = [
  { label: "Auth & 2FA Flow", prompt: "User signs in with valid credentials, receives 2FA SMS OTP, enters OTP, and lands on dashboard" },
  { label: "Checkout & Payment", prompt: "User applies valid discount promo coupon on checkout, selects credit card, and verifies order total deduction" },
  { label: "Profile & Settings", prompt: "User updates display name and uploads avatar image with JPG format under 2MB size limit" },
];

export function AiTestCaseAgentContent({
  defaultProject = "",
  selectedProject = "",
  selectedSuiteId = "",
  onSwitchToManual,
  onCancel,
  pending = false,
}: AiTestCaseAgentContentProps) {
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeEngine, setActiveEngine] = useState<{ provider: string; model: string }>({
    provider: "",
    model: "",
  });

  const [inputNotes, setInputNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeProject = selectedProject || defaultProject || "General";

  useEffect(() => {
    setActiveEngine(getActiveAiConfig());
    if (typeof window !== "undefined") {
      const savedMemory = localStorage.getItem(STORAGE_AI_TC_MEMORY);
      if (savedMemory) {
        setInputNotes(savedMemory);
      }
    }
  }, []);

  const handleNotesChange = (val: string) => {
    setInputNotes(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        localStorage.setItem(STORAGE_AI_TC_MEMORY, val);
      } else {
        localStorage.removeItem(STORAGE_AI_TC_MEMORY);
      }
    }
  };

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

  const handleProcess = async () => {
    if (!inputNotes.trim() && !imageBase64) {
      toast("Please describe what to test or attach a screenshot.", "error");
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
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_cases",
          payload: {
            story: inputNotes.trim(),
            featureName: activeProject,
            imageBase64: imageBase64 || undefined,
            mimeType: "image/webp",
          },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to process test case with AI");
      }

      const rawCases = json.data?.testCases;
      const primaryCase = Array.isArray(rawCases) && rawCases.length > 0 ? rawCases[0] : null;

      const normalizedType: "Positive" | "Negative" =
        String(primaryCase?.category || primaryCase?.typeCase || "").toLowerCase().includes("neg")
          ? "Negative"
          : "Positive";

      const rawPriority = String(primaryCase?.priority || "").toLowerCase();
      const normalizedPriority: "Critical" | "High" | "Medium" | "Low" =
        rawPriority.includes("crit") || rawPriority === "p0"
          ? "Critical"
          : rawPriority.includes("high") || rawPriority === "p1"
          ? "High"
          : rawPriority.includes("low") || rawPriority === "p3"
          ? "Low"
          : "Medium";

      const draft: TestCaseDraft = {
        caseName: primaryCase?.caseName || inputNotes.trim().slice(0, 90),
        typeCase: normalizedType,
        priority: normalizedPriority,
        preCondition: primaryCase?.preCondition || "Browser on landing page in standard session",
        testStep: primaryCase?.testStep || inputNotes.trim(),
        expectedResult: primaryCase?.expectedResult || "System behaves as expected according to specifications",
        actualResult: "",
        subModule: activeProject,
        deviceType: "Desktop Web",
        evidence: imageBase64 || "",
        project: activeProject,
        testSuiteId: selectedSuiteId,
      };

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_AI_TC_MEMORY);
      }

      toast("Test case structured. Review and tweak before saving.", "success");
      onSwitchToManual(draft);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to structure test case", "error");
    } finally {
      setLoading(false);
    }
  };

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
            onChange={(e) => handleNotesChange(e.target.value)}
            onPaste={handlePaste}
            rows={10}
            placeholder="Describe what you want to test, paste acceptance criteria, user story, API schema, or press Ctrl+V to drop a UI screenshot..."
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

            {/* Right: Active AI Engine & Workspace Memory */}
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
                  <span className="font-semibold text-slate-700">
                    {activeEngine.provider
                      ? `${AI_PROVIDER_LABELS[activeEngine.provider as SupportedProvider]?.label || activeEngine.provider}${
                          activeEngine.model ? ` (${activeEngine.model})` : ""
                        }`
                      : "Not configured (Settings)"}
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Example Templates */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-400">Try example:</span>
          {AI_TEST_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => handleNotesChange(ex.prompt)}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 transition cursor-pointer shadow-2xs"
            >
              {ex.label}
            </button>
          ))}
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
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
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
        featureName="AI Test Case Agent"
      />
    </div>
  );
}
