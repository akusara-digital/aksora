"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Funnel,
  Plus,
  X,
  Table,
  Kanban,
  ClipboardText,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  TestPlanKanbanBoard,
  type TestPlanItem,
} from "@/components/test-management/test-plan-kanban-board";
import { TestPlanTable } from "@/components/test-management/test-plan-table";
import { QuickTestPlanModal } from "@/components/test-management/quick-test-plan-modal";

export interface TestPlanLibraryProps {
  plans: TestPlanItem[];
  projectOptions?: string[];
  initialSearch?: string;
  hideToolbarAction?: boolean;
}

const ALL = "All";

export function TestPlanLibrary({
  plans,
  projectOptions = [],
  initialSearch = "",
  hideToolbarAction = false,
}: TestPlanLibraryProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [filterProject, setFilterProject] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlanItem | null>(null);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterProject !== ALL && p.project !== filterProject) return false;
      if (filterStatus !== ALL) {
        const pStatus = String(p.status || "draft").toLowerCase().replace(/\s+/g, "_");
        const fStatus = filterStatus.toLowerCase().replace(/\s+/g, "_");
        if (pStatus !== fStatus) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.project.toLowerCase().includes(q) ||
          (p.sprint?.toLowerCase().includes(q) ?? false) ||
          (p.scope?.toLowerCase().includes(q) ?? false) ||
          (p.assignee?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [plans, filterProject, filterStatus, search]);

  const allProjects = useMemo(() => {
    const set = new Set<string>(projectOptions);
    plans.forEach((p) => {
      if (p.project) set.add(p.project);
    });
    return Array.from(set).sort();
  }, [plans, projectOptions]);

  useEffect(() => {
    const handleOpenPlan = () => {
      setEditingPlan(null);
      setShowModal(true);
    };
    window.addEventListener("qa:open-new-plan", handleOpenPlan);
    window.addEventListener("qa:open-form", handleOpenPlan);
    return () => {
      window.removeEventListener("qa:open-new-plan", handleOpenPlan);
      window.removeEventListener("qa:open-form", handleOpenPlan);
    };
  }, []);

  const handleStatusChange = async (planId: number, nextStatus: string) => {
    try {
      const res = await fetch("/api/items/test-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planId, status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      toast(`Test plan status updated to ${nextStatus}`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update status", "error");
    }
  };

  const handleDeletePlan = async (plan: TestPlanItem) => {
    if (!window.confirm(`Are you sure you want to delete test plan "${plan.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/items/test-plans?id=${plan.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete plan");
      }
      toast(`Test plan "${plan.title}" deleted.`, "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete plan", "error");
    }
  };

  const handleRunPlan = async (plan: TestPlanItem) => {
    const suites = plan.suites || [];
    if (suites.length === 0) {
      toast("This plan has no test suites assigned yet. Assign suites first.", "info");
      router.push(`/test-plans/${plan.publicToken || plan.id}`);
      return;
    }

    try {
      const targetSuite = suites[0];
      const res = await fetch("/api/execution-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSuiteId: targetSuite.id,
          testPlanId: String(plan.id),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || "Failed to start execution run");
      }
      toast(`Execution run #${d.data?.runNumber || ""} started for ${targetSuite.title}. Redirecting...`, "success");
      const token = targetSuite.publicToken || targetSuite.id;
      router.push(`/test-execution/${token}/run/${d.data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start run", "error");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/60 pb-3">
        {/* Left: View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-8 items-center border border-gray-200 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-full px-3 text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50",
              )}
              title="Table View"
            >
              <span className="inline-flex items-center gap-1">
                <Table size={13} weight="bold" />
                <span className="hidden sm:inline">Table</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "h-full border-l border-gray-200 px-3 text-[12px] font-medium transition-colors cursor-pointer",
                viewMode === "kanban"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 hover:bg-gray-50",
              )}
              title="Kanban Board"
            >
              <span className="inline-flex items-center gap-1">
                <Kanban size={13} weight="bold" />
                <span className="hidden sm:inline">Kanban</span>
              </span>
            </button>
          </div>
        </div>

        {/* Right: Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Funnel size={13} weight="bold" />
            Filters
          </span>

          {/* Project Filter */}
          {allProjects.length > 0 && (
            <div className="relative">
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className={cn(
                  "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition max-w-[140px] sm:max-w-none truncate touch-manipulation cursor-pointer",
                  filterProject !== ALL
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                )}
              >
                <option value={ALL}>All Projects</option>
                {allProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cn(
                "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition touch-manipulation cursor-pointer",
                filterStatus !== ALL
                  ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
              )}
            >
              <option value={ALL}>All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {(filterProject !== ALL || filterStatus !== ALL) && (
            <button
              type="button"
              onClick={() => {
                setFilterProject(ALL);
                setFilterStatus(ALL);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
            >
              <X size={11} weight="bold" />
              Clear
            </button>
          )}

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <span className="text-xs font-medium text-gray-400 hidden sm:inline">
            {filteredPlans.length} plan{filteredPlans.length === 1 ? "" : "s"}
          </span>

          {!hideToolbarAction && (
            <button
              type="button"
              onClick={() => {
                setEditingPlan(null);
                setShowModal(true);
              }}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 shadow-2xs"
            >
              <Plus size={14} weight="bold" />
              <span>New Test Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200/80 bg-gray-50/50 p-4 min-h-[550px]">
          <TestPlanKanbanBoard
            plans={filteredPlans}
            onSelectPlan={(plan) => router.push(`/test-plans/${plan.publicToken || plan.id}`)}
            onEditPlan={(plan) => {
              setEditingPlan(plan);
              setShowModal(true);
            }}
            onDeletePlan={handleDeletePlan}
            onAddPlan={() => {
              setEditingPlan(null);
              setShowModal(true);
            }}
            onStatusChange={handleStatusChange}
            onRunPlan={handleRunPlan}
          />
        </div>
      ) : (
        <TestPlanTable
          plans={filteredPlans}
          onSelectPlan={(plan) => router.push(`/test-plans/${plan.publicToken || plan.id}`)}
          onEditPlan={(plan) => {
            setEditingPlan(plan);
            setShowModal(true);
          }}
          onDeletePlan={handleDeletePlan}
          onRunPlan={handleRunPlan}
        />
      )}

      {/* Quick Test Plan Modal (Dual-Mode: AI / Manual) */}
      <QuickTestPlanModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPlan(null);
        }}
        defaultProject={filterProject !== ALL ? filterProject : undefined}
        projectOptions={allProjects}
        initialData={editingPlan ? (editingPlan as unknown as Record<string, unknown>) : null}
      />
    </div>
  );
}
