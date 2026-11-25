import {
  getAllTestPlansWithStats,
  getProjectOptions,
} from "@/lib/data";
import { PageShell } from "@/components/layout/page-shell";
import { TestPlanLibrary } from "./test-plan-library";
import { SuitesHeaderActions } from "@/components/test-management/suites-header-actions";
import { ClipboardText } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function TestPlansPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [rawPlans, rawProjectOptions] = await Promise.all([
    getAllTestPlansWithStats(),
    getProjectOptions(),
  ]);

  const plans = JSON.parse(JSON.stringify(rawPlans));
  const projectOptions = (rawProjectOptions || []).map((p: { label: string; value: string }) => p.value || p.label);

  const query = searchParams ? await searchParams : {};
  const initialSearch = typeof query.q === "string" ? query.q : Array.isArray(query.q) ? query.q[0] : "";

  return (
    <PageShell
      icon={<ClipboardText size={22} weight="bold" />}
      title="Test Plans"
      description="Define testing scope, track milestones, organize suites, and execute test cycles."
      crumbs={[{ label: "Test Management", href: "/test-cases" }, { label: "Test Plans" }]}
      actions={
        <SuitesHeaderActions
          initialSearch={initialSearch}
          placeholder="Search test plans..."
          exportModule="test-plans"
          importModule="test-plans"
        />
      }
    >
      <TestPlanLibrary
        key={initialSearch}
        plans={plans}
        projectOptions={projectOptions}
        initialSearch={initialSearch}
        hideToolbarAction={true}
      />
    </PageShell>
  );
}
