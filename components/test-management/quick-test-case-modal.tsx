"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { TestCaseModalHeader } from "./test-case-modal-header";
import { AiTestCaseAgentContent, type TestCaseDraft } from "./ai-test-case-agent-content";
import { StreamlinedTestCaseForm } from "./streamlined-test-case-form";

export interface QuickTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  suiteId?: string;
  suiteTitle?: string;
  project?: string;
  projectOptions?: Array<{ label: string; value: string }>;
  suiteOptions?: Array<{ label: string; value: string; project?: string }>;
  suggestedTcId?: string;
  initialData?: Record<string, unknown> | null;
  onCreated?: (caseId: string | number) => void;
}

export function QuickTestCaseModal({
  isOpen,
  onClose,
  suiteId = "",
  suiteTitle = "",
  project = "",
  projectOptions = [],
  suiteOptions = [],
  suggestedTcId = "TC-001",
  initialData = null,
  onCreated,
}: QuickTestCaseModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">(initialData ? "manual" : "ai");
  const [selectedProject, setSelectedProject] = useState(project);
  const [selectedSuite, setSelectedSuite] = useState(suiteId);
  const [manualDraft, setManualDraft] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) setSelectedProject(project);
  }, [project]);

  useEffect(() => {
    if (suiteId) setSelectedSuite(suiteId);
  }, [suiteId]);

  useEffect(() => {
    if (initialData) {
      setMode("manual");
      setManualDraft(initialData);
    } else {
      setManualDraft(null);
    }
  }, [initialData]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSwitchToManual = (draft: TestCaseDraft) => {
    setManualDraft((prev) => ({
      ...(prev || {}),
      ...draft,
    }));
    setMode("manual");
  };

  const handleSubmit = async (entry: Record<string, unknown>, createAnother?: boolean) => {
    setPending(true);
    try {
      const isEditing = Boolean(initialData?.id || entry.id);
      const url = "/api/items/test-cases";
      const method = isEditing ? "PATCH" : "POST";

      const fallbackSuiteTitle =
        suiteTitle ||
        (selectedProject ? `${selectedProject} Test Suite` : "General Test Suite");

      const finalSuiteId =
        entry.testSuiteId ||
        selectedSuite ||
        suiteId ||
        suiteOptions[0]?.value ||
        "";

      const finalId = isEditing ? (initialData?.id || entry.id) : undefined;
      const caseTitle = String(entry.caseName || entry.title || "Test Case");
      const payload: Record<string, unknown> = {
        ...entry,
        testSuiteId: finalSuiteId ? String(finalSuiteId) : undefined,
        suiteTitle: String(entry.suiteTitle || fallbackSuiteTitle),
        project: selectedProject || entry.project || undefined,
      };
      if (finalId) {
        payload.id = finalId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { id: finalId, entry: payload } : payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save test case.");
      }

      toast(
        isEditing
          ? `Test case "${caseTitle}" updated.`
          : `Test case "${caseTitle}" created.`,
        "success",
      );

      if (onCreated && data.data?.id) {
        onCreated(data.data.id);
      }

      router.refresh();

      if (!createAnother) {
        onClose();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save test case.", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
        onClick={onClose}
      />

      {/* Modal Dialog Panel */}
      <div
        ref={modalRef}
        className="relative flex max-h-[92vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100"
      >
        <TestCaseModalHeader
          title={initialData ? "Edit Test Case" : "New Test Case"}
          project={selectedProject}
          onProjectChange={setSelectedProject}
          projectOptions={projectOptions}
          suiteTitle={
            suiteTitle ||
            (suiteOptions.length === 0
              ? selectedProject
                ? `${selectedProject} Test Suite`
                : "General Test Suite"
              : "")
          }
          suiteId={selectedSuite}
          onSuiteChange={setSelectedSuite}
          suiteOptions={suiteOptions}
          mode={mode}
          onModeChange={setMode}
          onClose={onClose}
          isEditing={Boolean(initialData)}
        />

        <div className="overflow-y-auto">
          {mode === "ai" && !initialData ? (
            <AiTestCaseAgentContent
              projectOptions={projectOptions}
              defaultProject={selectedProject}
              selectedProject={selectedProject}
              selectedSuiteId={selectedSuite}
              onSwitchToManual={handleSwitchToManual}
              onDirectSubmit={(entry, another) => handleSubmit(entry, another)}
              onCancel={onClose}
              pending={pending}
            />
          ) : (
            <StreamlinedTestCaseForm
              projectOptions={projectOptions}
              defaultProject={selectedProject}
              selectedProject={selectedProject}
              suiteOptions={suiteOptions}
              selectedSuiteId={selectedSuite}
              onSuiteChange={setSelectedSuite}
              initialData={manualDraft || initialData}
              suggestedTcId={suggestedTcId}
              pending={pending}
              onCancel={onClose}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
