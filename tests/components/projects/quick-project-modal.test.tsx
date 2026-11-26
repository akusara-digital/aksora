// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuickProjectModal } from "@/components/projects/quick-project-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("QuickProjectModal", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-fills Project Key from Project Name (max 4 chars) like Jira", () => {
    render(<QuickProjectModal isOpen={true} onClose={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText("e.g. Mobile App, E-Commerce Platform");
    const keyInput = screen.getByPlaceholderText("Auto-generated if left empty") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "vanapp" } });
    expect(keyInput.value).toBe("VANA");

    fireEvent.change(nameInput, { target: { value: "E-Commerce Platform" } });
    expect(keyInput.value).toBe("ECP");

    fireEvent.change(nameInput, { target: { value: "Super Duper Long Project Name" } });
    expect(keyInput.value).toBe("SDLP");
  });

  it("allows manual editing of Project Key without locking and preserves manual value", () => {
    render(<QuickProjectModal isOpen={true} onClose={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText("e.g. Mobile App, E-Commerce Platform");
    const keyInput = screen.getByPlaceholderText("Auto-generated if left empty") as HTMLInputElement;

    expect(keyInput.disabled).toBe(false);
    expect(keyInput.readOnly).toBe(false);
    expect(keyInput.maxLength).toBe(4);

    fireEvent.change(nameInput, { target: { value: "vanapp" } });
    expect(keyInput.value).toBe("VANA");

    // Manual override (sanitized to uppercase alphanumeric, max 4 chars)
    fireEvent.change(keyInput, { target: { value: "custom-12" } });
    expect(keyInput.value).toBe("CUST");

    // Changing project name should not overwrite manual key
    fireEvent.change(nameInput, { target: { value: "Another Project" } });
    expect(keyInput.value).toBe("CUST");

    // Clearing manual key re-enables auto-generation on subsequent name changes
    fireEvent.change(keyInput, { target: { value: "" } });
    expect(keyInput.value).toBe("");
    fireEvent.change(nameInput, { target: { value: "vanapp" } });
    expect(keyInput.value).toBe("VANA");
  });
});
