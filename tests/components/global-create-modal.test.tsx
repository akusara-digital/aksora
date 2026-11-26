import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalCreateModal } from "@/components/shared/global-create-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

describe("GlobalCreateModal", () => {
  it("renders null when open is false", () => {
    const html = renderToStaticMarkup(
      <GlobalCreateModal open={false} onClose={vi.fn()} user={null} />
    );
    expect(html).toBe("");
  });

  it("renders dialog with all tabs and required inputs when open is true", () => {
    const html = renderToStaticMarkup(
      <GlobalCreateModal open={true} onClose={vi.fn()} user={null} />
    );
    expect(html).toContain("New Item");
    expect(html).toContain("Task");
    expect(html).toContain("Bug");
    expect(html).toContain("Test Case");
    expect(html).toContain("Test Suite");
    expect(html).toContain("Test Plan");
    expect(html).toContain("Project");
    expect(html).toContain("Daily Work");
    expect(html).toContain("Priority");
    expect(html).toContain("Assignee");
    expect(html).toContain("Create Task");
  });
});
