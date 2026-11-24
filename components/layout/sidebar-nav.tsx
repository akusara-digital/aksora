"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";
import {
  Briefcase,
  Bug,
  Checks,
  FolderSimple,
  Kanban,
  SquaresFour,
  PlayCircle,
  Gear,
  ClockCountdown,
  ChartLineUp,
  FileText,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SidebarIcon = React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
export type SidebarItem = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = { title: string; items: SidebarItem[] };

// ─── Consolidated Navigation Data ───────────────────────────────────────────

export function getGroups(t: Dictionary["sidebar"]): SidebarGroup[] {
  return [
    {
      title: "",
      items: [
        { href: "/dashboard", label: t.dashboard || "Dashboard", icon: SquaresFour },
      ],
    },
    {
      title: t.mySpace || "MY SPACE",
      items: [
        { href: "/projects", label: t.projects || "Projects", icon: FolderSimple },
        { href: "/my-work", label: t.myWork || "My Work", icon: Briefcase },
      ],
    },
    {
      title: t.groupTestManagement || "Test Management",
      items: [
        { href: "/test-cases", label: t.testCases || t.testRepository || "Test Cases", icon: Checks },
        { href: "/test-execution", label: t.testRuns || t.testExecution || t.testSessions || "Test Runs", icon: PlayCircle },
      ],
    },
    {
      title: t.groupWorkItems || t.groupWorkAndDefects || "Work Items",
      items: [
        { href: "/tasks", label: t.tasks || t.tasksAndSprints || "Tasks", icon: Kanban },
        { href: "/bugs", label: t.bugs || t.bugsAndIssues || "Bugs", icon: Bug },
        { href: "/work-logs", label: t.dailyWork || t.workLog || "Daily Work", icon: ClockCountdown },
      ],
    },
    {
      title: t.groupReportsAnalytics || t.groupReports || "Reports",
      items: [
        { href: "/weekly-report", label: t.weeklyReport || t.report || "Weekly Report", icon: ChartLineUp },
      ],
    },
  ];
}

export function getFooterItems(t: Dictionary["sidebar"]): SidebarItem[] {
  return [
    { href: "/settings", label: t.settings || "Settings", icon: Gear },
  ];
}

// ─── Role-based filtering ────────────────────────────────────────────────────

const FULL_ROLE_MENU = [
  "/",
  "/dashboard",
  "/my-work",
  "/projects",
  "/test-cases",
  "/test-execution",
  "/tasks",
  "/bugs",
  "/work-logs",
  "/reports",
  "/weekly-report",
  "/notes",
  "/settings",
];

const DEV_ROLE_MENU = [
  "/",
  "/dashboard",
  "/my-work",
  "/projects",
  "/tasks",
  "/bugs",
  "/work-logs",
  "/reports",
  "/weekly-report",
  "/notes",
  "/settings",
];

const ROLE_MENU: Record<string, string[]> = {
  admin: FULL_ROLE_MENU,
  fullstack: FULL_ROLE_MENU,
  ai: FULL_ROLE_MENU,
  qa: FULL_ROLE_MENU,
  fe: DEV_ROLE_MENU,
  be: DEV_ROLE_MENU,
  pm: [...DEV_ROLE_MENU, "/test-cases"],
};

function canSeeHref(role: string, href: string) {
  if (role === "superadmin" || role === "admin") return true;
  const allowed = ROLE_MENU[role] || ROLE_MENU.qa;
  if (allowed.includes(href)) return true;
  if (href === "/reports" || href === "/weekly-report") {
    return allowed.some((r) => r.startsWith("/reports") || r === "/weekly-report" || r === "/deployments");
  }
  if (href === "/my-work" || href === "/dashboard") {
    return allowed.includes("/my-work") || allowed.includes("/dashboard");
  }
  if (href === "/tasks") {
    return allowed.includes("/tasks") || allowed.includes("/gantt");
  }
  if (href === "/test-cases") {
    return allowed.includes("/test-cases") || allowed.includes("/test-suites") || allowed.includes("/test-plans");
  }
  if (href === "/test-execution") {
    return allowed.includes("/test-execution") || allowed.includes("/exploratory") || allowed.includes("/schedules") || allowed.includes("/recordings");
  }
  if (href === "/work-logs" || href === "/notes") {
    return allowed.includes("/notes") || allowed.includes("/vault") || allowed.includes("/work-logs") || allowed.includes("/meeting-notes");
  }
  if (href === "/settings") return true;
  return false;
}

export function filterGroups(role: string, t: Dictionary["sidebar"]) {
  return getGroups(t)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeHref(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterFooterItems(role: string, t: Dictionary["sidebar"]) {
  return getFooterItems(t).filter((item) => canSeeHref(role, item.href));
}

export function SidebarNavItem({
  item,
  pathname,
  collapsed,
  showTooltip,
  hideTooltip,
}: {
  item: SidebarItem;
  pathname: string;
  collapsed: boolean;
  showTooltip: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  hideTooltip: () => void;
}) {
  const router = useRouter();
  const Icon = item.icon;
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  const isSuiteExecutionRoute =
    pathname.startsWith("/test-execution") ||
    pathname.startsWith("/exploratory") ||
    pathname.startsWith("/schedules") ||
    pathname.startsWith("/recordings");
  const isProjectDetailRoute = pathname.startsWith("/test-plans/projects/");

  const isMyWorkGroup =
    (item.href === "/my-work" || item.href === "/dashboard") &&
    (pathname === "/my-work" ||
      pathname.startsWith("/my-work/") ||
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/");

  const isTestCasesGroup =
    item.href === "/test-cases" &&
    (pathname === "/test-cases" ||
      pathname.startsWith("/test-cases/") ||
      pathname.startsWith("/test-suites") ||
      (pathname.startsWith("/test-plans") && !isProjectDetailRoute));

  const isTestExecutionGroup = item.href === "/test-execution" && isSuiteExecutionRoute;

  const isTasksGroup =
    item.href === "/tasks" &&
    (pathname === "/tasks" ||
      pathname.startsWith("/tasks/") ||
      pathname.startsWith("/gantt"));

  const isReportsGroup =
    (item.href === "/reports" || item.href === "/weekly-report") &&
    (pathname === "/reports" ||
      pathname.startsWith("/reports/") ||
      pathname === "/weekly-report" ||
      pathname.startsWith("/weekly-report/") ||
      pathname.startsWith("/deployments"));

  const isWorkLogsGroup =
    item.href === "/work-logs" &&
    (pathname === "/work-logs" ||
      pathname.startsWith("/work-logs/"));

  const isNotesGroup =
    item.href === "/notes" &&
    (pathname === "/notes" ||
      pathname.startsWith("/notes/") ||
      pathname.startsWith("/meeting-notes") ||
      pathname.startsWith("/vault"));

  const isSettingsGroup =
    item.href === "/settings" &&
    (pathname.startsWith("/settings") || pathname.startsWith("/assignees"));

  const isProjectsGroup =
    item.href === "/projects" && (pathname.startsWith("/projects/") || isProjectDetailRoute);

  const active =
    pathname === item.href ||
    isMyWorkGroup ||
    isTestCasesGroup ||
    isTestExecutionGroup ||
    isTasksGroup ||
    isReportsGroup ||
    isWorkLogsGroup ||
    isNotesGroup ||
    isSettingsGroup ||
    isProjectsGroup ||
    (item.href !== "/settings" &&
      item.href !== "/test-cases" &&
      item.href !== "/test-execution" &&
      item.href !== "/tasks" &&
      item.href !== "/reports" &&
      item.href !== "/weekly-report" &&
      item.href !== "/notes" &&
      item.href !== "/work-logs" &&
      item.href !== "/my-work" &&
      pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    if (!active) return;
    const node = linkRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [active, pathname]);

  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws");
  const targetHref = ws
    ? (item.href.includes("?")
        ? `${item.href}&ws=${encodeURIComponent(ws)}`
        : `${item.href}?ws=${encodeURIComponent(ws)}`)
    : item.href;

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    showTooltip(e, item.label);
    try {
      router.prefetch(targetHref);
    } catch {
      // noop
    }
  };

  const handleFocus = () => {
    try {
      router.prefetch(targetHref);
    } catch {
      // noop
    }
  };

  return (
    <Link
      ref={linkRef}
      href={targetHref}
      prefetch={true}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onMouseLeave={hideTooltip}
      className={cn(
        "group relative flex h-9.5 items-center text-[13px] font-medium transition-colors duration-100 outline-none rounded-md",
        collapsed ? "justify-center px-0 mx-1.5" : "gap-2.5 px-3 mx-2",
        active
          ? "bg-sky-50 text-sky-700 font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sky-600" />
      )}
      <Icon
        size={16}
        weight="bold"
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600",
          collapsed ? "mx-auto" : "",
        )}
      />
      <span className={cn("overflow-hidden whitespace-nowrap transition-all duration-150", collapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
        {item.label}
      </span>
    </Link>
  );
}

// ─── Nav Section ─────────────────────────────────────────────────────────────

export function SidebarSection({
  group,
  pathname,
  collapsed,
  showTooltip,
  hideTooltip,
}: {
  group: SidebarGroup;
  pathname: string;
  collapsed: boolean;
  showTooltip: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  hideTooltip: () => void;
}) {
  return (
    <div>
      {group.title && (
        <div
          className={cn(
            "px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 transition-all duration-150 whitespace-nowrap overflow-hidden select-none",
            collapsed ? "opacity-0 h-0 my-0" : "opacity-100 h-auto mt-4 first:mt-1",
          )}
        >
          {group.title}
        </div>
      )}
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            showTooltip={showTooltip}
            hideTooltip={hideTooltip}
          />
        ))}
      </div>
    </div>
  );
}
