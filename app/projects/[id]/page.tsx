import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";
import { PageShell } from "@/components/layout/page-shell";
import { FolderSimple } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { listProjectMembers } from "@/lib/project-members";
import { ProjectHubView } from "@/components/projects/project-hub-view";
import {
  ProjectData,
  TaskItem,
  BugItem,
  TestPlanItem,
  TestSuiteItem,
  ProjectMemberItem,
} from "@/components/projects/project-hub-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  const decodedId = decodeURIComponent(rawId);
  return {
    title: `${decodedId} | Projects - Aksora`,
    description: `Unified project hub for ${decodedId}: tasks, defects, test coverage, and team access.`,
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
    return null;
  }

  const { id: rawId } = await params;
  const query = searchParams ? await searchParams : {};
  const currentTab = typeof query.tab === "string" ? query.tab : undefined;

  const decodedId = decodeURIComponent(rawId);
  const numericId = parseInt(decodedId, 10);
  const isNumeric = Number.isFinite(numericId) && numericId > 0;

  const { andWhere, params: scopeParams } = getAccessScope(user);

  // 1. Query Project details
  const project = await db.get<ProjectData>(
    `SELECT p."id", p."name", p."key", p."description", p."status", p."publicToken", p."createdAt"
     FROM "Project" p
     WHERE (${isNumeric ? 'p."id" = CAST(? AS INTEGER) OR ' : ''}UPPER(p."key") = UPPER(?) OR p."name" = ?)
       AND p."deletedAt" IS NULL${andWhere}
     LIMIT 1`,
    isNumeric
      ? [numericId, decodedId, decodedId, ...scopeParams]
      : [decodedId, decodedId, ...scopeParams],
  );

  if (!project) {
    notFound();
    return null;
  }

  const projectId = project.id;
  const projectName = project.name;
  const projectKey = project.key || project.name;

  // 2. Query Tasks belonging to this project (order by updatedAt DESC limit 30)
  const tasks = await db.query<TaskItem>(
    `SELECT "id", "title", "status", "priority", "category", "assignee", "relatedFeature", "publicToken", "createdAt", "updatedAt"
     FROM "Task"
     WHERE ("projectId" = CAST(? AS INTEGER) OR "project" = ? OR "project" = ?)
       AND "deletedAt" IS NULL${andWhere}
     ORDER BY "updatedAt" DESC
     LIMIT 30`,
    [projectId, projectName, projectKey, ...scopeParams],
  );

  // 3. Query Bugs belonging to this project (order by createdAt DESC limit 30)
  const bugs = await db.query<BugItem>(
    `SELECT "id", "title", "severity", "status", "priority", "module", "suggestedDev", "publicToken", "createdAt", "updatedAt"
     FROM "Bug"
     WHERE ("projectId" = CAST(? AS INTEGER) OR "project" = ? OR "project" = ?)
       AND "deletedAt" IS NULL${andWhere}
     ORDER BY "createdAt" DESC
     LIMIT 30`,
    [projectId, projectName, projectKey, ...scopeParams],
  );

  // 4. Query Test Plans belonging to this project (limit 20)
  const testPlans = await db.query<TestPlanItem>(
    `SELECT "id", "title", "sprint", "status", "scope", "publicToken", "createdAt", "updatedAt"
     FROM "TestPlan"
     WHERE ("projectId" = CAST(? AS INTEGER) OR "project" = ? OR "project" = ?)
       AND "deletedAt" IS NULL${andWhere}
     ORDER BY "updatedAt" DESC
     LIMIT 20`,
    [projectId, projectName, projectKey, ...scopeParams],
  );

  // 5. Query Test Suites belonging to this project (limit 20)
  const planTokensOrIds = testPlans.flatMap((p) => [String(p.id), p.publicToken].filter(Boolean));
  let testSuites: TestSuiteItem[] = [];

  if (planTokensOrIds.length > 0) {
    const placeholders = planTokensOrIds.map(() => "?").join(", ");
    testSuites = await db.query<TestSuiteItem>(
      `SELECT "id", "title", "status", "assignee", "testPlanId", "publicToken", "createdAt", "updatedAt"
       FROM "TestSuite"
       WHERE ("projectId" = CAST(? AS INTEGER) OR "testPlanId" IN (${placeholders}))
         AND "deletedAt" IS NULL${andWhere}
       ORDER BY "updatedAt" DESC
       LIMIT 20`,
      [projectId, ...planTokensOrIds, ...scopeParams],
    );
  } else {
    testSuites = await db.query<TestSuiteItem>(
      `SELECT "id", "title", "status", "assignee", "testPlanId", "publicToken", "createdAt", "updatedAt"
       FROM "TestSuite"
       WHERE "projectId" = CAST(? AS INTEGER)
         AND "deletedAt" IS NULL${andWhere}
       ORDER BY "updatedAt" DESC
       LIMIT 20`,
      [projectId, ...scopeParams],
    );
  }

  // 6. Query Project Members
  const rawMembers = await listProjectMembers(projectId);
  const members: ProjectMemberItem[] = rawMembers.map((m) => ({
    id: m.id,
    uuid: m.uuid,
    projectId: m.projectId,
    userId: m.userId,
    workspaceId: m.workspaceId,
    role: m.role,
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    createdAt: m.createdAt,
  }));

  // Clean serialization from DB to Client
  const serialized = JSON.parse(
    JSON.stringify({
      project,
      tasks,
      bugs,
      testPlans,
      testSuites,
      members,
    }),
  );

  return (
    <PageShell
      icon={<FolderSimple size={22} weight="bold" />}
      title={project.name}
      description={project.description || "Manage engineering assets and collaborate with your team."}
      crumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name },
      ]}
    >
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ProjectHubView
          project={serialized.project}
          tasks={serialized.tasks}
          bugs={serialized.bugs}
          testPlans={serialized.testPlans}
          testSuites={serialized.testSuites}
          members={serialized.members}
          initialTab={currentTab}
        />
      </Suspense>
    </PageShell>
  );
}
