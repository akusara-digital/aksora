import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";
import { PageShell } from "@/components/layout/page-shell";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { ExecutionSuiteCards } from "./execution-suite-cards";
import { SuitesHeaderActions } from "@/components/test-management/suites-header-actions";

export const dynamic = "force-dynamic";

export default async function TestExecutionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const query = searchParams ? await searchParams : {};
  const initialSearch = typeof query.q === "string" ? query.q : Array.isArray(query.q) ? query.q[0] : "";

  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND s."company" = ?';
  const companyParams = isAdmin ? [] : [company];

  const execCompanyFilter = isAdmin ? "" : ' AND "company" = ?';

  // Fetch suites, latest runs per suite, and plans concurrently
  const [suites, allRuns, plans] = await Promise.all([
    db.query<Record<string, unknown>>(
      `SELECT s."id", s."title", s."status", s."assignee", s."notes", s."publicToken", s."testPlanId",
              (SELECT COUNT(*) FROM "TestCase" tc WHERE tc."testSuiteId" = CAST(s."id" AS TEXT) AND tc."deletedAt" IS NULL) as "caseCount"
       FROM "TestSuite" s
       WHERE s."status" != 'archived' AND s."deletedAt" IS NULL${companyFilter}
       ORDER BY s."updatedAt" DESC`,
      [...companyParams]
    ),
    db.query<Record<string, unknown>>(
      `SELECT DISTINCT ON ("testSuiteId") "id", "testSuiteId", "runNumber", "status", "tester", "passed", "failed", "blocked", "totalCases", "startedAt", "completedAt"
       FROM "ExecutionRun"
       WHERE "deletedAt" IS NULL${execCompanyFilter}
       ORDER BY "testSuiteId", "runNumber" DESC`,
      isAdmin ? [] : [company]
    ),
    db.query<Record<string, unknown>>(
      `SELECT "id", "title", "project" FROM "TestPlan" WHERE "deletedAt" IS NULL${execCompanyFilter}`,
      isAdmin ? [] : [company]
    ),
  ]);

  // Index latest run per suite
  const latestRuns: Record<number, Record<string, unknown>> = {};
  for (const run of allRuns) {
    const sid = Number(run.testSuiteId ?? run.suiteId);
    if (!latestRuns[sid]) {
      latestRuns[sid] = run;
    }
  }

  const planMap = new Map<string, Record<string, unknown>>();
  plans.forEach(p => planMap.set(String(p.id), p));

  // Build enriched suite data
  const enrichedSuites = suites.map(s => {
    const suiteId = Number(s.id);
    const plan = planMap.get(String(s.testPlanId));
    const lastRun = latestRuns[suiteId] || null;

    return {
      id: suiteId,
      title: String(s.title),
      status: String(s.status),
      assignee: String(s.assignee || ""),
      notes: String(s.notes || ""),
      publicToken: String(s.publicToken),
      testPlanId: String(s.testPlanId || ""),
      caseCount: Number(s.caseCount) || 0,
      project: String(plan?.project || "General"),
      planName: String(plan?.title || "Standalone"),
      lastRun: lastRun ? {
        id: Number(lastRun.id),
        runNumber: Number(lastRun.runNumber),
        status: String(lastRun.status),
        tester: String(lastRun.tester || ""),
        passed: Number(lastRun.passed) || 0,
        failed: Number(lastRun.failed) || 0,
        blocked: Number(lastRun.blocked) || 0,
        totalCases: Number(lastRun.totalCases) || 0,
        startedAt: String(lastRun.startedAt || ""),
        completedAt: lastRun.completedAt ? String(lastRun.completedAt) : null,
      } : null,
    };
  });

  // Calculate overview metrics
  const activeRunsCount = enrichedSuites.filter(s => s.lastRun?.status === "in-progress").length;
  const readyCount = enrichedSuites.filter(s => !s.lastRun || s.lastRun.status !== "in-progress").length;
  const completedCount = enrichedSuites.filter(s => s.lastRun?.status === "completed").length;
  const totalCases = enrichedSuites.reduce((acc, s) => acc + s.caseCount, 0);

  let totalEvaluated = 0;
  let totalPassed = 0;
  for (const s of enrichedSuites) {
    if (s.lastRun && s.lastRun.totalCases > 0) {
      totalEvaluated += s.lastRun.passed + s.lastRun.failed + s.lastRun.blocked;
      totalPassed += s.lastRun.passed;
    }
  }
  const overallPassRate = totalEvaluated > 0 ? Math.round((totalPassed / totalEvaluated) * 100) : null;
  const projects = Array.from(new Set(enrichedSuites.map(s => s.project).filter(Boolean))).sort();

  return (
    <PageShell
      icon={<Play size={22} weight="bold" />}
      title="Test Runs"
      description="Plan, execute, and monitor test runs in real time with live metrics, environment targeting, and QA sign-off."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Test Runs" }]}
      actions={<SuitesHeaderActions initialSearch={initialSearch} placeholder="Search suites..." exportModule="test-suites" importModule="test-suites" />}
    >
      <ExecutionSuiteCards
        suites={enrichedSuites}
        projects={projects}
        metrics={{
          activeRuns: activeRunsCount,
          readySuites: readyCount,
          completedRuns: completedCount,
          totalCases,
          passRate: overallPassRate,
        }}
        initialSearch={initialSearch}
      />
    </PageShell>
  );
}
