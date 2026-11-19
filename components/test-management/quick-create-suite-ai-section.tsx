"use client";

import { useState } from "react";
import { Sparkle, CircleNotch, Faders, Check } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { isAiConfigured, getActiveAiCredentials } from "@/lib/ai-keys";

export type InitialCaseItem = {
  id: string;
  caseName: string;
  typeCase: "Positive" | "Negative";
  priority: "Critical" | "High" | "Medium" | "Low";
  expectedResult: string;
  preCondition?: string;
  testStep?: string;
};

interface QuickCreateSuiteAiSectionProps {
  suiteTitle: string;
  suiteNotes?: string;
  selectedPlanTitle?: string;
  selectedProject?: string;
  existingCount: number;
  onGenerated: (cases: InitialCaseItem[]) => void;
  onRequestUnconfigured: () => void;
}

export function QuickCreateSuiteAiSection({
  suiteTitle,
  suiteNotes,
  selectedPlanTitle,
  selectedProject,
  existingCount,
  onGenerated,
  onRequestUnconfigured,
}: QuickCreateSuiteAiSectionProps) {
  const [focusArea, setFocusArea] = useState("");
  const [caseCount, setCaseCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!suiteTitle.trim()) {
      toast("Please enter a Suite Name above first to guide the AI.", "warning");
      return;
    }

    if (!isAiConfigured()) {
      onRequestUnconfigured();
      return;
    }

    setIsGenerating(true);
    try {
      const credentials = getActiveAiCredentials();
      const res = await fetch("/api/ai/suite-to-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suite: {
            title: suiteTitle.trim(),
            notes: suiteNotes?.trim() || "",
            planTitle: selectedPlanTitle || "",
            project: selectedProject || "",
            focusArea: focusArea.trim() || undefined,
            count: caseCount,
          },
          ai: credentials,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate test cases.");
      }

      const generated = (json?.data?.testCases || []) as Array<{
        caseName: string;
        typeCase: "Positive" | "Negative";
        priority?: "Critical" | "High" | "Medium" | "Low";
        expectedResult: string;
        preCondition?: string;
        testStep?: string;
      }>;

      if (generated.length === 0) {
        toast("No test cases generated. Please add more details to Suite Name or Notes.", "warning");
        return;
      }

      const formatted: InitialCaseItem[] = generated.map((c, i) => ({
        id: `ai-case-${Date.now()}-${i}`,
        caseName: c.caseName,
        typeCase: c.typeCase === "Negative" ? "Negative" : "Positive",
        priority: c.priority || "Medium",
        expectedResult: c.expectedResult || "Passes expected criteria",
        preCondition: c.preCondition || "Application is deployed in QA / Staging environment",
        testStep: c.testStep || "1. Perform action\n2. Verify outcome",
      }));

      onGenerated(formatted);
      toast(`Generated ${formatted.length} test cases with QA Copilot.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate test cases.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-3.5 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white shadow-xs">
            <Sparkle size={15} weight="bold" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">QA Copilot Generator</h4>
            <p className="text-[11px] text-slate-500">
              Auto-generate structured test cases from suite name & scope notes.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
          AI Assisted
        </span>
      </div>

      <div className="space-y-2 pt-1">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
            Focus Area / Custom Scenarios (Optional)
          </label>
          <input
            type="text"
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder="e.g. Happy path, edge cases, validation errors, rate limits..."
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
              <Faders size={13} weight="bold" /> Cases:
            </span>
            {[3, 5, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setCaseCount(count)}
                className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  caseCount === count
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !suiteTitle.trim()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkle size={14} weight="bold" />
                {existingCount > 0 ? "Regenerate with AI" : "Generate with QA Copilot"}
              </>
            )}
          </button>
        </div>

        {!suiteTitle.trim() && (
          <p className="text-[11px] text-amber-600 font-medium">
            * Please enter a Suite Name above first so QA Copilot can understand the scope.
          </p>
        )}
      </div>
    </div>
  );
}
