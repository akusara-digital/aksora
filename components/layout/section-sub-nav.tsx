"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Checks,
  Table,
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
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SubNavTab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "regular"; className?: string }>;
};

type SubNavGroup = {
  match: (pathname: string) => boolean;
  tabs: SubNavTab[];
};

const SUB_NAV_GROUPS: SubNavGroup[] = [
  // 1. Test Cases (Repository & Planning)
  {
    match: (p) =>
      p === "/test-cases" ||
      p.startsWith("/test-cases/") ||
      p.startsWith("/test-suites") ||
      (p.startsWith("/test-plans") && !p.startsWith("/test-plans/projects/")),
    tabs: [
      { href: "/test-cases", label: "Test Cases", icon: Checks },
      { href: "/test-suites", label: "Test Suites", icon: Table },
      { href: "/test-plans", label: "Test Plans", icon: ClipboardText },
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
  // 3. Tasks & Sprints
  {
    match: (p) =>
      p.startsWith("/tasks") ||
      p.startsWith("/sprints") ||
      p.startsWith("/gantt"),
    tabs: [
      { href: "/tasks", label: "Tasks Board", icon: Kanban },
      { href: "/sprints", label: "Sprints Backlog", icon: Kanban },
      { href: "/gantt", label: "Gantt Timeline", icon: Rows },
    ],
  },
  // 4. Team Pulse
  {
    match: (p) =>
      p.startsWith("/standup") ||
      p.startsWith("/work-logs") ||
      p.startsWith("/meeting-notes") ||
      p.startsWith("/activity-log"),
    tabs: [
      { href: "/standup", label: "Daily Standup", icon: MicrophoneStage },
      { href: "/work-logs", label: "Work Logs", icon: ClockCountdown },
      { href: "/meeting-notes", label: "Meeting Notes", icon: Note },
      { href: "/activity-log", label: "Activity Log", icon: ClockCounterClockwise },
    ],
  },
  // 5. Reports
  {
    match: (p) =>
      p.startsWith("/reports") ||
      p.startsWith("/weekly-report") ||
      p.startsWith("/deployments"),
    tabs: [
      { href: "/reports/test-coverage", label: "Coverage", icon: ChartPieSlice },
      { href: "/reports/flaky-tests", label: "Flaky Tests", icon: ShuffleAngular },
      { href: "/reports/test-gap", label: "Test Gap", icon: MagnifyingGlass },
      { href: "/reports/sprint-burndown", label: "Burndown", icon: ChartLineUp },
      { href: "/reports/workload", label: "Workload", icon: Users },
      { href: "/deployments", label: "Deployments", icon: RocketLaunch },
      { href: "/weekly-report", label: "Weekly Report", icon: ChartLineUp },
    ],
  },
  // 6. Notes & Vault
  {
    match: (p) => p.startsWith("/notes") || p.startsWith("/vault"),
    tabs: [
      { href: "/notes", label: "Personal Notes", icon: NotePencil },
      { href: "/vault", label: "Password Vault", icon: LockKey },
    ],
  },
];

export function SectionSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws");

  const group = SUB_NAV_GROUPS.find((g) => g.match(pathname));
  if (!group) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1 scrollbar-none">
        {group.tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/test-cases" &&
              tab.href !== "/test-execution" &&
              tab.href !== "/tasks" &&
              tab.href !== "/work-logs" &&
              tab.href !== "/notes" &&
              pathname.startsWith(`${tab.href}/`)) ||
            (tab.href === "/test-cases" && (pathname === "/test-cases" || pathname.startsWith("/test-cases/"))) ||
            (tab.href === "/test-execution" && pathname.startsWith("/test-execution")) ||
            (tab.href === "/tasks" && (pathname === "/tasks" || pathname.startsWith("/tasks/"))) ||
            (tab.href === "/work-logs" && (pathname === "/work-logs" || pathname.startsWith("/work-logs/"))) ||
            (tab.href === "/notes" && (pathname === "/notes" || pathname.startsWith("/notes/")));

          const Icon = tab.icon;
          const targetHref = ws
            ? (tab.href.includes("?")
                ? `${tab.href}&ws=${encodeURIComponent(ws)}`
                : `${tab.href}?ws=${encodeURIComponent(ws)}`)
            : tab.href;

          return (
            <Link
              key={tab.href}
              href={targetHref}
              className={cn(
                "group flex items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-sky-50 font-semibold text-sky-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon
                size={16}
                weight={active ? "bold" : "regular"}
                className={cn("shrink-0 transition-colors", active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600")}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
