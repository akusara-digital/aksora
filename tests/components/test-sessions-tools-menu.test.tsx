/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestSessionsToolsMenu } from "@/components/test-sessions/test-sessions-tools-menu";

describe("TestSessionsToolsMenu", () => {
  it("toggles the AI reports dropdown on click", () => {
    render(<TestSessionsToolsMenu testerName="QA Tester" />);

    const button = screen.getByRole("button", { name: /ai reports/i });
    expect(button).toBeDefined();

    // Menu initially closed
    expect(screen.queryByText(/generate standup/i)).toBeNull();

    // Click to open
    fireEvent.click(button);
    expect(screen.getByText(/generate standup/i)).toBeDefined();
    expect(screen.getByText(/generate release notes/i)).toBeDefined();

    // Click again to close
    fireEvent.click(button);
    expect(screen.queryByText(/generate standup/i)).toBeNull();
  });
});
