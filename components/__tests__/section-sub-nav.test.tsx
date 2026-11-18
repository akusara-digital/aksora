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

  it("renders Tasks & Sprints tabs when on /tasks", () => {
    currentPathname = "/tasks";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/sprints"');
    expect(html).toContain('href="/gantt"');
    expect(html).toContain("Tasks Board");
    expect(html).toContain("Sprints Backlog");
    expect(html).toContain("Gantt Timeline");
  });

  it("renders Team & Logs tabs when on /work-logs", () => {
    currentPathname = "/work-logs";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/work-logs"');
    expect(html).toContain('href="/standup"');
    expect(html).toContain('href="/meeting-notes"');
    expect(html).toContain('href="/activity-log"');
  });

  it("renders 3 thematic Reports hubs and Quality sub-views when on /reports/test-coverage", () => {
    currentPathname = "/reports/test-coverage";
    const html = renderToStaticMarkup(<SectionSubNav />);
    // Primary thematic hubs
    expect(html).toContain("Quality Analytics");
    expect(html).toContain("Delivery Analytics");
    expect(html).toContain("Weekly Report");
    // Quality sub-views visible
    expect(html).toContain('href="/reports/test-coverage"');
    expect(html).toContain('href="/reports/flaky-tests"');
    expect(html).toContain('href="/reports/test-gap"');
    // Delivery-only sub-views hidden when viewing Quality
    expect(html).not.toContain('href="/reports/workload"');
    expect(html).not.toContain('href="/deployments"');
  });

  it("renders Delivery sub-views when on /reports/workload or /deployments", () => {
    currentPathname = "/reports/workload";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain("Delivery Analytics");
    expect(html).toContain('href="/reports/sprint-burndown"');
    expect(html).toContain('href="/reports/workload"');
    expect(html).toContain('href="/deployments"');
    expect(html).not.toContain('href="/reports/flaky-tests"');
  });

  it("renders no secondary sub-row on /weekly-report", () => {
    currentPathname = "/weekly-report";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain("Weekly Report");
    expect(html).not.toContain('href="/reports/flaky-tests"');
    expect(html).not.toContain('href="/deployments"');
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
