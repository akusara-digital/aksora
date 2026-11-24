import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let currentPathname = "/test-cases";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
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
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { SectionSubNav } from "@/components/layout/section-sub-nav";

describe("SectionSubNav", () => {
  it("renders Cases & Suites + Test Plans tabs when on /test-cases or /test-suites", () => {
    currentPathname = "/test-cases";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/test-cases"');
    expect(html).toContain('href="/test-plans"');
    expect(html).not.toContain('href="/exploratory"');
    expect(html).toContain("Cases &amp; Suites");
    expect(html).toContain("Test Plans");
  });

  it("renders Test Runs execution tabs including Exploratory when on /test-execution or /exploratory", () => {
    currentPathname = "/exploratory";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/test-execution"');
    expect(html).toContain('href="/exploratory"');
    expect(html).toContain('href="/schedules"');
    expect(html).toContain('href="/recordings"');
    expect(html).toContain("Test Runs");
    expect(html).toContain("Exploratory (SBTM)");
  });

  it("renders Tasks & Flow tabs when on /tasks or /gantt", () => {
    currentPathname = "/tasks";
    let html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/gantt"');
    expect(html).toContain("Tasks Board");
    expect(html).toContain("Gantt Timeline");
    expect(html).not.toContain("Daily Standup");
    expect(html).not.toContain("Sprints Backlog");

    currentPathname = "/gantt";
    html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/gantt"');
    expect(html).not.toContain("Daily Standup");
    expect(html).not.toContain("Sprints Backlog");
  });

  it("renders Notes & Vault tabs including Work Logs and Meeting Notes when on /notes, /meeting-notes, or /work-logs", () => {
    currentPathname = "/meeting-notes";
    let html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/work-logs"');
    expect(html).toContain('href="/notes"');
    expect(html).toContain('href="/meeting-notes"');
    expect(html).toContain('href="/vault"');
    expect(html).toContain("Work Logs");
    expect(html).toContain("Personal Notes");
    expect(html).toContain("Meeting Notes");
    expect(html).toContain("Password Vault");

    currentPathname = "/work-logs";
    html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/work-logs"');
    expect(html).toContain("Work Logs");
  });

  it("renders consolidated 3-hub Reports navigation tabs", () => {
    currentPathname = "/reports/test-coverage";
    let html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain("Weekly Report");
    expect(html).toContain("Quality &amp; Coverage");
    expect(html).toContain("Delivery &amp; Team");
    expect(html).toContain('href="/weekly-report"');
    expect(html).toContain('href="/reports/test-coverage"');
    expect(html).toContain('href="/reports/sprint-burndown"');

    // Consolidated tabs: sub-views and non-report items must not clutter top nav
    expect(html).not.toContain('href="/deployments"');
    expect(html).not.toContain('href="/reports/test-gap"');
    expect(html).not.toContain('href="/reports/flaky-tests"');
    expect(html).not.toContain('href="/reports/workload"');

    // Test on another reports page (e.g. /reports/flaky-tests still renders the 3 hubs with Quality active)
    currentPathname = "/reports/flaky-tests";
    html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain("Quality &amp; Coverage");
    expect(html).toContain("Weekly Report");
    expect(html).toContain("Delivery &amp; Team");
  });

  it("returns null on standalone pages like /dashboard or /projects", () => {
    currentPathname = "/dashboard";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toBe("");

    currentPathname = "/projects";
    const htmlProjects = renderToStaticMarkup(<SectionSubNav />);
    expect(htmlProjects).toBe("");
  });
});
