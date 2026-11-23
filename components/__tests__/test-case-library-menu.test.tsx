/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/badge", () => ({
  Badge: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDisplayText: (value: string) => value,
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-circle" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-circle" {...props} />,
  Warning: (props: Record<string, unknown>) => <svg data-testid="warning" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock" {...props} />,
  Checks: (props: Record<string, unknown>) => <svg data-testid="checks" {...props} />,
  DotsThreeVertical: (props: Record<string, unknown>) => <svg data-testid="dots" {...props} />,
  DotsSixVertical: (props: Record<string, unknown>) => <svg data-testid="dots-six" {...props} />,
  PencilSimple: (props: Record<string, unknown>) => <svg data-testid="pencil" {...props} />,
  Table: (props: Record<string, unknown>) => <svg data-testid="table" {...props} />,
  Funnel: (props: Record<string, unknown>) => <svg data-testid="funnel" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x" {...props} />,
  Sparkle: (props: Record<string, unknown>) => <svg data-testid="sparkle" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus" {...props} />,
  Play: (props: Record<string, unknown>) => <svg data-testid="play" {...props} />,
  FolderSimple: (props: Record<string, unknown>) => <svg data-testid="folder" {...props} />,
  FolderPlus: (props: Record<string, unknown>) => <svg data-testid="folder-plus" {...props} />,
  SidebarSimple: (props: Record<string, unknown>) => <svg data-testid="sidebar-simple" {...props} />,
  CaretDown: (props: Record<string, unknown>) => <svg data-testid="caret-down" {...props} />,
  ClockCounterClockwise: (props: Record<string, unknown>) => <svg data-testid="clock-counter-clockwise" {...props} />,
}));

import { TestCaseLibrary } from "@/app/test-cases/test-case-library";

afterEach(() => {
  cleanup();
});

describe("TestCaseLibrary menu", () => {
  it("closes the three-dot menu when clicking outside", () => {
    render(
      <TestCaseLibrary
        cases={[
          {
            id: 1,
            tcId: "TS-001",
            caseName: "Register with valid email and password",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            status: "Passed",
            priority: "High",
            evidence: "",
            suiteTitle: "User Registration",
            suiteToken: "suite-1",
            suiteStatus: "active",
            planTitle: "Sprint 1",
            planProject: "ECOSHOP WEB",
            testSuiteId: 1,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open test case menu/i }));
    expect(screen.getByText("Edit Test Case")).not.toBeNull();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Edit Test Case")).toBeNull();
  });

  it("filters test cases by project and status", () => {
    render(
      <TestCaseLibrary
        cases={[
          {
            id: 1,
            tcId: "TS-001",
            caseName: "Registration Flow",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            evidence: "",
            status: "Passed",
            priority: "High",
            suiteTitle: "User Registration",
            suiteToken: "suite-1",
            suiteStatus: "active",
            planTitle: "Sprint 1",
            planProject: "ECOSHOP WEB",
            testSuiteId: 1,
          },
          {
            id: 2,
            tcId: "TS-002",
            caseName: "Payment Gateway",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            evidence: "",
            status: "Failed",
            priority: "Critical",
            suiteTitle: "Checkout",
            suiteToken: "suite-2",
            suiteStatus: "active",
            planTitle: "Sprint 2",
            planProject: "FINTECH MOBILE",
            testSuiteId: 2,
          },
        ]}
      />,
    );

    // Initial render displays both suites
    expect(screen.getAllByText("User Registration").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Checkout").length).toBeGreaterThan(0);

    // Filter by project ECOSHOP WEB
    const selects = screen.getAllByRole("combobox");
    const projSelect = selects[0];
    fireEvent.change(projSelect, { target: { value: "ECOSHOP WEB" } });

    expect(screen.getAllByText("User Registration").length).toBeGreaterThan(0);
    expect(screen.queryByText("Checkout")).toBeNull();

    // Clear filters
    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);
    expect(screen.getAllByText("Checkout").length).toBeGreaterThan(0);
  });

  it("displays empty suites in the left pane with direct Add First Test Case CTA", () => {
    render(
      <TestCaseLibrary
        cases={[]}
        suites={[
          {
            id: 42,
            title: "Onboarding Smoke Suite",
            publicToken: "suite-42",
            status: "active",
            planTitle: "Release 1.0",
            planProject: "VANAPP",
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Onboarding Smoke Suite").length).toBeGreaterThan(0);
    expect(screen.getByText("No test cases in this suite yet")).not.toBeNull();
    expect(screen.getByRole("button", { name: /add first test case/i })).not.toBeNull();
  });

  it("allows hiding and unhiding the suites left panel", () => {
    render(
      <TestCaseLibrary
        cases={[
          {
            id: 1,
            tcId: "TS-001",
            caseName: "Registration Flow",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            evidence: "",
            status: "Passed",
            priority: "High",
            suiteTitle: "User Registration",
            suiteToken: "suite-1",
            suiteStatus: "active",
            planTitle: "Sprint 1",
            planProject: "ECOSHOP WEB",
            testSuiteId: 1,
          },
        ]}
      />,
    );

    // Initial state: Hide button is present, suites panel is visible
    expect(screen.getAllByRole("button", { name: /hide test suites/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("Suites (1)")).not.toBeNull();

    // Click Hide
    fireEvent.click(screen.getAllByRole("button", { name: /hide test suites/i })[0]);

    // Now suites panel is hidden, Show button is present
    expect(screen.queryByText("Suites (1)")).toBeNull();
    const showBtn = screen.getAllByRole("button", { name: /show test suites/i })[0];
    expect(showBtn).not.toBeNull();

    // Click Show
    fireEvent.click(showBtn);

    // Panel is restored
    expect(screen.getByText("Suites (1)")).not.toBeNull();
  });
});
