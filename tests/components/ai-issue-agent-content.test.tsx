/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AiIssueAgentContent } from "@/components/bugs/ai-issue-agent-content";
import * as aiKeys from "@/lib/ai-keys";

describe("AiIssueAgentContent", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const defaultProps = {
    defaultProject: "VanApp",
    selectedProject: "VanApp",
    onSwitchToManual: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders without Auto-Create Bug button and displays Structure & Review as primary action", () => {
    vi.spyOn(aiKeys, "getActiveAiConfig").mockReturnValue({
      provider: "google",
      model: "gemini-2.0-flash",
    });

    render(<AiIssueAgentContent {...defaultProps} />);

    // Auto-Create Bug button must NOT exist
    expect(screen.queryByRole("button", { name: /auto-create bug/i })).toBeNull();

    // Structure & Review button must exist
    const structureBtn = screen.getByRole("button", { name: /structure & review/i });
    expect(structureBtn).toBeDefined();

    // AI Engine indicator should display Google Gemini
    expect(screen.getByText(/google gemini/i)).toBeDefined();
  });

  it("handles Structure & Review and preserves BugSnap URL into evidence", async () => {
    vi.spyOn(aiKeys, "isAiConfigured").mockReturnValue(true);
    vi.spyOn(aiKeys, "getActiveAiConfig").mockReturnValue({
      provider: "google",
      model: "gemini-2.0-flash",
    });
    vi.spyOn(aiKeys, "getActiveAiCredentials").mockReturnValue({
      provider: "google",
      model: "gemini-2.0-flash",
      apiKey: "test-key",
    });

    const mockResponseTicket = {
      title: "[Brainstorming] - Judul belum membuat detail singkat",
      module: "Brainstorming",
      bugType: "Functional",
      project: "VanApp",
      severity: "high",
      priority: "P1",
      stepsToReproduce: "1. Buka Prompt Lab\n2. Klik Brainstorming",
      expectedResult: "Judul tergenerate otomatis",
      actualResult: "Judul belum membuat detail singkat",
      evidence: "",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          ticket: mockResponseTicket,
        },
      }),
    });

    const handleSwitchToManual = vi.fn();
    render(<AiIssueAgentContent {...defaultProps} onSwitchToManual={handleSwitchToManual} />);

    const textarea = screen.getByPlaceholderText(/describe the defect/i);
    const inputContent =
      "https://bugsnap.akusaraproject.my.id/v/4028ab27-4282-4c36-8229-082cfffca9b9\n\nuntuk judul/title brainstorming belum membuat detail singkat untuk generate judul sesuai sesi awal user di prompt lab";

    fireEvent.change(textarea, { target: { value: inputContent } });

    const structureBtn = screen.getByRole("button", { name: /structure & review/i });
    fireEvent.click(structureBtn);

    await waitFor(() => {
      expect(handleSwitchToManual).toHaveBeenCalledTimes(1);
    });

    const receivedDraft = handleSwitchToManual.mock.calls[0][0];
    expect(receivedDraft.title).toBe("[Brainstorming] - Judul belum membuat detail singkat");
    expect(receivedDraft.module).toBe("Brainstorming");
    expect(receivedDraft.evidence).toBe("https://bugsnap.akusaraproject.my.id/v/4028ab27-4282-4c36-8229-082cfffca9b9");
  });
});
