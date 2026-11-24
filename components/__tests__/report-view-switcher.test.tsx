import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let currentPathname = "/reports/test-coverage";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { QualityViewSwitcher, DeliveryViewSwitcher } from "@/components/reports/report-view-switcher";

describe("QualityViewSwitcher", () => {
  it("renders Coverage Overview, Test Gap Analysis, and Flaky Tests tabs", () => {
    currentPathname = "/reports/test-coverage";
    const html = renderToStaticMarkup(<QualityViewSwitcher />);
    expect(html).toContain('href="/reports/test-coverage"');
    expect(html).toContain('href="/reports/test-gap"');
    expect(html).toContain('href="/reports/flaky-tests"');
    expect(html).toContain("Coverage Overview");
    expect(html).toContain("Test Gap Analysis");
    expect(html).toContain("Flaky Tests");
  });
});

describe("DeliveryViewSwitcher", () => {
  it("renders Sprint Burndown and Workload Heatmap tabs", () => {
    currentPathname = "/reports/sprint-burndown";
    const html = renderToStaticMarkup(<DeliveryViewSwitcher />);
    expect(html).toContain('href="/reports/sprint-burndown"');
    expect(html).toContain('href="/reports/workload"');
    expect(html).toContain("Sprint Burndown");
    expect(html).toContain("Workload Heatmap");
  });
});
