import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-execution/session-1",
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
    expect(html).toContain('href="/notes"');
    expect(html).toContain('href="/settings"');
  });

  it("organizes main nav into 4 balanced groups (8 items) + compact footer utilities", () => {
    const mockDict = {
      dashboard: "Dashboard",
      projects: "Projects",
      groupTestManagement: "Test Management",
      testCases: "Test Cases",
      testRuns: "Test Runs",
      groupWorkAndDefects: "Work & Defects",
      tasks: "Tasks",
      bugs: "Bugs",
      groupReports: "Reports",
      reports: "Reports",
      notesAndVault: "Notes & Vault",
      settings: "Settings",
    } as unknown as Parameters<typeof getGroups>[0];

    const groups = getGroups(mockDict);
    const footerItems = getFooterItems(mockDict);

    // Group 0: Main Overview (no header)
    expect(groups[0].title).toBe("");
    expect(groups[0].items.map((i) => i.href)).toEqual(["/dashboard", "/projects"]);

    // Group 1: Test Management (First-class QA pillar)
    expect(groups[1].title).toBe("Test Management");
    expect(groups[1].items.map((i) => i.href)).toEqual([
      "/test-cases",
      "/test-execution",
    ]);

    // Group 2: Work & Defects
    expect(groups[2].title).toBe("Work & Defects");
    expect(groups[2].items.map((i) => i.href)).toEqual([
      "/tasks",
      "/bugs",
    ]);

    // Group 3: Reports
    expect(groups[3].title).toBe("Reports");
    expect(groups[3].items.map((i) => i.href)).toEqual([
      "/reports",
    ]);

    expect(groups).toHaveLength(4);
    expect(footerItems.map((i) => i.href)).toEqual(["/notes", "/settings"]);

    // Ensure no duplicate routes across main nav + footer
    const allHrefs = [
      ...groups.flatMap((g) => g.items.map((i) => i.href)),
      ...footerItems.map((i) => i.href),
    ];
    expect(allHrefs.length).toBe(new Set(allHrefs).size);
    expect(allHrefs.length).toBe(9);
  });

  it("exposes Settings footer utility to all roles (including non-admin QA/FE)", () => {
    const mockDict = {
      notesAndVault: "Notes & Vault",
      settings: "Settings",
    } as unknown as Parameters<typeof getFooterItems>[0];

    expect(filterFooterItems("qa", mockDict).map((i) => i.href)).toEqual([
      "/notes",
      "/settings",
    ]);
    expect(filterFooterItems("fe", mockDict).map((i) => i.href)).toEqual([
      "/notes",
      "/settings",
    ]);
  });
});

