/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

describe("AutoResizeTextarea height synchronization", () => {
  afterEach(() => {
    cleanup();
  });

  it("synchronizes height between textareas sharing the same syncGroup", () => {
    const { container } = render(
      <form>
        <AutoResizeTextarea
          syncGroup="test-group"
          data-testid="textarea-1"
          defaultValue="Line 1\nLine 2\nLine 3"
        />
        <AutoResizeTextarea
          syncGroup="test-group"
          data-testid="textarea-2"
          defaultValue="Short"
        />
      </form>,
    );

    const [ta1, ta2] = container.querySelectorAll("textarea");

    // Mock scrollHeight
    Object.defineProperty(ta1, "scrollHeight", { configurable: true, value: 95 });
    Object.defineProperty(ta2, "scrollHeight", { configurable: true, value: 60 });

    fireEvent.input(ta1);

    expect(ta1.style.height).toBe("95px");
    expect(ta2.style.height).toBe("95px");
  });

  it("updates both textareas when the shorter one expands to become taller", () => {
    const { container } = render(
      <form>
        <AutoResizeTextarea
          syncGroup="test-expand"
          defaultValue="Short"
        />
        <AutoResizeTextarea
          syncGroup="test-expand"
          defaultValue="Also short"
        />
      </form>,
    );

    const [ta1, ta2] = container.querySelectorAll("textarea");

    Object.defineProperty(ta1, "scrollHeight", { configurable: true, value: 60 });
    Object.defineProperty(ta2, "scrollHeight", { configurable: true, value: 130 });

    fireEvent.input(ta2);

    expect(ta1.style.height).toBe("130px");
    expect(ta2.style.height).toBe("130px");
  });
});
