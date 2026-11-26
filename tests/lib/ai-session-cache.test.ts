/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  saveAiSession,
  getAiSession,
  clearAiSession,
  hasAiDraft,
  isAiDomainProcessing,
  runAiBackgroundProcess,
} from "@/lib/ai-session-cache";

describe("ai-session-cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves and retrieves session from localStorage", () => {
    const saved = saveAiSession("bug", {
      inputPrompt: "User cannot click login button",
      project: "WebPortal",
      status: "idle",
      resultDraft: { title: "Login button not clickable" },
    });

    expect(saved.inputPrompt).toBe("User cannot click login button");
    expect(saved.project).toBe("WebPortal");

    const retrieved = getAiSession("bug");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.inputPrompt).toBe("User cannot click login button");
    expect(retrieved?.resultDraft?.title).toBe("Login button not clickable");
  });

  it("merges partial updates without overwriting existing fields", () => {
    saveAiSession("bug", {
      inputPrompt: "First prompt",
      project: "ProjectA",
      status: "idle",
    });

    saveAiSession("bug", {
      status: "processing",
    });

    const current = getAiSession("bug");
    expect(current?.inputPrompt).toBe("First prompt");
    expect(current?.project).toBe("ProjectA");
    expect(current?.status).toBe("processing");
  });

  it("clears session correctly", () => {
    saveAiSession("test_case", {
      inputPrompt: "Test checkout payment",
      status: "completed",
    });

    expect(hasAiDraft("test_case")).toBe(true);

    clearAiSession("test_case");
    expect(getAiSession("test_case")).toBeNull();
    expect(hasAiDraft("test_case")).toBe(false);
  });

  it("detects draft presence correctly", () => {
    expect(hasAiDraft("test_suite")).toBe(false);

    saveAiSession("test_suite", { inputPrompt: "Suite for auth" });
    expect(hasAiDraft("test_suite")).toBe(true);

    clearAiSession("test_suite");
    expect(hasAiDraft("test_suite")).toBe(false);

    saveAiSession("test_suite", { imageBase64: "data:image/webp;base64,abc" });
    expect(hasAiDraft("test_suite")).toBe(true);
  });

  it("runs background process and stores structured result in cache", async () => {
    const mockData = {
      title: "Generated Ticket",
      description: "Step 1, Step 2",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: mockData }),
    } as any);

    let completedResult: any = null;
    const promise = runAiBackgroundProcess({
      domain: "bug",
      action: "enhance_bug",
      payload: { prompt: "Bug prompt", project: "Alpha" },
      onCompleted: (res) => {
        completedResult = res;
      },
    });

    expect(isAiDomainProcessing("bug")).toBe(true);

    const result = await promise;
    expect(result).toEqual(mockData);
    expect(completedResult).toEqual(mockData);

    const cached = getAiSession("bug");
    expect(cached?.status).toBe("completed");
    expect(cached?.resultDraft).toEqual(mockData);
  });

  it("handles background process errors gracefully and resets status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Provider quota exceeded" }),
    } as any);

    let errorCaught: Error | null = null;
    await expect(
      runAiBackgroundProcess({
        domain: "test_plan",
        action: "analyze_issue_text",
        payload: { text: "Some plan" },
        onError: (err) => {
          errorCaught = err;
        },
      }),
    ).rejects.toThrow("Provider quota exceeded");

    expect((errorCaught as Error | null)?.message).toBe("Provider quota exceeded");
    const cached = getAiSession("test_plan");
    expect(cached?.status).toBe("idle");
  });
});
