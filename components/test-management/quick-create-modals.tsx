"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checks } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

export {
  QuickCreateSuiteModal,
  QuickCreateSuiteForm,
  type PlanOption,
  type QuickCreateSuiteModalProps,
} from "./quick-create-suite-modal";

type QuickCreateCaseModalProps = {
  isOpen: boolean;
  suiteId: string;
  suiteTitle: string;
  suggestedTcId: string;
  onClose: () => void;
};

function QuickCreateCaseForm({
  suiteId,
  suggestedTcId,
  onClose,
}: Omit<QuickCreateCaseModalProps, "isOpen" | "suiteTitle">) {
  const router = useRouter();
  const [tcId, setTcId] = useState(suggestedTcId);
  const [caseName, setCaseName] = useState("");
  const [typeCase, setTypeCase] = useState<"Positive" | "Negative">("Positive");
  const [priority, setPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [preCondition, setPreCondition] = useState("");
  const [testStep, setTestStep] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseName.trim() || !testStep.trim() || !expectedResult.trim()) {
      toast("Case name, steps, and expected result are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/items/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSuiteId: suiteId,
          tcId: tcId.trim() || suggestedTcId,
          caseName: caseName.trim(),
          typeCase,
          priority,
          preCondition: preCondition.trim(),
          testStep: testStep.trim(),
          expectedResult: expectedResult.trim(),
          status: "Pending",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed to create test case.", "error");
        return;
      }

      toast("Test case added.", "success");
      onClose();
      router.refresh();
    } catch {
      toast("Failed to create test case.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Case ID <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={tcId}
            onChange={(e) => setTcId(e.target.value)}
            placeholder="TC-001"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Test Case Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            placeholder="e.g. User signs in with valid credentials"
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Type</label>
          <select
            value={typeCase}
            onChange={(e) => setTypeCase(e.target.value as "Positive" | "Negative")}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "Critical" | "High" | "Medium" | "Low")}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Pre-condition</label>
        <input
          type="text"
          value={preCondition}
          onChange={(e) => setPreCondition(e.target.value)}
          placeholder="e.g. Active user account exists"
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Test Steps <span className="text-rose-500">*</span>
        </label>
        <AutoResizeTextarea
          rows={3}
          required
          value={testStep}
          onChange={(e) => setTestStep(e.target.value)}
          placeholder={"1. Open /login\n2. Enter valid email and password\n3. Click Sign In"}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Expected Result <span className="text-rose-500">*</span>
        </label>
        <AutoResizeTextarea
          rows={2}
          required
          value={expectedResult}
          onChange={(e) => setExpectedResult(e.target.value)}
          placeholder="User is redirected to /dashboard"
        />
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
          {saving ? "Adding..." : "Add Test Case"}
        </button>
      </div>
    </form>
  );
}

export function QuickCreateCaseModal(props: QuickCreateCaseModalProps) {
  if (!props.isOpen) return null;
  return (
    <ModalShell
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="New Test Case"
      description={`Adding to suite: ${props.suiteTitle}`}
      icon={<Checks size={18} weight="bold" />}
      maxWidth="lg"
    >
      <QuickCreateCaseForm
        suiteId={props.suiteId}
        suggestedTcId={props.suggestedTcId}
        onClose={props.onClose}
      />
    </ModalShell>
  );
}
