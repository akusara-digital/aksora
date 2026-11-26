"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightning, Sparkle, Check } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";
import { AiUnconfiguredModal } from "@/components/shared/ai-unconfigured-modal";
import { QuickBugFormContent } from "@/components/bugs/quick-bug-form-content";
import { compressImageToWebp } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import {
  saveAiSession,
  getAiSession,
  clearAiSession,
} from "@/lib/ai-session-cache";
import {
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
} from "@/lib/form-draft-cache";

interface QuickBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProject?: string;
  initialTitle?: string;
  initialSteps?: string;
  initialExpected?: string;
  initialActual?: string;
  initialEvidence?: string;
  initialPreconditions?: string;
  initialRelatedItems?: string;
  autoAnalyze?: boolean;
}

export function QuickBugModal({
  isOpen,
  onClose,
  defaultProject = "",
  initialTitle = "",
  initialSteps = "",
  initialExpected = "",
  initialActual = "",
  initialEvidence = "",
  initialPreconditions = "-",
  initialRelatedItems = "",
  autoAnalyze = false,
}: QuickBugModalProps) {
  const router = useRouter();
  const [showUnconfigured, setShowUnconfigured] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, startSaving] = useTransition();
  const [activeModel, setActiveModel] = useState("");
  const [aiConfigured, setAiConfigured] = useState(false);
  const autoAnalyzedRef = useRef(false);

  // Step 1: Unstructured input
  const [project, setProject] = useState(defaultProject);
  const [rawText, setRawText] = useState("");

  // Step 2: Structured result
  const [title, setTitle] = useState(initialTitle);
  const [steps, setSteps] = useState(initialSteps);
  const [expected, setExpected] = useState(initialExpected);
  const [actual, setActual] = useState(initialActual);
  const [preconditions, setPreconditions] = useState(initialPreconditions);
  const [relatedItems, setRelatedItems] = useState(initialRelatedItems);
  const [severity, setSeverity] = useState("Major");
  const [bugType, setBugType] = useState("Functional");
  const [hasPreview, setHasPreview] = useState(Boolean(initialTitle || initialSteps));

  // Additional Feature states
  const [duplicates, setDuplicates] = useState<Array<{ id: number; title: string; similarityScore: number; matchReason: string }>>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [evidenceImage, setEvidenceImage] = useState("");

  const failureContext = [
    initialTitle ? `Test Case: ${initialTitle}` : "",
    initialSteps ? `Steps to Reproduce:\n${initialSteps}` : "",
    initialExpected ? `Expected Result:\n${initialExpected}` : "",
    initialActual ? `Actual Result / Failure Finding:\n${initialActual}` : "",
    initialPreconditions && initialPreconditions !== "-" ? `Preconditions: ${initialPreconditions}` : "",
  ].filter(Boolean).join("\n\n");

  const handleAnalyze = async (textOverride?: string) => {
    const proj = project.trim() || defaultProject.trim();
    if (!proj) {
      toast("Please specify a project before proceeding. Create a project first if none exist.", "warning");
      return;
    }

    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    const textToAnalyze = (textOverride ?? (rawText.trim() || failureContext)).trim();
    if (!textToAnalyze) {
      toast("Please enter bug notes or error text first", "warning");
      return;
    }

    if (!rawText.trim() && failureContext) setRawText(failureContext);

    setAnalyzing(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance_bug",
          payload: { title: textToAnalyze.slice(0, 80), rawText: textToAnalyze },
          ai: credentials,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to analyze bug text");

      const enhanced = json.data?.enhanced;
      if (enhanced) {
        setTitle(enhanced.title || textToAnalyze.slice(0, 60));
        setSteps(enhanced.stepsToReproduce || textToAnalyze);
        setExpected(enhanced.expectedResult || "System operates according to specification");
        setActual(
          enhanced.suspectedCause
            ? `${enhanced.actualResult}\n\n[Suspected Cause]: ${enhanced.suspectedCause}`
            : enhanced.actualResult || textToAnalyze
        );
        if (enhanced.suggestedSeverity) setSeverity(enhanced.suggestedSeverity);
        setHasPreview(true);
        saveAiSession("bug", {
          status: "completed",
          resultDraft: enhanced,
          inputPrompt: textToAnalyze,
          project: proj,
        });
        toast("Bug structured by AI! Review and save.", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "AI analysis failed", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      autoAnalyzedRef.current = false;
      return;
    }

    if (!initialTitle && !initialSteps && !initialExpected && !initialActual) {
      const draft = getFormDraft<{
        project?: string;
        rawText?: string;
        title?: string;
        steps?: string;
        expected?: string;
        actual?: string;
        severity?: string;
        bugType?: string;
        preconditions?: string;
        relatedItems?: string;
        hasPreview?: boolean;
      }>("quick_bug");

      if (draft) {
        if (draft.project) setProject(draft.project);
        if (draft.rawText) setRawText(draft.rawText);
        if (draft.title) setTitle(draft.title);
        if (draft.steps) setSteps(draft.steps);
        if (draft.expected) setExpected(draft.expected);
        if (draft.actual) setActual(draft.actual);
        if (draft.severity) setSeverity(draft.severity);
        if (draft.bugType) setBugType(draft.bugType);
        if (draft.preconditions) setPreconditions(draft.preconditions);
        if (draft.relatedItems) setRelatedItems(draft.relatedItems);
        if (draft.hasPreview) setHasPreview(draft.hasPreview);
      }
    }

    if (initialTitle) setTitle(initialTitle);
    if (initialSteps) setSteps(initialSteps);
    if (initialExpected) setExpected(initialExpected);
    if (initialActual) setActual(initialActual);
    if (initialPreconditions) setPreconditions(initialPreconditions);
    if (initialRelatedItems) setRelatedItems(initialRelatedItems);
    if (initialEvidence) setEvidenceImage(initialEvidence);
    if (defaultProject) setProject(defaultProject);
    if (initialTitle || initialSteps || initialEvidence) setHasPreview(true);

    const configured = isAiConfigured();
    const creds = getActiveAiCredentials();
    setActiveModel(creds.model || "Active AI");
    setAiConfigured(configured);

    const initialRaw = rawText.trim() || failureContext;
    if (!rawText.trim() && failureContext) setRawText(failureContext);

    if (autoAnalyze && !autoAnalyzedRef.current) {
      autoAnalyzedRef.current = true;
      if (!configured) {
        setShowUnconfigured(true);
      } else {
        handleAnalyze(initialRaw);
      }
    }
  }, [isOpen, initialTitle, initialSteps, initialExpected, initialActual, initialEvidence, defaultProject, initialPreconditions, initialRelatedItems, autoAnalyze]);

  useEffect(() => {
    if (!isOpen) return;
    if (rawText.trim() || title.trim() || steps.trim() || (project.trim() && project !== defaultProject)) {
      saveFormDraft("quick_bug", {
        project,
        rawText,
        title,
        steps,
        expected,
        actual,
        severity,
        bugType,
        preconditions,
        relatedItems,
        hasPreview,
      });
    }
  }, [isOpen, project, rawText, title, steps, expected, actual, severity, bugType, preconditions, relatedItems, hasPreview, defaultProject]);

  const handleAnalyzeImage = async (file: File) => {
    setAnalyzingImage(true);
    try {
      const compressed = await compressImageToWebp(file, { maxDimension: 1440, quality: 0.8 });
      setEvidenceImage(compressed.dataUrl);

      if (!isAiConfigured()) {
        toast("Screenshot attached as evidence! Configure AI in settings to enable auto-OCR.", "info");
        setHasPreview(true);
        return;
      }

      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_screenshot",
          payload: { imageBase64: compressed.dataUrl, mimeType: compressed.mimeType },
          ai: getActiveAiCredentials(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to analyze screenshot");

      const extracted = json.data;
      if (extracted) {
        if (extracted.title) setTitle(extracted.title);
        if (extracted.stepsToReproduce) setSteps(extracted.stepsToReproduce);
        if (extracted.expectedResult) setExpected(extracted.expectedResult);
        if (extracted.actualResult) {
          setActual(extracted.extractedText ? `${extracted.actualResult}\n\n[OCR Text]: ${extracted.extractedText}` : extracted.actualResult);
        }
        if (extracted.suggestedSeverity) setSeverity(extracted.suggestedSeverity);
        setHasPreview(true);
        toast("Screenshot analyzed, structured & attached as evidence!", "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Screenshot analysis failed", "error");
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleCheckDuplicates = async () => {
    const textToCheck = title.trim() || rawText.trim();
    if (!textToCheck) {
      toast("Please enter a title or notes first", "warning");
      return;
    }
    if (!isAiConfigured()) {
      setShowUnconfigured(true);
      return;
    }

    setCheckingDuplicates(true);
    try {
      const resBugs = await fetch("/api/items/bugs").then((r) => r.json()).catch(() => ({ data: [] }));
      const openBugs = ((resBugs.data as Array<{ id: number; title: string; status?: string }>) || [])
        .filter((b) => String(b.status || "").toLowerCase() !== "closed");

      const res = await fetch("/api/ai/qa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_duplicate_bugs",
          payload: { title: textToCheck, rawText, existingBugs: openBugs },
          ai: getActiveAiCredentials(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check duplicates");

      const found = json.data?.duplicates || [];
      setDuplicates(found);
      toast(found.length > 0 ? `Found ${found.length} potential duplicate bug(s)` : "No duplicates detected. Safe to file!", found.length > 0 ? "warning" : "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Duplicate check failed", "error");
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSaveBug = () => {
    const proj = project.trim() || defaultProject.trim();
    if (!proj) {
      toast("Please specify a project before saving. Create a project first if none exist.", "warning");
      return;
    }
    if (!title.trim()) {
      toast("Bug title is required.", "warning");
      return;
    }

    startSaving(async () => {
      const fd = new FormData();
      fd.append("project", proj);
      fd.append("module", "General");
      fd.append("bugType", bugType);
      fd.append("title", title.trim());
      fd.append("preconditions", preconditions.trim() || "-");
      fd.append("stepsToReproduce", steps.trim());
      fd.append("expectedResult", expected.trim());
      fd.append("actualResult", actual.trim());
      fd.append("severity", severity);
      fd.append("priority", severity === "Critical" ? "Critical" : "High");
      fd.append("status", "Open");
      if (relatedItems.trim()) fd.append("relatedItems", relatedItems.trim());
      if (evidenceImage) fd.append("evidence", evidenceImage);

      try {
        const res = await fetch("/api/items/bugs", { method: "POST", body: fd });
        if (res.ok) {
          clearAiSession("bug");
          clearFormDraft("quick_bug");
          toast("Bug created successfully with evidence!", "success");
          onClose();
          setRawText("");
          setEvidenceImage("");
          setHasPreview(false);
          router.refresh();
        } else {
          const errData = await res.json().catch(() => ({}));
          toast(errData.error || "Failed to save bug", "error");
        }
      } catch {
        toast("Network error saving bug", "error");
      }
    });
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        isBusy={analyzing || analyzingImage || saving}
        title="Quick Bug Capture (AI-Assisted)"
        description="Type or paste any messy bug notes, logs, or user reports. AI will instantly structure it into an engineering-grade ticket."
        maxWidth="xl"
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
            <Lightning size={18} weight="bold" />
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              {(rawText.trim() || title.trim() || steps.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    clearFormDraft("quick_bug");
                    clearAiSession("bug");
                    setRawText("");
                    setTitle("");
                    setSteps("");
                    setExpected("");
                    setActual("");
                    setPreconditions("-");
                    setRelatedItems("");
                    setEvidenceImage("");
                    setHasPreview(false);
                    toast("Draft cleared", "info");
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition underline underline-offset-2 px-1"
                >
                  Clear draft
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={analyzing}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                title="Re-run AI to structure notes into bug report"
              >
                <Sparkle size={14} weight="bold" className={cn(analyzing && "animate-spin")} />
                {analyzing ? "Structuring..." : hasPreview ? "Re-structure with AI" : "Structure Bug with AI"}
              </button>
              {hasPreview && (
                <button
                  type="button"
                  onClick={handleSaveBug}
                  disabled={saving || !title.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check size={14} weight="bold" />
                  {saving ? "Saving Bug..." : "Save Bug Report"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkle size={12} weight="fill" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700">AI Engine:</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-600/10 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-300/60">
                {activeModel || "Active AI"}
              </span>
            </div>
          </div>
          {aiConfigured ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowUnconfigured(true)}
              className="text-[10px] font-bold text-amber-700 hover:underline"
            >
              Configure AI
            </button>
          )}
        </div>

        <QuickBugFormContent
          project={project} setProject={setProject}
          rawText={rawText} setRawText={setRawText}
          title={title} setTitle={setTitle}
          severity={severity} setSeverity={setSeverity}
          bugType={bugType} setBugType={setBugType}
          steps={steps} setSteps={setSteps}
          expected={expected} setExpected={setExpected}
          actual={actual} setActual={setActual}
          analyzing={analyzing} analyzingImage={analyzingImage}
          checkingDuplicates={checkingDuplicates} duplicates={duplicates}
          hasPreview={hasPreview} evidenceImage={evidenceImage}
          setEvidenceImage={setEvidenceImage}
          handleAnalyzeImage={handleAnalyzeImage}
          handleCheckDuplicates={handleCheckDuplicates}
          activeModel={activeModel}
        />
      </ModalShell>

      <AiUnconfiguredModal
        isOpen={showUnconfigured}
        onClose={() => setShowUnconfigured(false)}
        featureName="Quick Bug AI Capture"
      />
    </>
  );
}
