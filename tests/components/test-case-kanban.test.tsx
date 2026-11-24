/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-circle" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-circle" {...props} />,
  Warning: (props: Record<string, unknown>) => <svg data-testid="warning" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock" {...props} />,
  SquaresFour: (props: Record<string, unknown>) => <svg data-testid="squares-four" {...props} />,
  User: (props: Record<string, unknown>) => <svg data-testid="user" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="arrow-right" {...props} />,
}));

import { TestCaseKanbanBoard } from "@/components/test-management/test-case-kanban-board";
import type { TestCase } from "@/components/test-management/test-case-table";

afterEach(() => {
  cleanup();
});

const mockCases: TestCase[] = [
  {
    id: 101,
    tcId: "TC-101",
    caseName: "Login with valid credentials",
    typeCase: "Positive",
    preCondition: "User is on login page",
    testStep: "1. Enter email\n2. Enter password",
    expectedResult: "User is logged in",
    actualResult: "",
    status: "Passed",
    priority: "High",
    suiteTitle: "Authentication Suite",
    suiteToken: "auth-suite",
    suiteStatus: "active",
    planTitle: "Sprint 1",
    planProject: "CORE APP",
    testSuiteId: 1,
  },
  {
    id: 102,
    tcId: "TC-102",
    caseName: "Login with invalid password",
    typeCase: "Negative",
    preCondition: "User is on login page",
    testStep: "1. Enter wrong password",
    expectedResult: "Error message displayed",
    actualResult: "",
    status: "Pending",
    priority: "Medium",
    suiteTitle: "Authentication Suite",
    suiteToken: "auth-suite",
    suiteStatus: "active",
    planTitle: "Sprint 1",
    planProject: "CORE APP",
    testSuiteId: 1,
  },
];

describe("TestCaseKanbanBoard", () => {
  it("renders 4 kanban columns", () => {
    render(<TestCaseKanbanBoard cases={mockCases} />);
    expect(screen.getByText("Pending")).not.toBeNull();
    expect(screen.getByText("Passed")).not.toBeNull();
    expect(screen.getByText("Failed")).not.toBeNull();
    expect(screen.getByText("Blocked")).not.toBeNull();
  });

  it("renders test cases into correct status columns", () => {
    render(<TestCaseKanbanBoard cases={mockCases} />);
    expect(screen.getByText("Login with valid credentials")).not.toBeNull();
    expect(screen.getByText("Login with invalid password")).not.toBeNull();
    expect(screen.getByText("TC-101")).not.toBeNull();
    expect(screen.getByText("TC-102")).not.toBeNull();
  });

  it("calls onSelectCase when a card is clicked", () => {
    const handleSelect = vi.fn();
    render(<TestCaseKanbanBoard cases={mockCases} onSelectCase={handleSelect} />);
    fireEvent.click(screen.getByText("Login with valid credentials"));
    expect(handleSelect).toHaveBeenCalledWith(mockCases[0]);
  });

  it("calls onAddCase when add button in Pending column is clicked", () => {
    const handleAdd = vi.fn();
    render(<TestCaseKanbanBoard cases={mockCases} onAddCase={handleAdd} />);
    const addBtn = screen.getByTitle("Add Test Case");
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
