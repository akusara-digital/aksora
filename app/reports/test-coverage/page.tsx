import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTestCoverageData } from "./data";
import { TestCoverageDashboard } from "./test-coverage-dashboard";
import { AppLoader } from "@/components/shared/app-loader";

export const dynamic = "force-dynamic";

async function CoverageData() {
  const data = await getTestCoverageData();
  if (!data) redirect("/login");
  return <TestCoverageDashboard initialData={data} />;
}

export default function TestCoveragePage() {
  return (
    <Suspense fallback={<AppLoader message="Loading test coverage..." />}>
      <CoverageData />
    </Suspense>
  );
}
