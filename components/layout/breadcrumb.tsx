"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBreadcrumbContext, type Crumb } from "./breadcrumb-context";

export type { Crumb };

function appendWs(href: string, ws: string | null): string {
  if (!ws) return href;
  try {
    const [path, search] = href.split("?");
    const params = new URLSearchParams(search || "");
    if (!params.has("ws")) {
      params.set("ws", ws);
    }
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  } catch {
    return href;
  }
}

const SETTINGS_SUB_TITLES: Record<string, string> = {
  profile: "Profile & Security",
  appearance: "Appearance",
  notifications: "Notifications",
  "api-keys": "API Keys",
  support: "Help & Support",
  "test-case-setup": "Test Case Setup",
  environments: "Environments",
  automation: "Automation",
  workspace: "Workspace & Plan",
  workspaces: "Workspace Members",
  users: "Workspace Members",
  roles: "Role Management",
  ai: "AI Engine & Keys",
  "ai-usage": "AI Token Usage",
  integrations: "Integrations",
  webhooks: "Webhooks",
};

export function getDefaultCrumbsForPath(pathname: string): Crumb[] {
  const p = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (p === "/" || p === "/dashboard") {
    return [{ label: "Dashboard" }];
  }
  if (p === "/projects") {
    return [{ label: "My Space", href: "/projects" }, { label: "Projects" }];
  }
  if (p.startsWith("/projects/")) {
    return [
      { label: "My Space", href: "/projects" },
      { label: "Projects", href: "/projects" },
      { label: "Project Hub" },
    ];
  }
  if (p.startsWith("/test-cases/detail/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Cases & Suites", href: "/test-cases" }, { label: "Case Detail" }];
  }
  if (p === "/test-cases" || p.startsWith("/test-cases/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Cases & Suites" }];
  }
  if (p.startsWith("/test-plans/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Plans", href: "/test-plans" }, { label: "Plan Detail" }];
  }
  if (p === "/test-plans") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Plans" }];
  }
  if (p.startsWith("/test-suites/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Cases & Suites", href: "/test-cases" }, { label: "Suite Detail" }];
  }
  if (p === "/test-suites") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Suites" }];
  }
  if (p.startsWith("/test-execution/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Runs", href: "/test-execution" }, { label: "Execution Run" }];
  }
  if (p === "/test-execution") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Runs" }];
  }
  if (p === "/exploratory") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Exploratory (SBTM)" }];
  }
  if (p === "/schedules") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Schedules" }];
  }
  if (p === "/recordings") {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Recordings" }];
  }
  if (p === "/tasks" || p.startsWith("/tasks/")) {
    return [{ label: "Tasks", href: "/tasks" }, { label: "Tasks Board" }];
  }
  if (p === "/gantt") {
    return [{ label: "Tasks", href: "/tasks" }, { label: "Gantt Timeline" }];
  }
  if (p === "/bugs" || p.startsWith("/bugs/")) {
    return [{ label: "Bugs", href: "/bugs" }, { label: "Bug Tracker" }];
  }
  if (p === "/reports/test-coverage" || p === "/reports" || p === "/reports/quality") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Quality & Coverage" }];
  }
  if (p === "/reports/test-gap") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Quality & Coverage", href: "/reports/test-coverage" }, { label: "Test Gap Analysis" }];
  }
  if (p === "/reports/flaky-tests") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Quality & Coverage", href: "/reports/test-coverage" }, { label: "Flaky Tests" }];
  }
  if (p === "/reports/sprint-burndown" || p === "/reports/delivery") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Delivery & Team" }];
  }
  if (p === "/reports/workload") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Delivery & Team", href: "/reports/sprint-burndown" }, { label: "Workload Heatmap" }];
  }
  if (p === "/deployments") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Deployments" }];
  }
  if (p === "/weekly-report") {
    return [{ label: "Reports", href: "/weekly-report" }, { label: "Weekly Report" }];
  }
  if (p === "/work-logs") {
    return [{ label: "Work Items", href: "/tasks" }, { label: "Daily Work" }];
  }
  if (p === "/notes") {
    return [{ label: "Notes & Vault", href: "/notes" }, { label: "Personal Notes" }];
  }
  if (p === "/meeting-notes") {
    return [{ label: "Notes & Vault", href: "/notes" }, { label: "Meeting Notes" }];
  }
  if (p === "/vault") {
    return [{ label: "Notes & Vault", href: "/notes" }, { label: "Password Vault" }];
  }
  if (p === "/settings") {
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }];
  }
  if (p.startsWith("/settings/")) {
    const slug = p.replace("/settings/", "").split("/")[0];
    const capSub =
      SETTINGS_SUB_TITLES[slug] ||
      slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: capSub },
    ];
  }
  if (p === "/my-work") {
    return [{ label: "My Space", href: "/projects" }, { label: "My Work" }];
  }
  if (p === "/activity" || p === "/activity-log") {
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "Activity Log" }];
  }

  return [];
}

export function TopBreadcrumbs() {
  const { crumbs: customCrumbs } = useBreadcrumbContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws");

  const crumbs = customCrumbs ?? getDefaultCrumbsForPath(pathname || "/");

  if (!crumbs || crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {crumbs.map((crumb, i) => {
        const href = crumb.href ? appendWs(crumb.href, ws) : undefined;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300" aria-hidden>/</span>}
            {href ? (
              <Link href={href} className="text-slate-500 transition hover:text-sky-700">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-bold text-slate-900">{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Breadcrumb({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const { setCrumbs, isInsideProvider } = useBreadcrumbContext();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isInsideProvider) {
      setCrumbs(crumbs);
      return () => setCrumbs(null);
    }
  }, [crumbs, setCrumbs, isInsideProvider]);

  // When inside BreadcrumbProvider, TopBreadcrumbs renders at the very top!
  if (isInsideProvider) {
    return null;
  }

  // Fallback for tests or isolated usage outside the provider
  const ws = searchParams?.get("ws");

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400", className)}>
      {crumbs.map((crumb, i) => {
        const href = crumb.href ? appendWs(crumb.href, ws) : undefined;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300" aria-hidden>/</span>}
            {href ? (
              <Link href={href} className="text-slate-500 transition hover:text-sky-700">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-bold text-slate-900">{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
