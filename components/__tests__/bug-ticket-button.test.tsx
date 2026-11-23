/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BugTicketButton } from "@/components/bugs/bug-ticket-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("BugTicketButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders 'Create ticket' button when no externalTicket is linked", () => {
    render(<BugTicketButton bugId={123} externalTicket="" />);

    expect(screen.getByRole("button", { name: /create ticket/i })).toBeDefined();
    expect(screen.queryByText(/pushed/i)).toBeNull();
  });

  it("renders 'Pushed (BUG-170)' badge when externalTicket is present as key", () => {
    render(<BugTicketButton bugId={123} externalTicket="BUG-170" />);

    expect(screen.getByText("Pushed (BUG-170)")).toBeDefined();
    expect(screen.queryByRole("button", { name: /create ticket/i })).toBeNull();
  });

  it("renders clickable 'Pushed (BUG-170)' link when externalTicket is a URL", () => {
    render(
      <BugTicketButton
        bugId={123}
        externalTicket="https://jira.company.com/browse/BUG-170"
      />
    );

    const link = screen.getByRole("link", { name: /pushed \(bug-170\)/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://jira.company.com/browse/BUG-170");
  });

  it("renders 'Create ticket' button matching rectangular box (rounded-sm) style", () => {
    render(<BugTicketButton bugId={123} externalTicket="" size="sm" />);

    const button = screen.getByRole("button", { name: /create ticket/i });
    expect(button).toBeDefined();
    expect(button.className).toContain("rounded-sm");
    expect(button.className).toContain("border-gray-200");
  });

  it("renders 'Pushed' badge matching rectangular box (rounded-sm) style", () => {
    render(<BugTicketButton bugId={123} externalTicket="BUG-170" size="sm" />);

    const badgeText = screen.getByText("Pushed (BUG-170)");
    expect(badgeText).toBeDefined();
    const container = badgeText.parentElement;
    expect(container?.className).toContain("rounded-sm");
    expect(container?.className).toContain("border-emerald-200");
  });
});
