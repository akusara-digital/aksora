/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkLogToolsMenu } from "@/components/work-logs/work-log-tools-menu";

describe("WorkLogToolsMenu", () => {
  const defaultProps = {
    onOpenPull: vi.fn(),
    onCopyStandup: vi.fn(),
    onOpenAudit: vi.fn(),
    onSyncSicmundus: vi.fn(),
    copying: false,
    syncingSicmundus: false,
    activeModel: "gpt-4o-mini",
  };

  it("toggles the tools dropdown on button click", () => {
    render(<WorkLogToolsMenu {...defaultProps} />);

    const toolsBtn = screen.getByRole("button", { name: /tools/i });
    expect(toolsBtn).toBeDefined();

    // Menu initially closed
    expect(screen.queryByText(/pull qa activity/i)).toBeNull();

    // Click to open
    fireEvent.click(toolsBtn);
    expect(screen.getByText(/pull qa activity/i)).toBeDefined();
    expect(screen.getByText(/copy standup/i)).toBeDefined();
    expect(screen.getByText(/audit timesheet/i)).toBeDefined();
    expect(screen.getByText(/sync sicmundus/i)).toBeDefined();
    expect(screen.getByText(/gpt-4o-mini/i)).toBeDefined();

    // Trigger action
    const pullBtn = screen.getByText(/pull qa activity/i);
    fireEvent.click(pullBtn);
    expect(defaultProps.onOpenPull).toHaveBeenCalledTimes(1);

    // Menu closed after action
    expect(screen.queryByText(/pull qa activity/i)).toBeNull();
  });
});
