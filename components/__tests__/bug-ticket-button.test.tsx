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
});
