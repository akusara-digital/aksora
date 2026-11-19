import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let currentPathname = "/work-logs";

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

import { TopBreadcrumbs, getDefaultCrumbsForPath } from "@/components/layout/breadcrumb";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";

describe("TopBreadcrumbs", () => {
  it("derives default breadcrumbs for /work-logs at the top", () => {
    currentPathname = "/work-logs";
    const html = renderToStaticMarkup(
      <BreadcrumbProvider>
        <TopBreadcrumbs />
      </BreadcrumbProvider>
    );
    expect(html).toContain("Notes &amp; Vault");
    expect(html).toContain("Work Logs");
  });

  it("derives default breadcrumbs for /reports/test-coverage at the top", () => {
    currentPathname = "/reports/test-coverage";
    const html = renderToStaticMarkup(
      <BreadcrumbProvider>
        <TopBreadcrumbs />
      </BreadcrumbProvider>
    );
    expect(html).toContain("Reports");
    expect(html).toContain("Test Coverage");
  });

  it("derives default breadcrumbs for /tasks and /bugs", () => {
    expect(getDefaultCrumbsForPath("/tasks")).toEqual([
      { label: "Tasks", href: "/tasks" },
      { label: "Tasks Board" },
    ]);
    expect(getDefaultCrumbsForPath("/bugs")).toEqual([
      { label: "Bugs", href: "/bugs" },
      { label: "Bug Tracker" },
    ]);
  });
});
