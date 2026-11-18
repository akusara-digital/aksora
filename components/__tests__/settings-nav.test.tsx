import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let currentPathname = "/settings/profile";
let currentSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-current": ariaCurrent,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: React.AriaAttributes["aria-current"];
  }) => (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));

import { getSettingsGroups } from "@/lib/settings-nav";
import { SettingsNav } from "@/components/settings/settings-nav";

describe("Settings Navigation & IA", () => {
  it("scopes settings categories by role accurately", () => {
    const devGroups = getSettingsGroups({ isAdmin: false, canConfigureQa: false });
    expect(devGroups.map((g) => g.id)).toEqual(["personal"]);

    const qaGroups = getSettingsGroups({ isAdmin: false, canConfigureQa: true });
    expect(qaGroups.map((g) => g.id)).toEqual(["personal", "test-management"]);

    const adminGroups = getSettingsGroups({ isAdmin: true, canConfigureQa: true });
    expect(adminGroups.map((g) => g.id)).toEqual([
      "personal",
      "test-management",
      "workspace-team",
      "ai-integrations",
    ]);
  });

  it("returns null on /settings index page to avoid duplicating links", () => {
    currentPathname = "/settings";
    currentSearch = "";
    const groups = getSettingsGroups({ isAdmin: true, canConfigureQa: true });
    const html = renderToStaticMarkup(<SettingsNav groups={groups} />);
    expect(html).toBe("");
  });

  it("renders persistent left rail with active state and preserves workspace param on subpages", () => {
    currentPathname = "/settings/environments";
    currentSearch = "ws=abc-123";
    const groups = getSettingsGroups({ isAdmin: false, canConfigureQa: true });
    const html = renderToStaticMarkup(<SettingsNav groups={groups} />);

    expect(html).toContain('href="/settings?ws=abc-123"');
    expect(html).toContain('href="/settings/environments?ws=abc-123"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Test Management");
    expect(html).not.toContain("AI &amp; Integrations");
  });
});
