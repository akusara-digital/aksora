"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Checks,
  Table,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "@/components/ui/toast";
import {
  QuickCreateCaseModal,
  QuickCreateSuiteModal,
  type PlanOption,
} from "@/components/test-management/quick-create-modals";
import { CreatePlanFromCasesModal } from "@/components/test-management/create-plan-from-cases-modal";
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
import { TestCaseSuiteHeader } from "@/components/test-management/test-case-suite-header";

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
  const router = useRouter();
  const [search] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterProject, setFilterProject] = useState(ALL);
  const [filterAssignee] = useState(ALL);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showNewSuiteModal, setShowNewSuiteModal] = useState(false);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [planCases, setPlanCases] = useState<TestCase[] | null>(null);
  const [startingRun, setStartingRun] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aksora-show-suite-sidebar");
      if (saved !== null) {
        setShowSidebar(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleSidebar = () => {
    setShowSidebar((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("aksora-show-suite-sidebar", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

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
      if (c.status === "Passed") g.passed++;
      else if (c.status === "Failed") g.failed++;
      else if (c.status === "Blocked") g.blocked++;
      else g.pending++;
    });

    const result = Array.from(map.values());
    result.forEach((g) => g.cases.sort(compareTestCases));
    return result.sort(compareSuiteGroups);
  }, [cases, suites]);

  const filteredGroups = useMemo<SuiteGroup[]>(() => {
    return groups
      .filter((g) => {
        if (filterProject === ALL) return true;
        return g.planProject === filterProject;
      })
      .map((g) => {
        let filteredCases = g.cases;
        if (filterStatus !== ALL) {
          filteredCases = filteredCases.filter((c) => c.status === filterStatus);
        }
        if (filterAssignee !== ALL) {
          filteredCases = filteredCases.filter(
            (c) => (c.assignee || g.suiteAssignee) === filterAssignee,
          );
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
  const displayCases: TestCase[] = selected
    ? (filterStatus !== ALL || search
      ? selected.filteredCases ?? selected.cases
      : selected.cases) ?? []
    : [];
  const suggestedTcId = `TC-${String((selected?.cases.length ?? 0) + 1).padStart(3, "0")}`;

  const handleRunSuite = async (suiteGroup?: SuiteGroup | null) => {
    const target = suiteGroup || selected;
    if (!target) {
      toast("No test suite selected", "error");
      return;
    }
    const suiteId = Number(target.key);
    if (!suiteId || isNaN(suiteId)) {
      toast("Please select a valid test suite first.", "error");
      return;
    }
    setStartingRun(true);
    try {
      const res = await fetch("/api/execution-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testSuiteId: suiteId,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "Failed to start test run");
      }
      toast(`Test Run #${d.data?.runNumber || ""} initiated. Redirecting...`, "success");
      const token = target.suiteToken || target.key;
      router.push(`/test-execution/${token}/run/${d.data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to start run", "error");
      setStartingRun(false);
    }
  };

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
        showSidebar={showSidebar}
        onToggleSidebar={toggleSidebar}
      />

      <div>
        <div className="flex flex-col gap-4 lg:h-[calc(100vh-310px)] lg:min-h-[500px] lg:flex-row">
          {/* Left Pane: Test Suites */}
          {showSidebar && (
            <SuiteSidebarList
              filteredGroups={filteredGroups}
              allGroupsCount={groups.length}
              selectedKey={selectedKey}
              onSelectKey={(key) => setSelectedKey(key)}
              onOpenNewSuiteModal={() => setShowNewSuiteModal(true)}
              onRunSuite={handleRunSuite}
              onToggleSidebar={toggleSidebar}
              filterStatus={filterStatus}
              filterAssignee={filterAssignee}
              search={search}
              allConstant={ALL}
            />
          )}

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
                    className="mt-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm"
                  >
                    <Plus size={14} weight="bold" />
                    New Suite
                  </button>
                )}
              </div>
            ) : (
              <>
                <TestCaseSuiteHeader
                  selected={selected}
                  onAddCase={() => setShowNewCaseModal(true)}
                  onRunSuite={() => handleRunSuite(selected)}
                  startingRun={startingRun}
                  showSidebar={showSidebar}
                  onToggleSidebar={toggleSidebar}
                />

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
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-sm"
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
                        onCreateTestPlan={(selectedCases) => setPlanCases(selectedCases)}
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
        defaultProject={filterProject !== ALL ? filterProject : undefined}
        projectOptions={projectOptions}
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

      {planCases && (
        <CreatePlanFromCasesModal
          isOpen={!!planCases}
          selectedCases={planCases}
          projectOptions={projectOptions}
          defaultProject={filterProject !== ALL ? filterProject : undefined}
          onClose={() => setPlanCases(null)}
          onSuccess={(planToken) => {
            setPlanCases(null);
            router.push(`/test-plans/${planToken}`);
          }}
        />
      )}
    </div>
  );
}
