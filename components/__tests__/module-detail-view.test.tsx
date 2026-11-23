/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

// Mock @phosphor-icons/react — stubs for every icon the detail view tree imports.
vi.mock("@phosphor-icons/react", () => {
  function IconStub({ name, ...props }: { name: string } & Record<string, unknown>) {
    return <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />;
  }
  const icons = [
    "ArrowLeft", "DotsThree", "PencilSimple", "Trash", "PaperPlaneTilt", "Paperclip",
    "Note", "X", "ArrowSquareOut", "ArrowsClockwise", "Plus", "Cpu", "Bug", "Kanban",
    "ClipboardText", "PlayCircle", "Table", "Users", "Gear", "RocketLaunch", "Clock",
    "Checks",
  ];
  return Object.fromEntries(
    icons.map((name) => [name, (props: Record<string, unknown>) => <IconStub name={name} {...props} />])
  );
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/bugs",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/shared/copy-link-button", () => ({
  CopyLinkButton: () => <button data-testid="copy-link-btn">Copy</button>,
}));

vi.mock("@/components/layout/breadcrumb", () => ({
  Breadcrumb: ({ crumbs }: { crumbs: Array<{ label: string }> }) => (
    <nav>{crumbs.map((crumb) => crumb.label).join(" / ")}</nav>
  ),
}));

vi.mock("@/hooks/use-collaboration-presence", () => ({
  useCollaborationPresence: () => ({ editors: [] }),
}));

vi.mock("@/components/module/module-view-modal-parts", () => ({
  ImageLightbox: () => null,
  ActivityTab: () => <div data-testid="activity-tab" />,
  renderEvidence: () => null,
}));

vi.mock("@/components/bugs/ai-bug-to-case-button", () => ({ AiBugToCaseButton: () => null }));
vi.mock("@/components/bugs/bug-triage-button", () => ({ BugTriageButton: () => null }));
vi.mock("@/components/bugs/bug-ticket-button", () => ({ BugTicketButton: () => null }));
vi.mock("@/components/tasks/ai-task-to-cases-button", () => ({ AiTaskToCasesButton: () => null }));
vi.mock("@/components/test-management/ai-export-automation-button", () => ({ AiExportAutomationButton: () => null }));
vi.mock("@/components/test-sessions/ai-session-summary-button", () => ({ AiSessionSummaryButton: () => null }));
vi.mock("@/components/tasks/sicmundus-sync-modal", () => ({ SicmundusSyncModal: () => null }));
vi.mock("@/components/tasks/sicmundus-sync-parts", () => ({ workLogToSicmundusProp: () => ({}) }));

import { ModuleDetailView } from "@/components/module/module-detail-view";

const baseProps = {
  row: { id: 1, title: "Test Bug", status: "open", code: "BUG-001" },
  config: {
    shortTitle: "Bug",
    fields: [
      { name: "title", label: "Title", kind: "text" },
      { name: "status", label: "Status", kind: "select", options: [{ label: "Open", value: "open" }] },
    ],
  },
  fieldIcons: {},
  onClose: vi.fn(),
  onEdit: vi.fn(),
  canEdit: true,
  module: "bugs",
};

describe("ModuleDetailView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the item title and code", () => {
    render(<ModuleDetailView {...baseProps} />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
    expect(screen.getAllByText("BUG-001").length).toBeGreaterThan(0);
  });

  it("renders without initialTab prop (uses default)", () => {
    render(<ModuleDetailView {...baseProps} />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("silently ignores invalid initialTab", () => {
    render(<ModuleDetailView {...baseProps} initialTab="nonexistent-tab" />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("silently ignores null initialTab", () => {
    render(<ModuleDetailView {...baseProps} initialTab={null} />);
    expect(screen.getByRole("heading", { name: "Test Bug" })).toBeDefined();
  });

  it("scrolls to the activity section when initialTab is activity", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const onTabChange = vi.fn();
    render(<ModuleDetailView {...baseProps} initialTab="activity" onTabChange={onTabChange} />);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(onTabChange).toHaveBeenCalledWith("activity");
  });

  it("renders Edit button when canEdit is true", () => {
    render(<ModuleDetailView {...baseProps} />);
    expect(screen.getByText("Edit")).toBeDefined();
  });
});
