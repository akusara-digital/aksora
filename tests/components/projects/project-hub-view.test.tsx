import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectHubView } from "@/components/projects/project-hub-view";
import { ProjectData, TaskItem, BugItem, TestPlanItem, TestSuiteItem, ProjectMemberItem } from "@/components/projects/project-hub-types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

const mockProject: ProjectData = {
  id: 1,
  name: "Aksora Web",
  key: "AKS",
  description: "Next.js engineering workspace",
  status: "active",
  publicToken: "tok-1",
  createdAt: "2026-01-01T00:00:00Z",
};

const mockTasks: TaskItem[] = [
  {
    id: 1,
    title: "Implement auth token refresh",
    status: "in_progress",
    priority: "P1",
    category: "Feature",
    assignee: "Alice",
    relatedFeature: "Auth",
    publicToken: "task-tok-1",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-02T00:00:00Z",
  },
  {
    id: 2,
    title: "Database schema migration",
    status: "completed",
    priority: "P0",
    category: "Tech Debt",
    assignee: "Bob",
    relatedFeature: "Database",
    publicToken: "task-tok-2",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-02T00:00:00Z",
  },
];

const mockBugs: BugItem[] = [
  {
    id: 1,
    title: "Null pointer on empty project name",
    severity: "critical",
    status: "open",
    priority: "P0",
    module: "Projects",
    suggestedDev: "Alice",
    publicToken: "bug-tok-1",
    createdAt: "2026-02-03T00:00:00Z",
    updatedAt: "2026-02-03T00:00:00Z",
  },
];

const mockPlans: TestPlanItem[] = [
  {
    id: 1,
    title: "Release 1.4 Regression",
    sprint: "Sprint 14",
    status: "active",
    scope: "Full E2E suite",
    publicToken: "plan-tok-1",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
];

const mockSuites: TestSuiteItem[] = [
  {
    id: 1,
    title: "Authentication E2E",
    status: "active",
    assignee: "Charlie",
    testPlanId: "1",
    publicToken: "suite-tok-1",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
];

const mockMembers: ProjectMemberItem[] = [
  {
    id: 1,
    uuid: "m-uuid-1",
    projectId: 1,
    userId: 10,
    workspaceId: 1,
    role: "admin",
    name: "Alice",
    email: "alice@example.com",
    avatar: "",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("ProjectHubView Component", () => {
  it("renders header with project key, title, status, and quick action buttons", () => {
    const html = renderToStaticMarkup(
      <ProjectHubView
        project={mockProject}
        tasks={mockTasks}
        bugs={mockBugs}
        testPlans={mockPlans}
        testSuites={mockSuites}
        members={mockMembers}
      />,
    );

    expect(html).toContain("AKS");
    expect(html).toContain("Aksora Web");
    expect(html).toContain("active");
    expect(html).toContain("Create Task");
    expect(html).toContain("Log Bug");
    expect(html).toContain("Members (1)");
  });

  it("renders 4 metric cards on default Overview tab", () => {
    const html = renderToStaticMarkup(
      <ProjectHubView
        project={mockProject}
        tasks={mockTasks}
        bugs={mockBugs}
        testPlans={mockPlans}
        testSuites={mockSuites}
        members={mockMembers}
      />,
    );

    expect(html).toContain("Implement auth token refresh");
    expect(html).toContain("Null pointer on empty project name");
    expect(html).toContain("Release 1.4 Regression");
    expect(html).toContain("1 Critical");
  });

  it("renders Bugs tab when initialTab is set to bugs", () => {
    const html = renderToStaticMarkup(
      <ProjectHubView
        project={mockProject}
        tasks={mockTasks}
        bugs={mockBugs}
        testPlans={mockPlans}
        testSuites={mockSuites}
        members={mockMembers}
        initialTab="bugs"
      />,
    );

    expect(html).toContain("Search defects...");
    expect(html).toContain("Null pointer on empty project name");
  });

  it("renders Tasks tab when initialTab is set to tasks", () => {
    const html = renderToStaticMarkup(
      <ProjectHubView
        project={mockProject}
        tasks={mockTasks}
        bugs={mockBugs}
        testPlans={mockPlans}
        testSuites={mockSuites}
        members={mockMembers}
        initialTab="tasks"
      />,
    );

    expect(html).toContain("Search tasks...");
    expect(html).toContain("Implement auth token refresh");
  });

  it("renders Test Management tab when initialTab is set to tests", () => {
    const html = renderToStaticMarkup(
      <ProjectHubView
        project={mockProject}
        tasks={mockTasks}
        bugs={mockBugs}
        testPlans={mockPlans}
        testSuites={mockSuites}
        members={mockMembers}
        initialTab="tests"
      />,
    );

    expect(html).toContain("Test Plans");
    expect(html).toContain("Test Suites");
    expect(html).toContain("Authentication E2E");
  });
});
