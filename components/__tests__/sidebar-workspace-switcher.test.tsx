import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import { SidebarWorkspaceSwitcher } from "@/components/layout/sidebar-workspace-switcher";

describe("SidebarWorkspaceSwitcher", () => {
  it("renders active workspace trigger in expanded view", () => {
    const html = renderToStaticMarkup(
      <SidebarWorkspaceSwitcher collapsed={false} />
    );
    expect(html).toContain("Switch workspace");
    expect(html).toContain("Free plan");
  });

  it("renders compact trigger in collapsed view", () => {
    const html = renderToStaticMarkup(
      <SidebarWorkspaceSwitcher collapsed={true} />
    );
    expect(html).toContain("Switch workspace");
    expect(html).not.toContain("Free plan");
  });
});
