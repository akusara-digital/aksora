import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  dbGet: vi.fn(),
  dbQuery: vi.fn(),
  listProjectMembers: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  pageShell: vi.fn(({ title, crumbs, children }: { title: string; crumbs: unknown; children: React.ReactNode }) => (
    <div data-testid="page-shell" data-title={title}>
      {children}
    </div>
  )),
  projectHubView: vi.fn(({ project }: { project: { name: string } }) => (
    <div data-testid="project-hub-view">{project.name}</div>
  )),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    query: mocks.dbQuery,
  },
}));

vi.mock("@/lib/project-members", () => ({
  listProjectMembers: mocks.listProjectMembers,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("@/components/projects/project-hub-view", () => ({
  ProjectHubView: mocks.projectHubView,
}));

import ProjectDetailPage from "../page";

describe("Unified Project Hub Page (/projects/[id])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: 1,
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      company: "Aksora",
    });
    mocks.getAccessScope.mockReturnValue({
      andWhere: ' AND "company" = ?',
      params: ["Aksora"],
    });
  });

  it("redirects to /login if user is unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    await ProjectDetailPage({
      params: Promise.resolve({ id: "1" }),
    });

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("calls notFound() when project does not exist", async () => {
    mocks.dbGet.mockResolvedValueOnce(null);

    await ProjectDetailPage({
      params: Promise.resolve({ id: "999" }),
    });

    expect(mocks.notFound).toHaveBeenCalled();
  });

  it("resolves project by integer ID, queries child entities, and renders ProjectHubView", async () => {
    const mockProject = {
      id: 12,
      name: "Core Platform",
      key: "CORE",
      description: "Platform services and API hub",
      status: "active",
      publicToken: "proj-12-core",
      createdAt: "2026-01-01T00:00:00Z",
    };

    mocks.dbGet.mockResolvedValueOnce(mockProject);

    // Mock query calls: Tasks, Bugs, TestPlans, TestSuites
    mocks.dbQuery
      // Tasks
      .mockResolvedValueOnce([
        { id: 101, title: "OAuth Support", status: "in_progress", priority: "P1", category: "Feature", updatedAt: "2026-05-01" },
      ])
      // Bugs
      .mockResolvedValueOnce([
        { id: 201, title: "Token Expiry Crash", severity: "critical", status: "open", priority: "P0", createdAt: "2026-05-02" },
      ])
      // Test Plans
      .mockResolvedValueOnce([
        { id: 301, title: "Sprint 14 Plan", sprint: "Sprint 14", status: "active", publicToken: "plan-token-1" },
      ])
      // Test Suites
      .mockResolvedValueOnce([
        { id: 401, title: "Auth Suite", status: "active", testPlanId: "301", publicToken: "suite-token-1" },
      ]);

    // Project Members
    mocks.listProjectMembers.mockResolvedValueOnce([
      { id: 1, uuid: "uuid-1", projectId: 12, userId: 1, role: "admin", name: "Alice", email: "alice@example.com", avatar: "", createdAt: "2026-01-01" },
    ]);

    const result = await ProjectDetailPage({
      params: Promise.resolve({ id: "12" }),
      searchParams: Promise.resolve({ tab: "bugs" }),
    });

    const html = renderToStaticMarkup(result);

    expect(html).toContain("Core Platform");
    expect(mocks.pageShell).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Core Platform",
        crumbs: [
          { label: "My Space", href: "/projects" },
          { label: "Projects", href: "/projects" },
          { label: "Core Platform" },
        ],
      }),
      undefined,
    );
    expect(mocks.projectHubView).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({ id: 12, name: "Core Platform" }),
        tasks: expect.arrayContaining([expect.objectContaining({ id: 101 })]),
        bugs: expect.arrayContaining([expect.objectContaining({ id: 201 })]),
        testPlans: expect.arrayContaining([expect.objectContaining({ id: 301 })]),
        testSuites: expect.arrayContaining([expect.objectContaining({ id: 401 })]),
        members: expect.arrayContaining([expect.objectContaining({ name: "Alice" })]),
        initialTab: "bugs",
      }),
      undefined,
    );
  });

  it("resolves project by string key or name", async () => {
    const mockProject = {
      id: 5,
      name: "Mobile App",
      key: "MOB",
      description: "iOS and Android client",
      status: "active",
      publicToken: "mob-token",
      createdAt: "2026-01-01T00:00:00Z",
    };

    mocks.dbGet.mockResolvedValueOnce(mockProject);
    mocks.dbQuery.mockResolvedValue([]);
    mocks.listProjectMembers.mockResolvedValue([]);

    await ProjectDetailPage({
      params: Promise.resolve({ id: "MOB" }),
    });

    expect(mocks.dbGet).toHaveBeenCalledWith(
      expect.stringContaining('UPPER(p."key") = UPPER(?) OR p."name" = ?'),
      ["MOB", "MOB", "Aksora"],
    );
  });
});
