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

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDate: (val: string) => val,
}));

vi.mock("@phosphor-icons/react", () => ({
  CheckCircle: (props: Record<string, unknown>) => <svg data-testid="check-circle" {...props} />,
  XCircle: (props: Record<string, unknown>) => <svg data-testid="x-circle" {...props} />,
  Warning: (props: Record<string, unknown>) => <svg data-testid="warning" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock" {...props} />,
  FileText: (props: Record<string, unknown>) => <svg data-testid="file-text" {...props} />,
  PlayCircle: (props: Record<string, unknown>) => <svg data-testid="play-circle" {...props} />,
  ArrowsClockwise: (props: Record<string, unknown>) => <svg data-testid="arrows-clockwise" {...props} />,
  Archive: (props: Record<string, unknown>) => <svg data-testid="archive" {...props} />,
  Calendar: (props: Record<string, unknown>) => <svg data-testid="calendar" {...props} />,
  User: (props: Record<string, unknown>) => <svg data-testid="user" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="arrow-right" {...props} />,
  Play: (props: Record<string, unknown>) => <svg data-testid="play" {...props} />,
  ArrowSquareOut: (props: Record<string, unknown>) => <svg data-testid="arrow-square-out" {...props} />,
  DotsThreeVertical: (props: Record<string, unknown>) => <svg data-testid="dots" {...props} />,
  PencilSimple: (props: Record<string, unknown>) => <svg data-testid="pencil" {...props} />,
  Trash: (props: Record<string, unknown>) => <svg data-testid="trash" {...props} />,
  Funnel: (props: Record<string, unknown>) => <svg data-testid="funnel" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x" {...props} />,
  Table: (props: Record<string, unknown>) => <svg data-testid="table" {...props} />,
  Kanban: (props: Record<string, unknown>) => <svg data-testid="kanban" {...props} />,
  ClipboardText: (props: Record<string, unknown>) => <svg data-testid="clipboard-text" {...props} />,
  Checks: (props: Record<string, unknown>) => <svg data-testid="checks" {...props} />,
  Sparkle: (props: Record<string, unknown>) => <svg data-testid="sparkle" {...props} />,
  CaretDown: (props: Record<string, unknown>) => <svg data-testid="caret-down" {...props} />,
  CaretUp: (props: Record<string, unknown>) => <svg data-testid="caret-up" {...props} />,
  FolderSimple: (props: Record<string, unknown>) => <svg data-testid="folder" {...props} />,
  CircleNotch: (props: Record<string, unknown>) => <svg data-testid="circle-notch" {...props} />,
  SquaresFour: (props: Record<string, unknown>) => <svg data-testid="squares-four" {...props} />,
  Check: (props: Record<string, unknown>) => <svg data-testid="check" {...props} />,
  Lightning: (props: Record<string, unknown>) => <svg data-testid="lightning" {...props} />,
  ListBullets: (props: Record<string, unknown>) => <svg data-testid="list-bullets" {...props} />,
}));

import { TestPlanLibrary } from "@/app/test-plans/test-plan-library";
import type { TestPlanItem } from "@/components/test-management/test-plan-kanban-board";

afterEach(() => {
  cleanup();
});

const mockPlans: TestPlanItem[] = [
  {
    id: 1,
    publicToken: "plan-token-1",
    title: "Sprint 14 Regression Plan",
    project: "ECOSHOP",
    sprint: "Sprint 14",
    scope: "Checkout flows and payment tests",
    status: "active",
    startDate: "2026-11-20",
    endDate: "2026-11-30",
    assignee: "Wahyu",
    notes: "",
    suiteCount: 2,
    caseCount: 20,
    passedCount: 15,
    failedCount: 2,
    blockedCount: 1,
    pendingCount: 2,
    completionRate: 90,
  },
  {
    id: 2,
    publicToken: "plan-token-2",
    title: "Mobile App 2.0 Hardening",
    project: "MOBILE",
    sprint: "Release 2.0",
    scope: "API contract testing",
    status: "draft",
    startDate: "2026-12-01",
    endDate: "2026-12-10",
    assignee: "Budi",
    notes: "",
    suiteCount: 1,
    caseCount: 10,
    passedCount: 0,
    failedCount: 0,
    blockedCount: 0,
    pendingCount: 10,
    completionRate: 0,
  },
];

describe("TestPlanLibrary", () => {
  it("renders the test plans in table view by default", () => {
    render(<TestPlanLibrary plans={mockPlans} projectOptions={["ECOSHOP", "MOBILE"]} />);
    expect(screen.getByText("Sprint 14 Regression Plan")).not.toBeNull();
    expect(screen.getByText("Mobile App 2.0 Hardening")).not.toBeNull();
    expect(screen.getByText("New Test Plan")).not.toBeNull();
  });

  it("switches to kanban view when clicking Kanban button", () => {
    render(<TestPlanLibrary plans={mockPlans} projectOptions={["ECOSHOP", "MOBILE"]} />);
    const kanbanBtn = screen.getByTitle("Kanban Board");
    fireEvent.click(kanbanBtn);

    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Completed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Archived").length).toBeGreaterThanOrEqual(1);
  });

  it("opens the creation modal when clicking New Test Plan", () => {
    render(<TestPlanLibrary plans={mockPlans} projectOptions={["ECOSHOP", "MOBILE"]} />);
    const newBtn = screen.getByText("New Test Plan");
    fireEvent.click(newBtn);

    expect(screen.getByText("Auto (AI)")).not.toBeNull();
    expect(screen.getByText("Manual")).not.toBeNull();
    expect(screen.getByText("Structure & Review")).not.toBeNull();
  });
});
