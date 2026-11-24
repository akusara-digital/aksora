/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/test-execution/token/run/1",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/auto-resize-textarea", () => ({
  AutoResizeTextarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@/components/shared/evidence-upload-field", () => ({
  EvidenceUploadField: () => <div data-testid="evidence-upload" />,
}));

vi.mock("@/components/test-management/ai-vision-inspector", () => ({
  AiVisionInspector: () => <div data-testid="ai-vision" />,
}));

vi.mock("@/components/test-management/execution-matrix-view", () => ({
  ExecutionMatrixView: () => <div data-testid="matrix-view" />,
}));

vi.mock("@/components/bugs/quick-bug-modal", () => ({
  QuickBugModal: () => null,
}));

vi.mock("@/run-play-mode", () => ({
  RunPlayMode: () => null,
}));

import { RunExecutionView } from "@/app/test-execution/[id]/run/[runId]/run-execution-view";

afterEach(() => {
  cleanup();
});

describe("RunExecutionView", () => {
  const mockRun = {
    id: 1,
    runNumber: 1,
    status: "in_progress",
    tester: "Tester",
    totalCases: 2,
    passed: 1,
    failed: 0,
    blocked: 0,
    notes: "",
    startedAt: "2026-11-23T00:00:00Z",
  };

  const mockSuite = {
    title: "Checkout Flow",
    publicToken: "suite-tok-1",
    project: "Ecommerce",
    sprint: "Sprint 1",
  };

  const mockCases = [
    {
      verdictId: 101,
      testCaseId: 1,
      tcId: "TC-001",
      caseName: "Apply coupon discount",
      preCondition: "Cart has items",
      testStep: "Enter valid coupon",
      expectedResult: "Discount applied",
      actualResult: "Applied 10%",
      verdict: "Passed",
      evidence: "",
      duration: 10,
      priority: "High",
      typeCase: "Functional",
    },
    {
      verdictId: 102,
      testCaseId: 2,
      tcId: "TC-002",
      caseName: "Pay with credit card",
      preCondition: "User logged in",
      testStep: "Submit card details",
      expectedResult: "Payment success",
      actualResult: "",
      verdict: "Pending",
      evidence: "",
      duration: 0,
      priority: "Critical",
      typeCase: "Functional",
    },
  ];

  it("toggles the case list visibility between hidden and visible", () => {
    render(
      <RunExecutionView
        run={mockRun}
        suite={mockSuite}
        cases={mockCases}
      />
    );

    // Initial state: case list is open, "Hide Cases" toggle exists
    const hideBtn = screen.getByRole("button", { name: /hide cases list/i });
    expect(hideBtn).not.toBeNull();
    expect(screen.getByText("Cases (2)")).not.toBeNull();

    // Click Hide Cases
    fireEvent.click(hideBtn);

    // Case list heading is now hidden
    expect(screen.queryByText("Cases (2)")).toBeNull();

    // Show Cases buttons are available in toolbar and case header
    const showBtns = screen.getAllByRole("button", { name: /show cases list/i });
    expect(showBtns.length).toBeGreaterThan(0);

    // Click Show Cases
    fireEvent.click(showBtns[0]);

    // Case list restored
    expect(screen.getByText("Cases (2)")).not.toBeNull();
  });
});
