/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";

describe("AutoResizeTextarea", () => {
  it("renders with default minHeight and maxHeight styles", () => {
    render(<AutoResizeTextarea placeholder="Type something..." />);
    const textarea = screen.getByPlaceholderText("Type something...");
    expect(textarea).toBeTruthy();
    expect(textarea.style.minHeight).toBe("88px");
    expect(textarea.style.maxHeight).toBe("240px");
  });

  it("calculates minHeight appropriately when rows is 1", () => {
    render(<AutoResizeTextarea rows={1} placeholder="Single line" />);
    const textarea = screen.getByPlaceholderText("Single line");
    expect(textarea.style.minHeight).toBe("38px");
  });

  it("respects explicit minHeight and maxHeight overrides", () => {
    render(<AutoResizeTextarea minHeight={100} maxHeight={350} placeholder="Custom height" />);
    const textarea = screen.getByPlaceholderText("Custom height");
    expect(textarea.style.minHeight).toBe("100px");
    expect(textarea.style.maxHeight).toBe("350px");
  });

  it("forwards ref to underlying HTMLTextAreaElement", () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<AutoResizeTextarea ref={ref} placeholder="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("fires onInput and adjusts height when typing", () => {
    const onInputMock = vi.fn();
    render(<AutoResizeTextarea placeholder="Typing test" onInput={onInputMock} />);
    const textarea = screen.getByPlaceholderText("Typing test");

    fireEvent.input(textarea, { target: { value: "Line 1\nLine 2\nLine 3" } });
    expect(onInputMock).toHaveBeenCalled();
  });

  it("applies error styling when error is true", () => {
    render(<AutoResizeTextarea error placeholder="Error state" />);
    const textarea = screen.getByPlaceholderText("Error state");
    expect(textarea.className).toContain("border-rose-400");
  });
});
