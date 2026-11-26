"use client";

import { useState } from "react";
import { Trash, WarningCircle, X } from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";

interface WorkspaceDangerZoneProps {
  companyName: string;
}

export function WorkspaceDangerZone({ companyName }: WorkspaceDangerZoneProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmCompanyName, setConfirmCompanyName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmCompanyName !== companyName) {
      toast("Company name confirmation does not match", "error");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/settings/workspace/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmCompanyName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete workspace data");
      toast("Workspace data deleted successfully", "success");
      setDeleteModalOpen(false);
      window.location.href = "/login";
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete workspace", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-rose-900">Danger Zone</h3>
            <p className="text-xs text-rose-700">Irreversible actions that affect all workspace data and membership records.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg border border-rose-200">
          <div>
            <h4 className="text-xs font-bold text-slate-900">Delete Workspace &amp; All Data</h4>
            <p className="text-xs text-slate-500 mt-0.5">Permanently erase tasks, bugs, test plans, test suites, test cases, and memberships.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmCompanyName("");
              setDeleteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shrink-0"
          >
            <Trash size={14} weight="bold" />
            <span>Delete Workspace Data</span>
          </button>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <WarningCircle size={20} className="text-rose-600" weight="fill" />
                Confirm Workspace Deletion
              </h3>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action is <strong>permanent and irreversible</strong>. All tasks, bugs, test suites, test cases, and membership associations for <strong>{companyName}</strong> will be wiped.
            </p>

            <form onSubmit={handleDeleteWorkspace} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Type <span className="font-mono text-rose-600">{companyName}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmCompanyName}
                  onChange={(e) => setConfirmCompanyName(e.target.value)}
                  placeholder={companyName}
                  className="w-full h-10 rounded-lg border border-rose-200 bg-rose-50/30 px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || confirmCompanyName !== companyName}
                  className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 transition"
                >
                  {deleteLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
