"use client";

import { useState, useEffect } from "react";
import { Lightning, Plus, Trash, Check, X, ShieldCheck, ArrowRight, Gear } from "@phosphor-icons/react";
import { PageShell } from "@/components/layout/page-shell";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Rule {
  id: number;
  name: string;
  module: string;
  triggerField: string;
  triggerValue: string;
  actionType: string;
  actionValue: string;
  active: number;
}

export default function AutomationSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [module, setModule] = useState<"tasks" | "bugs">("tasks");
  const [triggerField, setTriggerField] = useState("status");
  const [triggerValue, setTriggerValue] = useState("review");
  const [actionType, setActionType] = useState<"assign" | "status" | "webhook">("assign");
  const [actionValue, setActionValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  const loadRules = async () => {
    try {
      const res = await fetch("/api/settings/automation");
      const data = await res.json();
      setRules(data.rules || []);
    } catch {
      toast("Failed to load automation rules", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleActive = async (rule: Rule) => {
    const nextActive = rule.active === 1 ? 0 : 1;
    try {
      const res = await fetch("/api/settings/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: nextActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, active: nextActive } : r))
      );
      toast(nextActive === 1 ? `Rule "${rule.name}" activated` : `Rule "${rule.name}" paused`, "info");
    } catch {
      toast("Failed to toggle rule state", "error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !actionValue.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          module,
          triggerField,
          triggerValue: triggerValue.trim(),
          actionType,
          actionValue: actionValue.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      toast("Automation rule created!", "success");
      setModalOpen(false);
      setName("");
      setActionValue("");
      loadRules();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error creating rule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/settings/automation?id=${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast("Rule deleted", "success");
    } catch {
      toast("Failed to delete rule", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const crumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Automation Rules" },
  ];

  return (
    <PageShell
      icon={<Lightning size={22} weight="bold" />}
      title="Automation Rules"
      description="Automate repetitive QA and engineering workflows: auto-assign teammates, update item status, or trigger webhooks."
      crumbs={crumbs}
      actions={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Plus size={14} weight="bold" />
          <span>New Rule</span>
        </button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Lightning size={24} weight="bold" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800">No automation rules configured yet</h4>
            <p className="mt-1 max-w-sm mx-auto text-xs text-slate-500">
              Create rules to automatically route tasks and bugs to designated teammates or endpoints when status changes.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus size={14} weight="bold" />
              <span>Create First Rule</span>
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Configured Triggers & Actions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Rule Name</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Condition (When)</th>
                    <th className="px-6 py-3">Action (Then)</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rules.map((rule) => {
                    const isActive = rule.active === 1;
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            title={isActive ? "Click to pause rule" : "Click to activate rule"}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              isActive ? "bg-blue-600" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                isActive ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{rule.name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {rule.module}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-500">When </span>
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                            {rule.triggerField}
                          </span>
                          <span className="text-slate-500"> equals </span>
                          <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {rule.triggerValue}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {rule.actionType === "assign" ? (
                            <span>
                              Assign &rarr; <strong>{rule.actionValue}</strong>
                            </span>
                          ) : rule.actionType === "status" ? (
                            <span>
                              Set Status &rarr; <strong className="text-emerald-700">{rule.actionValue}</strong>
                            </span>
                          ) : (
                            <span className="truncate max-w-xs inline-block font-mono text-[11px] text-slate-600">
                              Webhook &rarr; {rule.actionValue}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(rule)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                          >
                            <Trash size={14} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900">Create Automation Rule</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automate assignments or triggers on status changes.</p>
            <form onSubmit={handleCreate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Rule Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auto-assign QA on Code Review"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Target Module</label>
                  <select
                    value={module}
                    onChange={(e) => {
                      const next = e.target.value as "tasks" | "bugs";
                      setModule(next);
                      if (next === "bugs" && triggerField === "category") setTriggerField("status");
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none"
                  >
                    <option value="tasks">Tasks</option>
                    <option value="bugs">Bugs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">When Field...</label>
                  <select
                    value={triggerField}
                    onChange={(e) => setTriggerField(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none"
                  >
                    <option value="status">status</option>
                    <option value="priority">priority</option>
                    {module === "bugs" && <option value="severity">severity</option>}
                    <option value="category">category</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">...Equals Value</label>
                <input
                  required
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="e.g. review, Resolved, High, or critical"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as "assign" | "status" | "webhook")}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none"
                >
                  <option value="assign">Auto-Assign (Assignee / Suggested Dev)</option>
                  <option value="status">Auto-Update Status</option>
                  <option value="webhook">Send Outbound Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {actionType === "assign"
                    ? "Assignee Email or Name"
                    : actionType === "status"
                    ? "Target Status Value"
                    : "Webhook URL (HTTPS)"}
                </label>
                <input
                  required
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder={
                    actionType === "assign"
                      ? "e.g. qa@company.com or Wahyu"
                      : actionType === "status"
                      ? "e.g. Ready for Test or Closed"
                      : "https://your-server.com/webhook"
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Automation Rule"
        message={`Are you sure you want to delete the rule "${deleteTarget?.name}"? Automatic triggers for this rule will stop immediately.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
