/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StreamlinedBugForm } from "@/components/bugs/streamlined-bug-form";

describe("StreamlinedBugForm", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    projectOptions: [{ label: "Project Alpha", value: "Project Alpha" }],
    defaultProject: "Project Alpha",
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("renders essential fields and handles submission", () => {
    const handleSubmit = vi.fn();
    render(<StreamlinedBugForm {...defaultProps} onSubmit={handleSubmit} />);

    // Check essential fields
    const titleInput = screen.getByPlaceholderText(/e\.g\. checkout button unresponsive/i);
    expect(titleInput).toBeDefined();

    fireEvent.change(titleInput, { target: { value: "Cart total calculation bug" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /create bug/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submittedPayload = handleSubmit.mock.calls[0][0];
    expect(submittedPayload.title).toBe("Cart total calculation bug");
    expect(submittedPayload.project).toBe("Project Alpha");
    expect(submittedPayload.severity).toBe("medium");
  });

  it("allows toggling optional details accordion", () => {
    render(<StreamlinedBugForm {...defaultProps} />);

    const optionalTrigger = screen.getByRole("button", { name: /additional details/i });
    expect(optionalTrigger).toBeDefined();

    // Initially optional inputs like Suggested Dev should not be visible or expanded
    fireEvent.click(optionalTrigger);

    // After clicking, the field should be present
    const devInput = screen.getByPlaceholderText(/e\.g\. dev@company\.com/i);
    expect(devInput).toBeDefined();
  });
});
