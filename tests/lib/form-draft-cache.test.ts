/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  saveFormDraft,
  getFormDraft,
  hasFormDraft,
  clearFormDraft,
  clearMenuDraftsExcept,
  getMenuKey,
} from "@/lib/form-draft-cache";

describe("form-draft-cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getMenuKey", () => {
    it("maps pathnames to canonical menu roots", () => {
      expect(getMenuKey("/bugs")).toBe("/bugs");
      expect(getMenuKey("/bugs/123")).toBe("/bugs");
      expect(getMenuKey("/tasks")).toBe("/tasks");
      expect(getMenuKey("/gantt")).toBe("/tasks");
      expect(getMenuKey("/test-cases")).toBe("/test-cases");
      expect(getMenuKey("/test-suites")).toBe("/test-cases");
      expect(getMenuKey("/test-plans")).toBe("/test-cases");
      expect(getMenuKey("/test-execution")).toBe("/test-cases");
      expect(getMenuKey("/projects")).toBe("/projects");
      expect(getMenuKey("/dashboard")).toBe("/dashboard");
      expect(getMenuKey("/my-work")).toBe("/my-work");
      expect(getMenuKey("/daily-work")).toBe("/daily-work");
      expect(getMenuKey("/work-logs")).toBe("/daily-work");
      expect(getMenuKey("/weekly-report")).toBe("/reports");
      expect(getMenuKey("/reports")).toBe("/reports");
      expect(getMenuKey("/settings")).toBe("/settings");
    });
  });

  describe("saveFormDraft and getFormDraft", () => {
    it("saves and retrieves draft within the same menu", () => {
      saveFormDraft(
        "quick_task",
        { title: "Fix payment timeout", priority: "High" },
        "/tasks",
      );

      expect(hasFormDraft("quick_task", "/tasks")).toBe(true);

      const draft = getFormDraft<{ title: string; priority: string }>(
        "quick_task",
        "/tasks",
      );
      expect(draft).not.toBeNull();
      expect(draft?.title).toBe("Fix payment timeout");
      expect(draft?.priority).toBe("High");
    });

    it("purges and returns null when retrieved from a different menu", () => {
      saveFormDraft(
        "quick_task",
        { title: "Task for sprint 2" },
        "/tasks",
      );

      // User switched to /bugs
      const draft = getFormDraft("quick_task", "/bugs");
      expect(draft).toBeNull();
      // Storage should be cleared
      expect(hasFormDraft("quick_task", "/tasks")).toBe(false);
    });

    it("does not save empty draft objects and clears existing draft if cleared", () => {
      saveFormDraft("streamlined_bug", { title: "Error on checkout" }, "/bugs");
      expect(hasFormDraft("streamlined_bug", "/bugs")).toBe(true);

      saveFormDraft("streamlined_bug", { title: "" }, "/bugs");
      expect(hasFormDraft("streamlined_bug", "/bugs")).toBe(false);
    });

    it("clears draft explicitly", () => {
      saveFormDraft("test_suite_manual", { title: "Auth Suite" }, "/test-cases");
      expect(hasFormDraft("test_suite_manual", "/test-cases")).toBe(true);

      clearFormDraft("test_suite_manual");
      expect(hasFormDraft("test_suite_manual", "/test-cases")).toBe(false);
    });
  });

  describe("clearMenuDraftsExcept", () => {
    it("purges drafts from other menus while preserving drafts in active menu", () => {
      saveFormDraft("streamlined_bug", { title: "Bug 1" }, "/bugs");
      saveFormDraft("quick_task", { title: "Task 1" }, "/tasks");
      saveFormDraft("test_suite", { title: "Suite 1" }, "/test-cases");

      // Also set an AI session for another menu
      localStorage.setItem("aksora_ai_session_bug", JSON.stringify({ inputPrompt: "AI bug notes" }));
      localStorage.setItem("aksora_ai_session_test_case", JSON.stringify({ inputPrompt: "AI test notes" }));

      // User navigates to /tasks
      clearMenuDraftsExcept("/tasks");

      // /tasks draft is retained
      expect(getFormDraft("quick_task", "/tasks")).toEqual({ title: "Task 1" });

      // /bugs and /test-cases drafts are deleted
      expect(localStorage.getItem("aksora_form_draft_streamlined_bug")).toBeNull();
      expect(localStorage.getItem("aksora_form_draft_test_suite")).toBeNull();

      // aksora_ai_session_bug was purged because it belongs to /bugs, but test_case or tasks are retained/handled
      expect(localStorage.getItem("aksora_ai_session_bug")).toBeNull();
    });
  });
});
