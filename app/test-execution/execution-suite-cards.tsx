"use client";

import Link from "next/link";
import {
  Play,
  Lightning,
  Checks,
  ChartLineUp,
  MagnifyingGlass,
  X,
  Funnel,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { toast } from "@/components/ui/toast";
import { InProgressCard, ReadyCard } from "./execution-run-card-items";

export type SuiteWithRun = {
  id: number;
  title: string;
  status: string;
  assignee: string;
  notes: string;
  publicToken: string;
  testPlanId: string;
  caseCount: number;
  project: string;
  planName: string;
  lastRun: {
    id: number;
    runNumber: number;
    status: string;
    tester: string;
    passed: number;
    failed: number;
    blocked: number;
    totalCases: number;
    startedAt: string;
    completedAt: string | null;
  } | null;
};

export interface ExecutionSuiteCardsProps {
  suites?: SuiteWithRun[];
  projects?: string[];
  plans?: Array<{ id: number; title: string; project?: string }>;
  metrics?: {
    activeRuns: number;
    readySuites: number;
    completedRuns: number;
    totalCases: number;
    passRate: number | null;
  };
  initialSearch?: string;
  inProgress?: SuiteWithRun[];
  ready?: SuiteWithRun[];
}

export function ExecutionSuiteCards({
  suites: rawSuites,
  projects = [],
  plans = [],
  metrics,
  initialSearch = "",
  inProgress: legacyInProgress,
  ready: legacyReady,
}: ExecutionSuiteCardsProps) {
  const router = useRouter();
  const [creating, setCreating] = useState<number | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [statusTab, setStatusTab] = useState<"all" | "in-progress" | "ready" | "completed">("all");

  const allSuites = useMemo(() => {
    if (rawSuites && rawSuites.length > 0) return rawSuites;
    const combined: SuiteWithRun[] = [];
    if (legacyInProgress) combined.push(...legacyInProgress);
    if (legacyReady) combined.push(...legacyReady);
    return combined;
  }, [rawSuites, legacyInProgress, legacyReady]);

  const startNewRun = async (suite: SuiteWithRun) => {
    if (creating) return;
    setCreating(suite.id);
    try {
      const res = await fetch("/api/execution-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSuiteId: suite.id, testPlanId: suite.testPlanId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create run");
      }
      const { data } = await res.json();
      router.push(`/test-execution/${suite.publicToken}/run/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start run", "error");
    } finally {
      setCreating(null);
    }
  };

  const planOptions = useMemo(() => {
    if (plans && plans.length > 0) {
      if (selectedProject !== "all") {
        return plans.filter((p) => !p.project || p.project === selectedProject);
      }
      return plans;
    }
    const map = new Map<string, { id: number; title: string }>();
    allSuites.forEach((s) => {
      if (s.testPlanId && s.planName && s.planName !== "Standalone") {
        map.set(s.testPlanId, { id: Number(s.testPlanId) || 0, title: s.planName });
      }
    });
    return Array.from(map.values());
  }, [plans, allSuites, selectedProject]);

  const filteredSuites = useMemo(() => {
    return allSuites.filter((suite) => {
      if (selectedProject !== "all" && suite.project !== selectedProject) return false;
      if (selectedPlan !== "all") {
        if (suite.testPlanId !== selectedPlan && suite.planName !== selectedPlan) {
          return false;
        }
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        const matches = [
          suite.title,
          suite.project,
          suite.planName,
          suite.assignee,
          suite.lastRun?.tester || "",
        ].some((v) => v.toLowerCase().includes(term));
        if (!matches) return false;
      }
      if (statusTab === "in-progress") return suite.lastRun?.status === "in-progress";
      if (statusTab === "ready") return !suite.lastRun || suite.lastRun.status !== "in-progress";
      if (statusTab === "completed") return suite.lastRun?.status === "completed";
      return true;
    });
  }, [allSuites, selectedProject, selectedPlan, search, statusTab]);

  const inProgressList = useMemo(
    () => filteredSuites.filter((s) => s.lastRun?.status === "in-progress"),
    [filteredSuites],
  );
  const readyList = useMemo(
    () => filteredSuites.filter((s) => !s.lastRun || s.lastRun.status !== "in-progress"),
    [filteredSuites],
  );

  const counts = useMemo(() => {
    return {
      all: allSuites.length,
      inProgress: allSuites.filter((s) => s.lastRun?.status === "in-progress").length,
      ready: allSuites.filter((s) => !s.lastRun || s.lastRun.status !== "in-progress").length,
      completed: allSuites.filter((s) => s.lastRun?.status === "completed").length,
    };
  }, [allSuites]);

  if (allSuites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Play size={32} weight="bold" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">No active test suites</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          Create a test suite in Test Cases and set its status to Active or Draft to begin executing test runs.
        </p>
        <Link
          href="/test-cases"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 shadow-sm"
        >
          Manage Test Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. KPI Metric Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Active Runs</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Lightning size={15} weight="fill" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{metrics.activeRuns}</span>
              {metrics.activeRuns > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              ) : (
                <span className="text-xs text-slate-400">idle</span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Currently executing suites</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Ready Suites</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Play size={15} weight="bold" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{metrics.readySuites}</div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Awaiting new execution</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Cases</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Checks size={15} weight="bold" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{metrics.totalCases}</div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Mapped in test library</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Pass Rate</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <ChartLineUp size={15} weight="bold" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  "text-2xl font-black",
                  metrics.passRate !== null && metrics.passRate >= 80
                    ? "text-emerald-600"
                    : metrics.passRate !== null && metrics.passRate >= 50
                    ? "text-amber-600"
                    : metrics.passRate !== null
                    ? "text-rose-600"
                    : "text-slate-400",
                )}
              >
                {metrics.passRate !== null ? `${metrics.passRate}%` : "—"}
              </span>
              <span className="text-xs text-slate-400">avg</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500">From latest run outcomes</p>
          </div>
        </div>
      )}

      {/* 2. Control & Filtering Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition",
              statusTab === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            All <span className="opacity-75">({counts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("in-progress")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition",
              statusTab === "in-progress"
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-blue-700 hover:bg-blue-50/50",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            In Progress <span className="opacity-75">({counts.inProgress})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("ready")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition",
              statusTab === "ready"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            Ready <span className="opacity-75">({counts.ready})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusTab("completed")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition",
              statusTab === "completed"
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            Completed <span className="opacity-75">({counts.completed})</span>
          </button>
        </div>

        {/* Project Selector & Search */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 mr-0.5">
            <Funnel size={13} weight="bold" />
            Filters
          </span>

          {projects.length > 0 && (
            <div className="relative">
              <select
                aria-label="Filter by project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={cn("h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition touch-manipulation", selectedProject !== "all" ? "border-blue-300 bg-blue-50 text-blue-700 font-bold" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300")}
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {planOptions.length > 0 && (
            <div className="relative">
              <select
                aria-label="Filter by test plan"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className={cn(
                  "h-8 rounded-md border px-2.5 text-xs font-semibold outline-none transition touch-manipulation cursor-pointer max-w-[150px] truncate",
                  selectedPlan !== "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-bold"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                )}
              >
                <option value="all">All Plans</option>
                {planOptions.map((p) => (
                  <option key={p.id || p.title} value={String(p.id || p.title)}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedProject !== "all" || selectedPlan !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedProject("all");
                setSelectedPlan("all");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 cursor-pointer"
            >
              <X size={11} weight="bold" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter Result Empty State */}
      {filteredSuites.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Funnel size={28} weight="bold" className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">No test suites match your filters</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting the project, status tab, or search query.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedProject("all");
              setStatusTab("all");
            }}
            className="mt-4 inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 4. In Progress Section */}
      {inProgressList.length > 0 && statusTab !== "ready" && statusTab !== "completed" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              In Progress ({inProgressList.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressList.map((suite) => (
              <InProgressCard key={suite.id} suite={suite} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Ready to Execute Section */}
      {readyList.length > 0 && statusTab !== "in-progress" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {statusTab === "completed" ? `Completed Runs (${readyList.length})` : `Ready to Run (${readyList.length})`}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {readyList.map((suite) => (
              <ReadyCard
                key={suite.id}
                suite={suite}
                onStartRun={startNewRun}
                creating={creating === suite.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
