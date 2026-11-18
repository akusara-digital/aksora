"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/shared/badge";
import {
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  Checks,
  DotsThreeVertical,
  PencilSimple,
  Table,
  Plus,
  Play,
} from "@phosphor-icons/react";
import { AiGenerateCasesButton } from "@/components/test-management/ai-generate-cases-button";
import {
  QuickCreateCaseModal,
  QuickCreateSuiteModal,
  type PlanOption,
} from "@/components/test-management/quick-create-modals";
import {
  TestCaseTable,
  TestCaseMobileCards,
  compareTestCases,
  compareSuiteGroups,
  type TestCase,
  type SuiteGroup,
} from "@/components/test-management/test-case-table";
import { SuiteSidebarList } from "@/components/test-management/suite-sidebar-list";
import { TestCaseFilters } from "@/components/test-management/test-case-filters";

type SuiteItem = {
  id: number;
  title: string;
  publicToken: string;
  status: string;
  assignee?: string;
  planTitle?: string;
  planProject?: string;
};

const ALL = "All";

export function TestCaseLibrary({
  cases,
  suites = [],
  plans = [],
  initialSearch = "",
}: {
  cases: TestCase[];
  suites?: SuiteItem[];
  plans?: PlanOption[];
  initialSearch?: string;
}) {
  const [search] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterProject, setFilterProject] = useState(ALL);
  const [filterAssignee] = useState(ALL);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNewSuiteModal, setShowNewSuiteModal] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    suites.forEach((s) => {
      if (s.planProject) set.add(s.planProject);
    });
    cases.forEach((c) => {
      if (c.planProject) set.add(c.planProject);
    });
    return Array.from(set).sort();
  }, [cases, suites]);

  const groups = useMemo<SuiteGroup[]>(() => {
    const map = new Map<string, SuiteGroup>();

    suites.forEach((s) => {
      const key = String(s.id);
      if (!map.has(key)) {
        map.set(key, {
          key,
          suiteTitle: s.title || "Untitled Suite",
          suiteToken: s.publicToken || null,
          suiteStatus: s.status || "active",
          suiteAssignee: s.assignee || null,
          planTitle: s.planTitle || null,
          planProject: s.planProject || null,
          cases: [],
          passed: 0,
          failed: 0,
          blocked: 0,
          pending: 0,
        });
      }
    });

    cases.forEach((c) => {
      const key = String(c.testSuiteId ?? "unassigned");
      if (!map.has(key)) {
        map.set(key, {
          key,
          suiteTitle: c.suiteTitle || "Unassigned Suite",
          suiteToken: c.suiteToken,
          suiteStatus: c.suiteStatus,
          suiteAssignee: c.suiteAssignee || null,
          planTitle: c.planTitle,
          planProject: c.planProject,
          cases: [],
          passed: 0,
          failed: 0,
          blocked: 0,
          pending: 0,
        });
      }
      const g = map.get(key)!;
      g.cases.push(c);
      const s = c.status;
      if (s === "Passed") g.passed++;
      else if (s === "Failed") g.failed++;
      else if (s === "Blocked") g.blocked++;
      else g.pending++;
    });

    return Array.from(map.values())
      .map((group) => ({ ...group, cases: [...group.cases].sort(compareTestCases) }))
      .sort(compareSuiteGroups);
  }, [cases, suites]);

  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => filterProject === ALL || g.planProject === filterProject)
      .map((g) => {
        let filteredCases = g.cases;
        if (filterStatus !== ALL) filteredCases = filteredCases.filter((c) => c.status === filterStatus);
        if (filterAssignee !== ALL) {
          filteredCases = filteredCases.filter((c) => (c.assignee || g.suiteAssignee || "Unassigned") === filterAssignee);
        }
        if (search) {
          const q = search.toLowerCase();
          const suiteMatches =
            g.suiteTitle.toLowerCase().includes(q) ||
            (g.planTitle?.toLowerCase().includes(q) ?? false) ||
            (g.planProject?.toLowerCase().includes(q) ?? false);
          if (!suiteMatches) {
            filteredCases = filteredCases.filter(
              (c) =>
                c.caseName?.toLowerCase().includes(q) ||
                c.tcId?.toLowerCase().includes(q) ||
                c.assignee?.toLowerCase().includes(q) ||
                c.typeCase?.toLowerCase().includes(q) ||
                c.priority?.toLowerCase().includes(q) ||
                c.status?.toLowerCase().includes(q),
            );
          }
        }
        return { ...g, filteredCases };
      })
      .filter((g) => {
        if (filterStatus !== ALL || filterAssignee !== ALL) return g.filteredCases.length > 0;
        if (search) {
          const q = search.toLowerCase();
          const suiteMatches =
            g.suiteTitle.toLowerCase().includes(q) ||
            (g.planTitle?.toLowerCase().includes(q) ?? false) ||
            (g.planProject?.toLowerCase().includes(q) ?? false);
          return suiteMatches || g.filteredCases.length > 0;
        }
        return true;
      });
  }, [groups, filterProject, filterStatus, filterAssignee, search]);

  const selected = filteredGroups.find((g) => g.key === selectedKey) ?? filteredGroups[0] ?? null;
  const displayCases = selected
    ? filterStatus !== ALL || search
      ? selected.filteredCases
      : selected.cases
    : [];
  const suggestedTcId = `TC-${String((selected?.cases.length ?? 0) + 1).padStart(3, "0")}`;

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

  return (
    <div className="space-y-3 pb-6">
      <TestCaseFilters
        projectOptions={projectOptions}
        filterProject={filterProject}
        setFilterProject={setFilterProject}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        suitesCount={filteredGroups.length}
        onOpenNewSuiteModal={() => setShowNewSuiteModal(true)}
        allConstant={ALL}
      />

      <div>
        <div className="flex flex-col gap-4 lg:h-[calc(100vh-310px)] lg:min-h-[500px] lg:flex-row">
          {/* Left Pane: Test Suites */}
          <SuiteSidebarList
            filteredGroups={filteredGroups}
            allGroupsCount={groups.length}
            selectedKey={selectedKey}
            onSelectKey={(key) => {
              setSelectedKey(key);
              setIsMenuOpen(false);
            }}
            onOpenNewSuiteModal={() => setShowNewSuiteModal(true)}
            filterStatus={filterStatus}
            filterAssignee={filterAssignee}
            search={search}
            allConstant={ALL}
          />

          {/* Right Pane: Test Cases */}
          <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
                <Table size={40} weight="bold" />
                <p className="text-sm font-semibold text-gray-700">
                  {groups.length === 0
                    ? "Start by creating a Test Suite"
                    : "Select a suite to view test cases"}
                </p>
                <p className="max-w-sm text-xs text-gray-500">
                  {groups.length === 0
                    ? "Test cases live inside suites. Create your first suite on the left, then add cases manually or generate them with AI."
                    : "Choose any suite from the left panel to inspect, edit, or add test cases."}
                </p>
                {groups.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewSuiteModal(true)}
                    className="mt-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={14} weight="bold" />
                    New Suite
                  </button>
                )}
              </div>
            ) : (
              <>
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
                    <button
                      type="button"
                      onClick={() => setShowNewCaseModal(true)}
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Plus size={14} weight="bold" />
                      Add Case
                    </button>
                    <AiGenerateCasesButton
                      suiteId={String(
                        selected.cases[0]?.testSuiteId || selected.key || "",
                      )}
                      suiteLabel={selected.suiteTitle}
                      existingCases={selected.cases}
                    />
                    {(selected.suiteToken || selected.key) && (
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
                            <Link
                              href={`/test-cases/${selected.suiteToken || selected.key}`}
                              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <PencilSimple size={16} weight="bold" />
                              Edit Test Case
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
                            <Link
                              href="/test-execution"
                              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <Play size={16} weight="bold" />
                              Go to Test Runs
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {displayCases.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
                    <Checks size={32} weight="bold" />
                    <p className="text-sm font-semibold text-gray-700">
                      {selected.cases.length === 0
                        ? "No test cases in this suite yet"
                        : "No cases match this filter"}
                    </p>
                    {selected.cases.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewCaseModal(true)}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Plus size={14} weight="bold" />
                        Add First Test Case
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <TestCaseMobileCards
                      displayCases={displayCases}
                      suiteAssignee={selected.suiteAssignee}
                    />
                    <div className="hidden flex-1 overflow-auto md:block">
                      <TestCaseTable
                        displayCases={displayCases}
                        suiteAssignee={selected.suiteAssignee}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <QuickCreateSuiteModal
        isOpen={showNewSuiteModal}
        plans={plans}
        onClose={() => setShowNewSuiteModal(false)}
        onCreated={(newSuiteId) => setSelectedKey(newSuiteId)}
      />

      {selected && (
        <QuickCreateCaseModal
          isOpen={showNewCaseModal}
          suiteId={String(selected.cases[0]?.testSuiteId || selected.key || "")}
          suiteTitle={selected.suiteTitle}
          suggestedTcId={suggestedTcId}
          onClose={() => setShowNewCaseModal(false)}
        />
      )}
    </div>
  );
}
