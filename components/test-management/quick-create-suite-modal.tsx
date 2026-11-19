"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus, Trash, CaretDown, CaretUp } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

export type PlanOption = {
  id: number;
  title: string;
  project: string;
};

export type QuickCreateSuiteModalProps = {
  isOpen: boolean;
  plans: PlanOption[];
  defaultProject?: string;
  onClose: () => void;
  onCreated?: (suiteId: string) => void;
};

type InitialCaseItem = {
  id: string;
  caseName: string;
  typeCase: "Positive" | "Negative";
  expectedResult: string;
};

export function QuickCreateSuiteForm({
  plans,
  defaultProject,
  onClose,
  onCreated,
}: Omit<QuickCreateSuiteModalProps, "isOpen">) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const availablePlans = defaultProject
    ? plans.filter((p) => p.project.toLowerCase() === defaultProject.toLowerCase())
    : plans;
  const [testPlanId, setTestPlanId] = useState(() =>
    availablePlans.length === 1 ? String(availablePlans[0].id) : "",
  );
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Fast-track initial test cases state
  const [showInitialCases, setShowInitialCases] = useState(false);
  const [initialCases, setInitialCases] = useState<InitialCaseItem[]>([
    { id: "case-1", caseName: "", typeCase: "Positive", expectedResult: "" },
  ]);

  const addInitialCaseRow = () => {
    if (initialCases.length >= 8) {
      toast("Maximum 8 initial cases at once. You can add more later in the table.", "info");
      return;
    }
    setInitialCases((prev) => [
      ...prev,
      { id: `case-${Date.now()}-${prev.length}`, caseName: "", typeCase: "Positive", expectedResult: "" },
    ]);
  };

  const removeInitialCaseRow = (id: string) => {
    setInitialCases((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  const updateInitialCase = (id: string, field: keyof InitialCaseItem, val: string) => {
    setInitialCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast("Suite name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      // 1. Create Suite
      const res = await fetch("/api/items/test-suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          testPlanId: testPlanId || "",
          status,
          notes: notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed to create test suite.", "error");
        return;
      }

      const newId = data?.data?.id != null ? String(data.data.id) : "";

      // 2. Fast-track initial cases creation
      const validCases = initialCases.filter((c) => c.caseName.trim().length > 0);
      let createdCasesCount = 0;

      if (newId && validCases.length > 0) {
        for (let i = 0; i < validCases.length; i++) {
          const item = validCases[i];
          const tcId = `TC-${String(i + 1).padStart(3, "0")}`;
          try {
            const caseRes = await fetch("/api/items/test-cases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                testSuiteId: newId,
                tcId,
                caseName: item.caseName.trim(),
                typeCase: item.typeCase,
                priority: "Medium",
                status: "Pending",
                testStep: "1. Follow test specifications and verification checklist",
                expectedResult: item.expectedResult.trim() || "Passes acceptance criteria",
                preCondition: "Application deployed in QA / Staging environment",
              }),
            });
            if (caseRes.ok) createdCasesCount++;
          } catch {
            // non-fatal, continue with other cases
          }
        }
      }

      if (createdCasesCount > 0) {
        toast(`Test suite created with ${createdCasesCount} initial test case(s).`, "success");
      } else {
        toast("Test suite created.", "success");
      }

      onClose();
      if (newId) onCreated?.(newId);
      router.refresh();
    } catch {
      toast("Failed to create test suite.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Suite Name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Authentication & Login Flow"
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      <div className={plans.length > 0 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-3"}>
        {plans.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Test Plan (Optional)
            </label>
            <select
              value={testPlanId}
              onChange={(e) => setTestPlanId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="">No plan linked</option>
              {(availablePlans.length > 0 ? availablePlans : plans).map((plan) => (
                <option key={plan.id} value={String(plan.id)}>
                  {plan.project ? `${plan.project} — ${plan.title}` : plan.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "draft")}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Goal / Notes</label>
        <AutoResizeTextarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scope or objective of this test suite..."
        />
      </div>

      {/* Fast-Track Initial Test Cases Accordion */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <button
          type="button"
          onClick={() => setShowInitialCases((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Add Initial Test Cases (Optional)
            </span>
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
              Fast-Track
            </span>
          </div>
          {showInitialCases ? (
            <CaretUp size={14} className="text-slate-500" />
          ) : (
            <CaretDown size={14} className="text-slate-500" />
          )}
        </button>

        {showInitialCases && (
          <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-200/70">
            <p className="text-[11px] text-slate-500">
              Create suite and seed initial cases simultaneously without extra page hops.
            </p>
            {initialCases.map((tc, idx) => (
              <div key={tc.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 font-mono w-6 text-center shrink-0">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="e.g. Verify login with valid credentials"
                  value={tc.caseName}
                  onChange={(e) => updateInitialCase(tc.id, "caseName", e.target.value)}
                  className="h-8 flex-1 w-full text-xs rounded border border-slate-200 px-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
                <select
                  value={tc.typeCase}
                  onChange={(e) => updateInitialCase(tc.id, "typeCase", e.target.value as "Positive" | "Negative")}
                  className="h-8 w-24 text-xs rounded border border-slate-200 px-1.5 text-slate-700 outline-none"
                >
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                </select>
                <input
                  type="text"
                  placeholder="Expected result (optional)"
                  value={tc.expectedResult}
                  onChange={(e) => updateInitialCase(tc.id, "expectedResult", e.target.value)}
                  className="h-8 flex-1 w-full text-xs rounded border border-slate-200 px-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
                {initialCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInitialCaseRow(tc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remove case"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addInitialCaseRow}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 pt-1"
            >
              <Plus size={13} weight="bold" />
              Add another test case
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="h-9 cursor-pointer rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-9 cursor-pointer rounded-md bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Suite"}
        </button>
      </div>
    </form>
  );
}

export function QuickCreateSuiteModal(props: QuickCreateSuiteModalProps) {
  if (!props.isOpen) return null;
  return (
    <ModalShell
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="New Test Suite"
      description="Group related test cases together. Seed initial test cases or link to a plan."
      icon={<FolderPlus size={18} weight="bold" />}
      maxWidth="lg"
    >
      <QuickCreateSuiteForm
        plans={props.plans}
        defaultProject={props.defaultProject}
        onClose={props.onClose}
        onCreated={props.onCreated}
      />
    </ModalShell>
  );
}
