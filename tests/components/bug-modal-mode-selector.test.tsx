/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BugModalModeSelector } from "@/components/bugs/bug-modal-mode-selector";

describe("BugModalModeSelector", () => {
  it("renders manual and AI options and handles selection change", () => {
    const handleChange = vi.fn();
    render(<BugModalModeSelector mode="manual" onChange={handleChange} />);

    // Check desktop buttons
    const manualBtn = screen.getByRole("button", { name: /manual/i });
    const aiBtn = screen.getByRole("button", { name: /by ai/i });
    expect(manualBtn).toBeDefined();
    expect(aiBtn).toBeDefined();

    // Clicking AI triggers onChange("ai")
    fireEvent.click(aiBtn);
    expect(handleChange).toHaveBeenCalledWith("ai");

    // Check mobile select
    const select = screen.getByLabelText("Creation Mode") as HTMLSelectElement;
    expect(select.value).toBe("manual");
    fireEvent.change(select, { target: { value: "ai" } });
    expect(handleChange).toHaveBeenCalledWith("ai");
  });
});
