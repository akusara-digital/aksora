"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checks, FolderPlus } from "@phosphor-icons/react";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

export type PlanOption = {
  id: number;
  title: string;
  project: string;
};

type QuickCreateSuiteModalProps = {
  isOpen: boolean;
  plans: PlanOption[];
  onClose: () => void;
  onCreated?: (suiteId: string) => void;
};

function QuickCreateSuiteForm({
  plans,
  onClose,
  onCreated,
}: Omit<QuickCreateSuiteModalProps, "isOpen">) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [testPlanId, setTestPlanId] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast("Suite name is required.", "error");
      return;
    }

    setSaving(true);
    try {
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

      toast("Test suite created.", "success");
      const newId = data?.data?.id != null ? String(data.data.id) : "";
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
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Test Plan (Optional)
          </label>
          <select
            value={testPlanId}
            onChange={(e) => setTestPlanId(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="">No plan linked</option>
            {plans.map((plan) => (
              <option key={plan.id} value={String(plan.id)}>
                {plan.project ? `${plan.project} — ${plan.title}` : plan.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "draft")}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Goal / Notes</label>
        <AutoResizeTextarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Scope or objective of this test suite..."
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
      description="Group related test cases together. Linking to a Test Plan is optional."
      icon={<FolderPlus size={18} weight="bold" />}
      maxWidth="md"
    >
      <QuickCreateSuiteForm
        plans={props.plans}
        onClose={props.onClose}
        onCreated={props.onCreated}
      />
    </ModalShell>
  );
}

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
