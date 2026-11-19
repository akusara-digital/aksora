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

export function getDefaultCrumbsForPath(pathname: string): Crumb[] {
  const p = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (p === "/" || p === "/dashboard") {
    return [{ label: "Dashboard" }];
  }
  if (p === "/projects" || p.startsWith("/projects/")) {
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "Projects" }];
  }
  if (p === "/test-cases" || p.startsWith("/test-cases/")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Cases & Suites" }];
  }
  if (p === "/test-plans" || p.startsWith("/test-plans")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Plans" }];
  }
  if (p === "/test-suites" || p.startsWith("/test-suites")) {
    return [{ label: "Test Management", href: "/test-cases" }, { label: "Test Suites" }];
  }
  if (p === "/test-execution" || p.startsWith("/test-execution")) {
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
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Test Coverage" }];
  }
  if (p === "/reports/test-gap") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Test Gap Analysis" }];
  }
  if (p === "/reports/flaky-tests") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Flaky Tests" }];
  }
  if (p === "/reports/sprint-burndown" || p === "/reports/delivery") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Sprint Burndown" }];
  }
  if (p === "/reports/workload") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Workload Heatmap" }];
  }
  if (p === "/deployments") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Deployments" }];
  }
  if (p === "/weekly-report") {
    return [{ label: "Reports", href: "/reports/test-coverage" }, { label: "Weekly Report" }];
  }
  if (p === "/work-logs") {
    return [{ label: "Notes & Vault", href: "/notes" }, { label: "Work Logs" }];
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
    const sub = p.replace("/settings/", "").replace(/-/g, " ");
    const capSub = sub.charAt(0).toUpperCase() + sub.slice(1);
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: capSub },
    ];
  }
  if (p === "/my-work") {
    return [{ label: "Dashboard", href: "/dashboard" }, { label: "My Work" }];
  }
  if (p === "/activity") {
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
  const searchParams = useSearchParams();
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
