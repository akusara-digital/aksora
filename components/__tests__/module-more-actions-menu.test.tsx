/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModuleMoreActionsMenu } from "@/components/module/module-more-actions-menu";

describe("ModuleMoreActionsMenu", () => {
  it("toggles the dropdown menu on button click", () => {
    render(<ModuleMoreActionsMenu module="bugs" canAdd={true} />);

    const menuButton = screen.getByRole("button", { name: /more actions/i });
    expect(menuButton).toBeDefined();

    // Menu dropdown initially closed
    expect(screen.queryByText(/export to excel/i)).toBeNull();

    // Click to open
    fireEvent.click(menuButton);
    expect(screen.getByText(/export to excel/i)).toBeDefined();
    expect(screen.getByText(/export \/ print pdf/i)).toBeDefined();

    // Click again to close
    fireEvent.click(menuButton);
    expect(screen.queryByText(/export to excel/i)).toBeNull();
  });
});
