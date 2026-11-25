import {
  getAllTestCasesWithSuite,
  getAllTestSuitesWithPlan,
  getTestPlansSummary,
  getProjectOptions,
} from "@/lib/data";
import { PageShell } from "@/components/layout/page-shell";
import { TestCaseLibrary } from "./test-case-library";
import { SuitesHeaderActions } from "@/components/test-management/suites-header-actions";
import { Checks } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rawCases, rawSuites, rawPlans, rawProjectOptions] = await Promise.all([
    getAllTestCasesWithSuite(),
    typeof getAllTestSuitesWithPlan === "function" ? getAllTestSuitesWithPlan() : Promise.resolve([]),
    typeof getTestPlansSummary === "function" ? getTestPlansSummary() : Promise.resolve([]),
    typeof getProjectOptions === "function" ? getProjectOptions() : Promise.resolve([]),
  ]);
  const cases = JSON.parse(JSON.stringify(rawCases));
  const suites = JSON.parse(JSON.stringify(rawSuites));
  const plans = JSON.parse(JSON.stringify(rawPlans));
  const projectOptions = (rawProjectOptions || []).map((p: { label: string; value: string }) => p.value || p.label);
  const query = searchParams ? await searchParams : {};
  const initialSearch = typeof query.q === "string" ? query.q : Array.isArray(query.q) ? query.q[0] : "";

  return (
    <PageShell
      icon={<Checks size={22} weight="bold" />}
      title="Test Case Library"
      description="Organize test suites on the left and author or execute test cases on the right."
      crumbs={[{ label: "Test Management", href: "/test-cases" }, { label: "Cases & Suites" }]}
      actions={
        <SuitesHeaderActions
          initialSearch={initialSearch}
          placeholder="Search suites or test cases..."
          exportModule="test-cases"
          importModule="test-cases"
        />
      }
    >
      <TestCaseLibrary
        key={initialSearch}
        cases={cases}
        suites={suites}
        plans={plans}
        workspaceProjects={projectOptions}
        initialSearch={initialSearch}
      />
    </PageShell>
  );
}
