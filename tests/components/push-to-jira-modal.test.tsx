/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PushToJiraModal } from "@/components/bugs/push-to-jira-modal";

describe("PushToJiraModal", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    devOptions: [
      { label: "Alice", value: "alice@company.com" },
      { label: "Bob", value: "bob@company.com" },
    ],
    defaultAssignee: "",
    defaultModule: "Brainstorming",
    defaultProject: "VanApp",
    submitting: false,
    onConfirmPush: vi.fn(),
    onSaveWithoutPush: vi.fn(),
  };

  it("renders modal header, subtitle, and dropdown fields", () => {
    render(<PushToJiraModal {...defaultProps} />);

    expect(screen.getByText("Push to Jira Confirmation")).toBeDefined();
    expect(screen.getByText("Confirm assignee, environment, and scope label before uploading to Jira.")).toBeDefined();
    expect(screen.getByText("Select Assignee (optional):")).toBeDefined();
    expect(screen.getByText("Select Environment Label:")).toBeDefined();
    expect(screen.getByText("Select Scope / Domain Label (optional):")).toBeDefined();
  });

  it("renders 'Push without Assignee' button when assignee is unassigned", () => {
    render(<PushToJiraModal {...defaultProps} defaultAssignee="" />);
    expect(screen.getByRole("button", { name: /push without assignee/i })).toBeDefined();
  });

  it("changes button to 'Push to Jira' when an assignee is selected", () => {
    render(<PushToJiraModal {...defaultProps} />);
    const selects = screen.getAllByRole("combobox");
    const assigneeSelect = selects[0];

    fireEvent.change(assigneeSelect, { target: { value: "alice@company.com" } });
    expect(screen.getByRole("button", { name: /push to jira/i })).toBeDefined();
  });

  it("calls onConfirmPush with selected config on push click", () => {
    const handleConfirmPush = vi.fn();
    render(<PushToJiraModal {...defaultProps} onConfirmPush={handleConfirmPush} />);

    const pushBtn = screen.getByRole("button", { name: /push without assignee/i });
    fireEvent.click(pushBtn);

    expect(handleConfirmPush).toHaveBeenCalledWith({
      assignee: "",
      assigneeName: "",
      environment: "Development",
      scope: "Brainstorming",
    });
  });

  it("calls onSaveWithoutPush when 'Save in Aksora' is clicked", () => {
    const handleSaveWithoutPush = vi.fn();
    render(<PushToJiraModal {...defaultProps} onSaveWithoutPush={handleSaveWithoutPush} />);

    const saveBtn = screen.getByRole("button", { name: /save in aksora/i });
    fireEvent.click(saveBtn);

    expect(handleSaveWithoutPush).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is clicked", () => {
    const handleClose = vi.fn();
    render(<PushToJiraModal {...defaultProps} onClose={handleClose} />);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
