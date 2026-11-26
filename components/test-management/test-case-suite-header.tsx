"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/shared/badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ModalShell } from "@/components/ui/modal-shell";
import { toast } from "@/components/ui/toast";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  DotsThreeVertical,
  PencilSimple,
  Table,
  Plus,
  Play,
  ClockCounterClockwise,
  Trash,
  Check,
} from "@phosphor-icons/react";
import { AiGenerateCasesButton } from "@/components/test-management/ai-generate-cases-button";
import { CustomSelect } from "@/components/ui/custom-select";
import type { SuiteGroup } from "@/components/test-management/test-case-table";

interface TestCaseSuiteHeaderProps {
  selected: SuiteGroup;
  onAddCase: () => void;
  onRunSuite: () => void;
  startingRun?: boolean;
}

export function TestCaseSuiteHeader({
  selected,
  onAddCase,
  onRunSuite,
  startingRun = false,
}: TestCaseSuiteHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editTitle, setEditTitle] = useState(selected.suiteTitle || "");
  const [editStatus, setEditStatus] = useState(selected.suiteStatus || "Active");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const targetSuiteId =
    selected.suiteId ||
    selected.cases[0]?.testSuiteId ||
    (selected.key !== "unassigned" ? selected.key : null);

  useEffect(() => {
    setEditTitle(selected.suiteTitle || "");
    setEditStatus(selected.suiteStatus || "Active");
  }, [selected]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSuiteId) return;
    if (!editTitle.trim()) {
      setEditError("Suite title is required.");
      return;
    }
    setSubmittingEdit(true);
    setEditError(null);

    try {
      const res = await fetch("/api/items/test-suites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetSuiteId,
          entry: {
            title: editTitle.trim(),
            status: editStatus,
          },
          title: editTitle.trim(),
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update test suite");
      }

      toast("Test suite updated successfully", "success");
      setShowEditModal(false);
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update test suite.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSuite = async () => {
    if (!targetSuiteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/test-suites?id=${targetSuiteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete test suite");
      }
      toast("Test suite deleted successfully", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete test suite", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const suiteIdentifier = selected.suiteToken || selected.key;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
      <div className="min-w-0">
        {selected.planProject && (
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-500">
            {selected.planProject}
            {selected.planTitle ? ` · ${selected.planTitle}` : ""}
          </p>
        )}
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-bold text-gray-900">
            {selected.suiteTitle}
          </h2>
          {selected.suiteStatus && <Badge value={selected.suiteStatus} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-gray-400">
          <span className="flex items-center gap-1">
            <CheckCircle size={13} className="text-emerald-500" />
            {selected.passed}
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={13} className="text-rose-500" />
            {selected.failed}
          </span>
          <span className="flex items-center gap-1">
            <Warning size={13} className="text-amber-500" />
            {selected.blocked}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} className="text-gray-400" />
            {selected.pending}
          </span>
        </div>

        {/* Instant Run Suite button */}
        <button
          type="button"
          onClick={onRunSuite}
          disabled={startingRun}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
          title="Start execution run for this suite immediately"
        >
          <Play size={14} weight="bold" />
          {startingRun ? "Starting..." : "Run Suite"}
        </button>

        <button
          type="button"
          onClick={onAddCase}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm"
        >
          <Plus size={14} weight="bold" />
          Add Case
        </button>

        <AiGenerateCasesButton
          suiteId={String(selected.cases[0]?.testSuiteId || selected.key || "")}
          suiteLabel={selected.suiteTitle}
          existingCases={selected.cases}
        />

        {suiteIdentifier && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Open test case menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-50"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-11 z-20 w-56 rounded-md border border-gray-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRunSuite();
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Play size={16} weight="bold" />
                  Run Suite Now
                </button>
                <Link
                  href={`/test-execution/${suiteIdentifier}`}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ClockCounterClockwise size={16} weight="bold" />
                  Run History
                </Link>
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setEditTitle(selected.suiteTitle || "");
                    setEditStatus(selected.suiteStatus || "Active");
                    setShowEditModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                >
                  <PencilSimple size={16} weight="bold" />
                  Rename / Edit Suite
                </button>
                <Link
                  href={`/test-cases/${suiteIdentifier}`}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <PencilSimple size={16} weight="bold" />
                  Edit Test Cases
                </Link>
                {selected.suiteToken && (
                  <Link
                    href={`/test-suites/${selected.suiteToken}`}
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Table size={16} weight="bold" />
                    Open Suite Detail
                  </Link>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 cursor-pointer"
                >
                  <Trash size={16} weight="bold" />
                  Delete Suite
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit / Rename Suite Modal */}
      <ModalShell
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit / Rename Suite"
        description="Update the title and status of this test suite."
        icon={<PencilSimple size={20} weight="bold" className="text-blue-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {editError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Suite Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                if (editError) setEditError(null);
              }}
              placeholder="e.g. Authentication & Authorization"
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Status</label>
            <CustomSelect
              value={editStatus}
              onChange={setEditStatus}
              options={[
                { value: "Active", label: "Active", dot: "bg-emerald-500" },
                { value: "Draft", label: "Draft", dot: "bg-slate-400" },
                { value: "Completed", label: "Completed", dot: "bg-blue-500" },
                { value: "Archived", label: "Archived", dot: "bg-amber-500" },
              ]}
              className="h-10 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={submittingEdit}
              className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEdit || !editTitle.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} weight="bold" />
              {submittingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* Delete Suite Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={`Delete Test Suite: ${selected.suiteTitle}`}
        message="Are you sure you want to delete this test suite? All test cases inside this suite will also be deleted. This action cannot be undone."
        type="danger"
        confirmText={deleting ? "Deleting..." : "Delete Suite"}
        cancelText="Cancel"
        onConfirm={handleDeleteSuite}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
