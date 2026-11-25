// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExecutionSuiteCards } from "@/app/test-execution/execution-suite-cards";

afterEach(() => {
  cleanup();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const MOCK_SUITES = [
  {
    id: 101,
    title: "Authentication Test Suite",
    status: "active",
    assignee: "Alice Tester",
    notes: "Core auth flows",
    publicToken: "tok_auth_123",
    testPlanId: "1",
    caseCount: 8,
    project: "Billing App",
    planName: "Sprint 24 Plan",
    lastRun: {
      id: 201,
      runNumber: 3,
      status: "in-progress",
      tester: "Alice Tester",
      passed: 5,
      failed: 1,
      blocked: 0,
      totalCases: 8,
      startedAt: "2026-11-25T10:00:00Z",
      completedAt: null,
    },
  },
  {
    id: 102,
    title: "Checkout & Cart Suite",
    status: "active",
    assignee: "Bob QA",
    notes: "E-commerce checkout",
    publicToken: "tok_checkout_456",
    testPlanId: "1",
    caseCount: 12,
    project: "Storefront",
    planName: "Sprint 24 Plan",
    lastRun: {
      id: 202,
      runNumber: 1,
      status: "completed",
      tester: "Bob QA",
      passed: 12,
      failed: 0,
      blocked: 0,
      totalCases: 12,
      startedAt: "2026-11-24T10:00:00Z",
      completedAt: "2026-11-24T10:30:00Z",
    },
  },
];

describe("ExecutionSuiteCards View Mode Switcher", () => {
  it("defaults to Table view and displays suite rows", () => {
    render(
      <ExecutionSuiteCards
        suites={MOCK_SUITES}
        projects={["Billing App", "Storefront"]}
      />,
    );

    expect(screen.getByText("Authentication Test Suite")).not.toBeNull();
    expect(screen.getByText("Checkout & Cart Suite")).not.toBeNull();
    expect(screen.getByRole("table")).not.toBeNull();
  });

  it("switches to Kanban view when clicking Kanban button", () => {
    render(
      <ExecutionSuiteCards
        suites={MOCK_SUITES}
        projects={["Billing App", "Storefront"]}
      />,
    );

    const kanbanBtn = screen.getByTitle("Kanban Board");
    fireEvent.click(kanbanBtn);

    expect(screen.getByText("Ready to Run")).not.toBeNull();
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to Cards view when clicking Cards button", () => {
    render(
      <ExecutionSuiteCards
        suites={MOCK_SUITES}
        projects={["Billing App", "Storefront"]}
      />,
    );

    const cardsBtn = screen.getByTitle("Cards Grid");
    fireEvent.click(cardsBtn);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Authentication Test Suite")).not.toBeNull();
  });
});
