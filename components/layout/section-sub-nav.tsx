"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Checks,
  ClipboardText,
  Compass,
  PlayCircle,
  CalendarCheck,
  VideoCamera,
  Kanban,
  Rows,
  ClockCountdown,
  MicrophoneStage,
  Note,
  ClockCounterClockwise,
  ChartPieSlice,
  ChartLineUp,
  ShuffleAngular,
  MagnifyingGlass,
  Users,
  RocketLaunch,
  NotePencil,
  LockKey,
  FileText,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SubNavTab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "regular"; className?: string }>;
  matchPaths?: string[];
  children?: SubNavTab[];
};

type SubNavGroup = {
  match: (pathname: string) => boolean;
  tabs: SubNavTab[];
};

const SUB_NAV_GROUPS: SubNavGroup[] = [
  // 1. Test Cases & Suites (Repository) + Test Plans (Release Planning)
  {
    match: (p) =>
      p === "/test-cases" ||
      p.startsWith("/test-cases/") ||
      p.startsWith("/test-suites") ||
      (p.startsWith("/test-plans") && !p.startsWith("/test-plans/projects/")),
    tabs: [
      {
        href: "/test-cases",
        label: "Cases & Suites",
        icon: Checks,
        matchPaths: ["/test-cases", "/test-suites"],
      },
      {
        href: "/test-plans",
        label: "Test Plans",
        icon: ClipboardText,
        matchPaths: ["/test-plans"],
      },
    ],
  },
  // 2. Test Runs (Execution, Exploratory, Schedules & Recordings)
  {
    match: (p) =>
      p.startsWith("/test-execution") ||
      p.startsWith("/exploratory") ||
      p.startsWith("/schedules") ||
      p.startsWith("/recordings"),
    tabs: [
      { href: "/test-execution", label: "Test Runs", icon: PlayCircle },
      { href: "/exploratory", label: "Exploratory (SBTM)", icon: Compass },
      { href: "/schedules", label: "Schedules", icon: CalendarCheck },
      { href: "/recordings", label: "Recordings", icon: VideoCamera },
    ],
  },
  // 3. Tasks & Flow
  {
    match: (p) =>
      p.startsWith("/tasks") ||
      p.startsWith("/standup") ||
      p.startsWith("/sprints") ||
      p.startsWith("/gantt"),
    tabs: [
      { href: "/tasks", label: "Tasks Board", icon: Kanban },
      { href: "/standup", label: "Daily Standup", icon: MicrophoneStage },
      { href: "/sprints", label: "Sprints Backlog", icon: Kanban },
      { href: "/gantt", label: "Gantt Timeline", icon: Rows },
    ],
  },
  // 4. Reports (Single-row clean analytics hub)
  {
    match: (p) =>
      p.startsWith("/reports") ||
      p.startsWith("/weekly-report") ||
      p.startsWith("/deployments"),
    tabs: [
      {
        href: "/reports/test-coverage",
        label: "Quality & Coverage",
        icon: ChartPieSlice,
        matchPaths: ["/reports", "/reports/test-coverage", "/reports/test-gap", "/reports/quality"],
      },
      {
        href: "/reports/flaky-tests",
        label: "Flaky Tests",
        icon: ShuffleAngular,
        matchPaths: ["/reports/flaky-tests"],
      },
      {
        href: "/reports/sprint-burndown",
        label: "Delivery & Sprints",
        icon: ChartLineUp,
        matchPaths: ["/reports/sprint-burndown", "/reports/workload", "/deployments", "/reports/delivery"],
      },
      {
        href: "/weekly-report",
        label: "Weekly Report",
        icon: FileText,
        matchPaths: ["/weekly-report"],
      },
    ],
  },
  // 5. Notes & Vault
  {
    match: (p) => p.startsWith("/notes") || p.startsWith("/vault") || p.startsWith("/meeting-notes"),
    tabs: [
      { href: "/notes", label: "Personal Notes", icon: NotePencil },
      { href: "/meeting-notes", label: "Meeting Notes", icon: Note },
      { href: "/vault", label: "Password Vault", icon: LockKey },
    ],
  },
];

function isTabActive(pathname: string, tab: SubNavTab): boolean {
  if (tab.matchPaths?.length) {
    return tab.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

function appendWs(href: string, ws: string | null): string {
  if (!ws) return href;
  return href.includes("?")
    ? `${href}&ws=${encodeURIComponent(ws)}`
    : `${href}?ws=${encodeURIComponent(ws)}`;
}

export function SectionSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws") ?? null;

  const group = SUB_NAV_GROUPS.find((g) => g.match(pathname));
  if (!group) return null;

  const activePrimaryTab = group.tabs.find((tab) => isTabActive(pathname, tab));
  const secondaryTabs = activePrimaryTab?.children ?? [];

  return (
    <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1 scrollbar-none">
        {group.tabs.map((tab) => {
          const active = isTabActive(pathname, tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={appendWs(tab.href, ws)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                active
                  ? "bg-sky-50 font-semibold text-sky-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon
                size={16}
                weight={active ? "bold" : "regular"}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {secondaryTabs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 bg-slate-50/70 px-2.5 py-1.5 scrollbar-none">
          {secondaryTabs.map((sub) => {
            const subActive = isTabActive(pathname, sub);
            const SubIcon = sub.icon;

            return (
              <Link
                key={sub.href}
                href={appendWs(sub.href, ws)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  subActive
                    ? "bg-white font-semibold text-blue-700 shadow-2xs ring-1 ring-slate-200/90"
                    : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-800",
                )}
              >
                <SubIcon
                  size={13}
                  weight={subActive ? "bold" : "regular"}
                  className={cn("shrink-0", subActive ? "text-blue-600" : "text-slate-400")}
                />
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
