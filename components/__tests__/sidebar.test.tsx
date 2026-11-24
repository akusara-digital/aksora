import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ pathname: "/test-execution/session-1" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => ({
    dict: {
      sidebar: {
        dashboard: "Dashboard",
        groupTestManagement: "Test Management",
        testPlans: "Test Plans",
        testSuites: "Test Suites",
        testCases: "Test Cases",
        testSessions: "Test Sessions",
        groupWorkTracking: "Work Tracking",
        tasks: "Tasks",
        bugs: "Bugs",
        sprints: "Sprints",
        workLog: "Work Log",
        groupDocumentation: "Documentation",
        dailyStandup: "Daily Standup",
        meetingNotes: "Meeting Notes",
        activityLog: "Activity Log",
        groupReports: "Reports",
        report: "Report",
        testCoverage: "Test Coverage",
        flakyTests: "Flaky Tests",
        testGapAnalysis: "Test Gap Analysis",
        deploymentLog: "Deployment Log",
        workloadHeatmap: "Workload Heatmap",
        ganttTimeline: "Gantt / Timeline",
        groupSystemSettings: "System Settings",
        settings: "Settings",
        apiKeys: "API Keys",
        projects: "Projects",
        groupTeamWorkspace: "Team Workspace",
        groupPersonalTools: "Personal Tools",
        groupReportsAnalytics: "Reports & Analytics",
        notes: "Notes",
        passwordManager: "Password Manager",
        aiSettings: "AI & Models",
        support: "Support",
        collapse: "Collapse",
        expand: "Expand",
      },
    },
    locale: "en",
    setLocale: () => {},
  }),
}));

import { Sidebar } from "@/components/layout/sidebar";
import { filterFooterItems, getFooterItems, getGroups } from "@/components/layout/sidebar-nav";

describe("Sidebar", () => {
  it("marks test runs active for execution detail routes", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        userRole="admin"
      />,
    );

    expect(html).toContain('href="/test-execution"');
    expect(html).toMatch(/href="\/test-execution"[^>]*bg-sky-50[\s\S]*?Test Sessions/);
    expect(html).not.toMatch(/href="\/test-suites"[^>]*bg-sky-50/);
    // Footer utility items render in the sidebar
    expect(html).toContain('href="/settings"');
  });

  it("highlights only My Work (not Dashboard) when on /my-work", () => {
    mocks.pathname = "/my-work";
    const html = renderToStaticMarkup(
      <Sidebar collapsed={false} onToggle={() => {}} userRole="admin" />,
    );
    mocks.pathname = "/test-execution/session-1";

    expect(html).toMatch(/href="\/my-work"[^>]*bg-sky-50/);
    expect(html).not.toMatch(/href="\/dashboard"[^>]*bg-sky-50/);
  });

  it("highlights only Dashboard (not My Work) when on /dashboard", () => {
    mocks.pathname = "/dashboard";
    const html = renderToStaticMarkup(
      <Sidebar collapsed={false} onToggle={() => {}} userRole="admin" />,
    );
    mocks.pathname = "/test-execution/session-1";

    expect(html).toMatch(/href="\/dashboard"[^>]*bg-sky-50/);
    expect(html).not.toMatch(/href="\/my-work"[^>]*bg-sky-50/);
  });

  it("organizes main nav into a Dashboard shortcut + 4 balanced groups (9 items) + compact footer utilities", () => {
    const mockDict = {
      dashboard: "Dashboard",
      mySpace: "MY SPACE",
      myWork: "My Work",
      groupWorkItems: "Work Items",
      tasks: "Tasks",
      bugs: "Bugs",
      dailyWork: "Daily Work",
      projects: "Projects",
      groupTestManagement: "Test Management",
      testCases: "Test Cases",
      testRuns: "Test Runs",
      groupReports: "Reports",
      weeklyReport: "Weekly Report",
      notesAndVault: "Notes & Vault",
      settings: "Settings",
    } as unknown as Parameters<typeof getGroups>[0];

    const groups = getGroups(mockDict);
    const footerItems = getFooterItems(mockDict);

    // Group 0: Dashboard shortcut (no title)
    expect(groups[0].title).toBe("");
    expect(groups[0].items.map((i) => i.href)).toEqual(["/dashboard"]);

    // Group 1: MY SPACE
    expect(groups[1].title).toBe("MY SPACE");
    expect(groups[1].items.map((i) => i.href)).toEqual(["/projects", "/my-work"]);

    // Group 2: Test Management
    expect(groups[2].title).toBe("Test Management");
    expect(groups[2].items.map((i) => i.href)).toEqual([
      "/test-cases",
      "/test-execution",
    ]);

    // Group 3: Work Items
    expect(groups[3].title).toBe("Work Items");
    expect(groups[3].items.map((i) => i.href)).toEqual([
      "/tasks",
      "/bugs",
      "/work-logs",
    ]);

    // Group 4: Reports
    expect(groups[4].title).toBe("Reports");
    expect(groups[4].items.map((i) => i.href)).toEqual([
      "/weekly-report",
    ]);

    expect(groups).toHaveLength(5);
    expect(footerItems.map((i) => i.href)).toEqual(["/settings"]);

    // Ensure no duplicate routes across main nav + footer
    const allHrefs = [
      ...groups.flatMap((g) => g.items.map((i) => i.href)),
      ...footerItems.map((i) => i.href),
    ];
    expect(allHrefs.length).toBe(new Set(allHrefs).size);
    expect(allHrefs.length).toBe(10);
  });

  it("exposes Settings footer utility to all roles (including non-admin QA/FE)", () => {
    const mockDict = {
      settings: "Settings",
    } as unknown as Parameters<typeof getFooterItems>[0];

    expect(filterFooterItems("qa", mockDict).map((i) => i.href)).toEqual([
      "/settings",
    ]);
    expect(filterFooterItems("fe", mockDict).map((i) => i.href)).toEqual([
      "/settings",
    ]);
  });
});

